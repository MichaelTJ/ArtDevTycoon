import type {
	ArtEngine,
	Artwork,
	ClientBrief,
	CritiqueDraft,
	DeviceCapability,
	EngineAvailability,
	LoadProgress
} from '$lib/types/contracts';
import { EngineError } from '../errors';

/** Placeholder until spec 06 implements SD-Turbo on WebGPU. */
export class SdturboEngine implements ArtEngine {
	readonly id = 'sdturbo-webgpu' as const;
	readonly displayName = 'SD-Turbo';
	readonly description = 'Fast 512px painting with Janus critique (~1.5 GB download, desktop).';
	readonly requirements = {
		webgpu: true,
		approxDownloadMb: 1536,
		minStorageBufferMb: 1024,
		desktopOnly: true
	};
	readonly capabilities = { generate: true, critique: true };

	async probe(capability: DeviceCapability): Promise<EngineAvailability> {
		void capability;
		return { available: false, reason: 'Not implemented yet.' };
	}

	async load(options?: {
		onProgress?: (progress: LoadProgress) => void;
		signal?: AbortSignal;
	}): Promise<void> {
		void options;
		throw new EngineError('internal', 'Not implemented yet.');
	}

	async generate(input: {
		playerPrompt: string;
		prompt: string;
		seed?: number;
		signal?: AbortSignal;
	}): Promise<Artwork> {
		void input;
		throw new EngineError('internal', 'Not implemented yet.');
	}

	async critique(input: {
		brief: ClientBrief;
		playerPrompt: string;
		artwork: Artwork;
		signal?: AbortSignal;
	}): Promise<CritiqueDraft> {
		void input;
		throw new EngineError('internal', 'Not implemented yet.');
	}

	async unload(): Promise<void> {
		throw new EngineError('internal', 'Not implemented yet.');
	}
}
