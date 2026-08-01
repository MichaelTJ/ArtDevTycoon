import {
	artworkSchema,
	critiqueDraftSchema,
	type ArtEngine,
	type Artwork,
	type ClientBrief,
	type CritiqueDraft,
	type DeviceCapability,
	type EngineAvailability,
	type LoadProgress
} from '$lib/types/contracts';
import {
	accuracyFromHits,
	buildKeywordQuestion,
	buildReviewPrompt,
	buildTitle,
	cleanReview,
	critiqueTargetsForBrief,
	parseYesNo
} from '../critiqueProtocol';
import { EngineError, toEngineError } from '../errors';
import { bandForScore, REVIEW_TEMPLATES } from '../mock/reviewTemplates';
import { hashString, mulberry32, pick } from '../random';
import { getRemoteProviderClient, type RemoteProviderClient } from './providers';
import { loadRemoteConfig, type RemoteEngineConfig } from './remoteConfig';

const ARTWORK_WIDTH = 384;
const ARTWORK_HEIGHT = 384;
const MAX_KEYWORD_QUESTIONS = 4;

export interface RemoteEngineDeps {
	getClient?: (provider: string) => RemoteProviderClient;
	loadConfig?: () => RemoteEngineConfig | null;
}

/**
 * My PC ArtEngine — generate and critique via JanusLink, a local provider
 * (Ollama, LM Studio, Automatic1111), or BYO cloud keys (OpenRouter, OpenAI).
 * No WebGPU; the player runs the models or bills their own API account.
 */
export class RemoteEngine implements ArtEngine {
	readonly id = 'remote' as const;
	readonly displayName = 'My PC';
	readonly description =
		'Your GPU, local server, or cloud key (JanusLink, Ollama, LM Studio, A1111, OpenRouter, OpenAI).';
	readonly requirements = {
		webgpu: false,
		approxDownloadMb: 0,
		minStorageBufferMb: 0,
		desktopOnly: false
	};
	readonly capabilities = { generate: true, critique: true };

	private readonly getClient: (provider: string) => RemoteProviderClient;
	private readonly loadConfig: () => RemoteEngineConfig | null;
	private config: RemoteEngineConfig | null = null;
	private client: RemoteProviderClient | null = null;
	private readonly objectUrls = new Set<string>();
	private readonly blobCache = new Map<string, Blob>();
	private artworkCounter = 0;

	constructor(deps: RemoteEngineDeps = {}) {
		this.getClient = deps.getClient ?? getRemoteProviderClient;
		this.loadConfig = deps.loadConfig ?? loadRemoteConfig;
	}

	async probe(capability: DeviceCapability): Promise<EngineAvailability> {
		void capability;
		const config = this.loadConfig();
		if (!config) {
			return {
				available: false,
				reason: 'Not connected. Set up My PC in the engine menu.'
			};
		}

		const result = await this.getClient(config.provider).testConnection(config);
		if (!result.ok) {
			return { available: false, reason: result.reason };
		}

		return { available: true, requiresDownload: false, approxDownloadMb: 0 };
	}

	async load(options?: {
		onProgress?: (progress: LoadProgress) => void;
		signal?: AbortSignal;
	}): Promise<void> {
		const config = this.loadConfig();
		if (!config) {
			throw new EngineError('internal', 'Not connected. Set up My PC in the engine menu.');
		}

		const client = this.getClient(config.provider);
		const result = await client.testConnection(config, options?.signal);
		if (!result.ok) {
			throw new EngineError('internal', result.reason);
		}

		this.config = config;
		this.client = client;
		options?.onProgress?.({
			status: 'ready',
			file: null,
			loadedBytes: 0,
			totalBytes: 0,
			fraction: 1
		});
	}

