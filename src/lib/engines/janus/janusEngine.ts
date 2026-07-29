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
import { meetsRequirements } from '../capability';
import {
	accuracyFromHits,
	buildKeywordQuestion,
	buildReviewPrompt,
	buildTitle,
	cleanReview,
	parseYesNo
} from '../critiqueProtocol';
import { EngineError, toEngineError } from '../errors';
import { bandForScore, REVIEW_TEMPLATES } from '../mock/reviewTemplates';
import { hashString, mulberry32, pick } from '../random';
import { bitmapToObjectUrl, urlToBitmap } from './imageConversion';
import { JanusWorkerClient } from './workerClient';

const MODEL_ID = 'onnx-community/Janus-Pro-1B-ONNX';
const CACHE_NAME = 'transformers-cache';
const ARTWORK_WIDTH = 384;
const ARTWORK_HEIGHT = 384;
const MAX_KEYWORD_QUESTIONS = 4;

/** Expected ONNX shard filenames for cache detection — fp16 and fp32 load paths. */
const FP16_SHARDS = [
	'prepare_inputs_embeds_q4.onnx',
	'language_model_q4f16.onnx',
	'language_model_q4f16.onnx_data',
	'lm_head_fp16.onnx',
	'gen_head_fp16.onnx',
	'gen_img_embeds_fp16.onnx',
	'image_decode.onnx'
] as const;

const FP32_SHARDS = [
	'prepare_inputs_embeds.onnx',
	'language_model_q4.onnx',
	'language_model_q4.onnx_data',
	'lm_head.onnx',
	'gen_head.onnx',
	'gen_img_embeds.onnx',
	'image_decode.onnx'
] as const;

const SHARED_ARTIFACTS = [
	'tokenizer.json',
	'tokenizer_config.json',
	'preprocessor_config.json',
	'config.json'
] as const;

export interface JanusEngineDeps {
	createClient?: () => JanusWorkerClient;
}

/**
 * Janus-Pro-1B on WebGPU — unified text-to-image generation and vision critique in one worker.
 */
export class JanusEngine implements ArtEngine {
	readonly id = 'janus-webgpu' as const;
	readonly displayName = 'Janus Pro 1B';
	readonly description =
		'Real AI art, generated privately on your device. About 1 GB to download once.';
	readonly requirements = {
		webgpu: true,
		approxDownloadMb: 1024,
		minStorageBufferMb: 1024,
		desktopOnly: false
	};
	readonly capabilities = { generate: true, critique: true };

	private client: JanusWorkerClient | null = null;
	private readonly createClient: () => JanusWorkerClient;
	private readonly objectUrls = new Set<string>();
	private readonly bitmapCache = new Map<string, ImageBitmap>();
	private artworkCounter = 0;

	constructor(deps: JanusEngineDeps = {}) {
		this.createClient = deps.createClient ?? (() => new JanusWorkerClient());
	}

	async probe(capability: DeviceCapability): Promise<EngineAvailability> {
		const deviceCheck = meetsRequirements(capability, this.requirements);
		if (!deviceCheck.ok) {
			return { available: false, reason: deviceCheck.reason };
		}

		const cached = await isModelCached(capability.fp16);
		return {
			available: true,
			requiresDownload: !cached,
			approxDownloadMb: this.requirements.approxDownloadMb
		};
	}

	async load(options?: {
		onProgress?: (progress: LoadProgress) => void;
		signal?: AbortSignal;
	}): Promise<void> {
		try {
			if (!this.client) {
				this.client = this.createClient();
			}
			await this.client.load(options?.onProgress, options?.signal);
		} catch (error) {
			throw toEngineError(error, 'download_failed');
		}
	}

	async generate(input: {
		playerPrompt: string;
		prompt: string;
		seed?: number;
		signal?: AbortSignal;
	}): Promise<Artwork> {
		if (!this.client) {
			throw new EngineError('internal', 'Engine is not loaded.');
		}

		try {
			const { bitmap, generationMs } = await this.client.generate(
				input.prompt,
				undefined,
				input.signal
			);

			this.artworkCounter += 1;
			const id = `janus-${Date.now().toString(36)}-${this.artworkCounter}`;

			this.bitmapCache.set(id, bitmap);
			const urlBitmap = await createImageBitmap(bitmap);
			const imageUrl = await bitmapToObjectUrl(urlBitmap);
			this.objectUrls.add(imageUrl);

			const artwork: Artwork = {
				id,
				imageUrl,
				playerPrompt: input.playerPrompt,
				width: ARTWORK_WIDTH,
				height: ARTWORK_HEIGHT,
				generationMs,
				engineId: 'janus-webgpu'
			};

			return artworkSchema.parse(artwork);
		} catch (error) {
			throw toEngineError(error, 'generation_failed');
		}
	}

	async critique(input: {
		brief: ClientBrief;
		playerPrompt: string;
		artwork: Artwork;
		signal?: AbortSignal;
	}): Promise<CritiqueDraft> {
		if (!this.client) {
			throw new EngineError('internal', 'Engine is not loaded.');
		}

		try {
			const keywords = input.brief.preferredKeywords.slice(0, MAX_KEYWORD_QUESTIONS);
			const questions = keywords.map(buildKeywordQuestion);
			const reviewPrompt = buildReviewPrompt(input.brief.requestText);

			let bitmap = this.bitmapCache.get(input.artwork.id);
			if (!bitmap) {
				bitmap = await urlToBitmap(input.artwork.imageUrl);
			}

			const { answers, review } = await this.client.ask(
				bitmap,
				questions,
				reviewPrompt,
				input.signal
			);

			if (!this.bitmapCache.has(input.artwork.id)) {
				bitmap.close();
			}

			const hits = answers.filter(parseYesNo).length;
			const accuracyScore = accuracyFromHits(hits, questions.length);
			const title = buildTitle(input.playerPrompt, hashString(input.artwork.id));
			const fallback = fallbackReview(input.brief.clientName, accuracyScore, hashString(review));
			const criticReview = cleanReview(review, fallback);

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
		this.bitmapCache.forEach((bitmap) => bitmap.close());
		this.bitmapCache.clear();

		for (const url of this.objectUrls) {
			URL.revokeObjectURL(url);
		}
		this.objectUrls.clear();

		this.client?.terminate();
		this.client = null;
	}
}

/** Best-effort Cache API probe — any failure means treat the model as not cached. */
export async function isModelCached(fp16: boolean): Promise<boolean> {
	try {
		if (typeof caches === 'undefined') {
			return false;
		}

		const cache = await caches.open(CACHE_NAME);
		const keys = await cache.keys();
		const keyTexts = keys.map((request) => request.url);

		const shards = fp16 ? FP16_SHARDS : FP32_SHARDS;
		const expected = [...shards, ...SHARED_ARTIFACTS];

		return expected.every((filename) =>
			keyTexts.some((url) => url.includes(MODEL_ID) && url.includes(filename))
		);
	} catch {
		return false;
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
