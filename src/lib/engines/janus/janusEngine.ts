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

/** Placeholder until spec 05 implements Janus-Pro-1B on WebGPU. */
export class JanusEngine implements ArtEngine {
	readonly id = 'janus-webgpu' as const;
	readonly displayName = 'Janus Pro';
	readonly description = 'Unified generation and critique on WebGPU (~1 GB download).';
	readonly requirements = {
		webgpu: true,
		approxDownloadMb: 1024,
		minStorageBufferMb: 1024,
		desktopOnly: false
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
