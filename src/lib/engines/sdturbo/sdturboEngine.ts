import {
	artworkSchema,
	type ArtEngine,
	type Artwork,
	type ClientBrief,
	type CritiqueDraft,
	type DeviceCapability,
	type EngineAvailability,
	type LoadProgress
} from '$lib/types/contracts';
import { meetsRequirements } from '../capability';
import { EngineError, toEngineError } from '../errors';
import { JanusEngine } from '../janus/janusEngine';
import { bitmapToObjectUrl } from '../janus/imageConversion';
import { SdTurboWorkerClient } from './workerClient';

const MODEL_REPO = 'schmuell/sd-turbo-ort-web';
const CACHE_NAME = 'onnx';
const ARTWORK_WIDTH = 512;
const ARTWORK_HEIGHT = 512;

const MODEL_PATHS = [
	'text_encoder/model.onnx',
	'unet/model.onnx',
	'vae_decoder/model.onnx'
] as const;

export interface SdTurboEngineDeps {
	createClient?: () => SdTurboWorkerClient;
	createJanus?: () => JanusEngine;
}

/**
 * SD-Turbo paints at 512×512 via ONNX Runtime Web; Janus critiques lazily so both stacks
 * are never resident at once.
 */
export class SdturboEngine implements ArtEngine {
	readonly id = 'sdturbo-webgpu' as const;
	readonly displayName = 'SD-Turbo HD';
	readonly description = 'Sharper 512px art for desktop GPUs. About 1.5 GB extra to download.';
	readonly requirements = {
		webgpu: true,
		approxDownloadMb: 1536,
		minStorageBufferMb: 1536,
		desktopOnly: true
	};
	readonly capabilities = { generate: true, critique: true };

	private client: SdTurboWorkerClient | null = null;
	private janus: JanusEngine | null = null;
	private janusLoadPromise: Promise<void> | null = null;
	private readonly createClient: () => SdTurboWorkerClient;
	private readonly createJanus: () => JanusEngine;
	private readonly objectUrls = new Set<string>();
	private readonly bitmapCache = new Map<string, ImageBitmap>();
	private artworkCounter = 0;

	constructor(deps: SdTurboEngineDeps = {}) {
		this.createClient = deps.createClient ?? (() => new SdTurboWorkerClient());
		this.createJanus = deps.createJanus ?? (() => new JanusEngine());
	}

	async probe(capability: DeviceCapability): Promise<EngineAvailability> {
		const deviceCheck = meetsRequirements(capability, this.requirements);
		if (!deviceCheck.ok) {
			return { available: false, reason: deviceCheck.reason };
		}

		const cached = await isModelCached();
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
			const fromCache = await isModelCached();
			await this.client.load(options?.onProgress, options?.signal, fromCache);
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
				input.seed,
				undefined,
				input.signal
			);

			this.artworkCounter += 1;
			const id = `sdturbo-${Date.now().toString(36)}-${this.artworkCounter}`;

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
				engineId: 'sdturbo-webgpu'
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
			await this.client.disposeSessions(input.signal);

			if (!this.janus) {
				this.janus = this.createJanus();
			}
			if (!this.janusLoadPromise) {
				this.janusLoadPromise = this.janus.load({ signal: input.signal });
			}
			await this.janusLoadPromise;

			const draft = await this.janus.critique(input);
			return draft;
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

		if (this.janus) {
			await this.janus.unload();
			this.janus = null;
			this.janusLoadPromise = null;
		}
	}
}

/** Best-effort Cache API probe for the three ORT shards — any failure means not cached. */
export async function isModelCached(): Promise<boolean> {
	try {
		if (typeof caches === 'undefined') {
			return false;
		}

		const cache = await caches.open(CACHE_NAME);
		const keyTexts = (await cache.keys()).map((request) => request.url);
		return MODEL_PATHS.every((path) =>
			keyTexts.some((url) => url.includes(MODEL_REPO) && url.includes(path))
		);
	} catch {
		return false;
	}
}