	async generate(input: {
		playerPrompt: string;
		prompt: string;
		seed?: number;
		signal?: AbortSignal;
		sketchImage?: Blob;
	}): Promise<Artwork> {
		if (!this.config || !this.client) {
			throw new EngineError('internal', 'Engine is not loaded.');
		}

		try {
			const seed = input.seed ?? hashString(input.prompt);
			const started = performance.now();
			const data =
				input.sketchImage && this.client.edit
					? await this.client.edit(
							this.config,
							{
								image: input.sketchImage,
								prompt: input.prompt,
								seed,
								filename: 'sketch.png'
							},
							input.signal
						)
					: await this.client.generate(this.config, { prompt: input.prompt, seed }, input.signal);
			const generationMs = Math.round(performance.now() - started);

			const first = data.images[0];
			if (!first) {
				throw new EngineError('generation_failed', 'No image returned from your PC.');
			}

			const blob = base64ToBlob(first.base64, first.mimeType);
			const { width, height } = await readImageSize(blob);

			this.artworkCounter += 1;
			const id = `remote-${Date.now().toString(36)}-${this.artworkCounter}`;
			this.blobCache.set(id, blob);

			const imageUrl = URL.createObjectURL(blob);
			this.objectUrls.add(imageUrl);

			return artworkSchema.parse({
				id,
				imageUrl,
				playerPrompt: input.playerPrompt,
				width,
				height,
				generationMs,
				engineId: 'remote'
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : '';
			if (
				input.sketchImage &&
				this.client?.edit &&
				/not (installed|available)|501|BAGEL/i.test(message)
			) {
				throw new EngineError(
					'generation_failed',
					'Sketch refine needs BAGEL on your PC (ADTLocalServe edit). Falling back is handled by the engine manager.',
					error
				);
			}
			throw toEngineError(error, 'generation_failed');
		}
	}

	async critique(input: {
		brief: ClientBrief;
		playerPrompt: string;
		artwork: Artwork;
		signal?: AbortSignal;
	}): Promise<CritiqueDraft> {
		if (!this.config || !this.client) {
			throw new EngineError('internal', 'Engine is not loaded.');
		}

		try {
			const keywords = critiqueTargetsForBrief(input.brief, input.playerPrompt).slice(
				0,
				MAX_KEYWORD_QUESTIONS
			);
			const questions = keywords.map(buildKeywordQuestion);
			const reviewPrompt = buildReviewPrompt(input.brief.requestText);

			let blob = this.blobCache.get(input.artwork.id);
			if (!blob) {
				const response = await fetch(input.artwork.imageUrl);
				blob = await response.blob();
			}

			const answers: string[] = [];
			for (const question of questions) {
				const result = await this.client.understand(
					this.config,
					{ image: blob, question },
					input.signal
				);
				answers.push(result.text);
			}

			const reviewResult = await this.client.understand(
				this.config,
				{ image: blob, question: reviewPrompt },
				input.signal
			);

			const accuracyScore =
				keywords.length === 0
					? 1
					: accuracyFromHits(answers.filter(parseYesNo).length, questions.length);
			const title = buildTitle(input.playerPrompt, hashString(input.artwork.id));
			const fallback = fallbackReview(
				input.brief.clientName,
				accuracyScore,
				hashString(reviewResult.text)
			);
			const criticReview = cleanReview(reviewResult.text, fallback);

			return critiqueDraftSchema.parse({
				title,
				accuracyScore,
				criticReview
			});
		} catch (error) {
			throw toEngineError(error, 'critique_failed');
		}
	}

	async unload(): Promise<void> {
		this.blobCache.clear();
		for (const url of this.objectUrls) {
			URL.revokeObjectURL(url);
		}
		this.objectUrls.clear();
		this.config = null;
		this.client = null;
	}
}

function base64ToBlob(b64: string, mimeType: string): Blob {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Blob([bytes], { type: mimeType });
}

async function readImageSize(blob: Blob): Promise<{ width: number; height: number }> {
	try {
		const bitmap = await createImageBitmap(blob);
		const size = { width: bitmap.width, height: bitmap.height };
		bitmap.close();
		return size;
	} catch {
		return { width: ARTWORK_WIDTH, height: ARTWORK_HEIGHT };
	}
}

function fallbackReview(clientName: string, accuracyScore: number, seed: number): string {
	const band = bandForScore(accuracyScore);
	const templates = REVIEW_TEMPLATES[band];
	const rng = mulberry32(seed);
	const template = pick(templates, rng);
	return template
		.replaceAll('{client}', clientName)
		.replaceAll('{matched}', 'the subject')
		.replaceAll('{missed}', 'the brief');
}
