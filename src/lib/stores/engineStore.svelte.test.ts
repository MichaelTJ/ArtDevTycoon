import { describe, expect, it, vi } from 'vitest';
import type { EngineManager } from '$lib/engines/manager';
import type {
	DeviceCapability,
	EngineAvailability,
	EngineId,
	EngineState,
	LoadProgress
} from '$lib/types/contracts';
import { EngineStore } from './engineStore.svelte';

const capability: DeviceCapability = {
	webgpu: false,
	fp16: false,
	maxStorageBufferBindingMb: null,
	maxBufferMb: null,
	isMobile: true,
	deviceMemoryGb: null
};

function createFakeManager(
	overrides: Partial<{
		init: () => Promise<void>;
		select: (id: EngineId, onProgress?: (p: LoadProgress) => void) => Promise<void>;
		options: Array<{
			id: EngineId;
			displayName: string;
			description: string;
			requirements: { approxDownloadMb: number };
			availability: EngineAvailability;
		}>;
	}>
): EngineManager {
	const state = { value: 'ready' as EngineState, activeId: 'mock' as EngineId };

	return {
		capability,
		get activeId() {
			return state.activeId;
		},
		get state() {
			return state.value;
		},
		get options() {
			return (overrides.options ?? []).map((entry) => ({
				...entry,
				requirements: {
					webgpu: false,
					approxDownloadMb: entry.requirements.approxDownloadMb,
					minStorageBufferMb: 0,
					desktopOnly: false
				},
				tier: entry.id === 'mock' ? 0 : 1,
				create: async () => {
					throw new Error('not used in store tests');
				},
				availability: entry.availability
			}));
		},
		get recommendedId() {
			return 'mock';
		},
		init: overrides.init ?? (async () => {}),
		select:
			overrides.select ??
			(async (id: EngineId) => {
				state.activeId = id;
				state.value = 'ready';
			}),
		generate: vi.fn(),
		critique: vi.fn()
	} as unknown as EngineManager;
}

describe('EngineStore', () => {
	it('init() populates options and leaves activeId as mock', async () => {
		const store = new EngineStore(
			createFakeManager({
				init: async () => {},
				options: [
					{
						id: 'mock',
						displayName: 'Crayon Mode',
						description: 'Instant',
						requirements: { approxDownloadMb: 0 },
						availability: { available: true, requiresDownload: false, approxDownloadMb: 0 }
					},
					{
						id: 'janus-webgpu',
						displayName: 'Janus',
						description: 'AI',
						requirements: { approxDownloadMb: 1024 },
						availability: { available: false, reason: 'No WebGPU' }
					}
				]
			})
		);

		await store.init();

		expect(store.options).toHaveLength(2);
		expect(store.activeId).toBe('mock');
		expect(store.realAiSupported).toBe(false);
	});

	it('select writes progress updates in order', async () => {
		const fractions: number[] = [];
		const store = new EngineStore(
			createFakeManager({
				select: async (_id, onProgress) => {
					onProgress?.({
						status: 'downloading',
						file: 'model.bin',
						loadedBytes: 50,
						totalBytes: 100,
						fraction: 0.5
					});
					fractions.push(store.loadProgress?.fraction ?? -1);
					onProgress?.({
						status: 'ready',
						file: null,
						loadedBytes: 100,
						totalBytes: 100,
						fraction: 1
					});
					fractions.push(store.loadProgress?.fraction ?? -1);
				},
				options: [
					{
						id: 'mock',
						displayName: 'Crayon Mode',
						description: 'Instant',
						requirements: { approxDownloadMb: 0 },
						availability: { available: true, requiresDownload: false, approxDownloadMb: 0 }
					}
				]
			})
		);

		await store.select('mock');

		expect(fractions).toEqual([0.5, 1]);
		expect(store.state).toBe('ready');
		expect(store.loadProgress).toBeNull();
	});

	it('a failing select sets loadError and state error without throwing', async () => {
		const store = new EngineStore(
			createFakeManager({
				select: async () => {
					throw new Error('Download failed');
				},
				options: [
					{
						id: 'mock',
						displayName: 'Crayon Mode',
						description: 'Instant',
						requirements: { approxDownloadMb: 0 },
						availability: { available: true, requiresDownload: false, approxDownloadMb: 0 }
					}
				]
			})
		);

		await expect(store.select('mock')).resolves.toBeUndefined();
		expect(store.loadError).toBe('Download failed');
		expect(store.state).toBe('error');
	});
});
