import type { ArtEngine, EngineId, EngineRequirements } from '$lib/types/contracts';

/** Lazy factory metadata for every registered engine tier. */
export interface EngineDescriptor {
	id: EngineId;
	displayName: string;
	description: string;
	requirements: EngineRequirements;
	/** Preference order; higher wins when several are available. */
	tier: number;
	create: () => Promise<ArtEngine>;
}

/** All engines the game knows about, ordered by tier. */
export const ENGINE_REGISTRY: readonly EngineDescriptor[] = [
	{
		id: 'mock',
		displayName: 'Crayon Mode',
		description: 'Instant procedural art. No download, works on any device.',
		requirements: {
			webgpu: false,
			approxDownloadMb: 0,
			minStorageBufferMb: 0,
			desktopOnly: false
		},
		tier: 0,
		create: async () => new (await import('./mock/mockEngine')).MockEngine()
	},
	{
		id: 'janus-webgpu',
		displayName: 'Janus Pro',
		description: 'Unified generation and critique on WebGPU (~1 GB download).',
		requirements: {
			webgpu: true,
			approxDownloadMb: 1024,
			minStorageBufferMb: 1024,
			desktopOnly: false
		},
		tier: 1,
		create: async () => new (await import('./janus/janusEngine')).JanusEngine()
	},
	{
		id: 'sdturbo-webgpu',
		displayName: 'SD-Turbo',
		description: 'Fast 512px painting with Janus critique (~1.5 GB download, desktop).',
		requirements: {
			webgpu: true,
			approxDownloadMb: 1536,
			minStorageBufferMb: 1024,
			desktopOnly: true
		},
		tier: 2,
		create: async () => new (await import('./sdturbo/sdturboEngine')).SdturboEngine()
	},
	{
		id: 'remote',
		displayName: 'My PC',
		description: 'Real Janus on your home GPU via JanusLink. You run the model.',
		requirements: {
			webgpu: false,
			approxDownloadMb: 0,
			minStorageBufferMb: 0,
			desktopOnly: false
		},
		tier: 1,
		create: async () => new (await import('./remote/remoteEngine')).RemoteEngine()
	}
];
