import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ArtEngine, DeviceCapability, EngineAvailability } from '$lib/types/contracts';
import { EngineError } from './errors';
import { EngineManager } from './manager';
import type { EngineDescriptor } from './registry';
import { MockEngine } from './mock/mockEngine';

const desktopCapability: DeviceCapability = {
	webgpu: true,
	fp16: true,
	maxStorageBufferBindingMb: 2048,
	maxBufferMb: 2048,
	isMobile: false,
	deviceMemoryGb: 8
};

function createFakeEngine(options: {
	id: EngineDescriptor['id'];
	tier: number;
	probe?: () => Promise<EngineAvailability>;
	load?: () => Promise<void>;
	unload?: () => Promise<void>;
	generate?: ArtEngine['generate'];
	critique?: ArtEngine['critique'];
}): { descriptor: EngineDescriptor; engine: ArtEngine; unload: ReturnType<typeof vi.fn> } {
	const unload = vi.fn(async () => {});
	const engine: ArtEngine = {
		id: options.id,
		displayName: options.id,
		description: 'test engine',
		requirements: {
			webgpu: true,
			approxDownloadMb: 100,
			minStorageBufferMb: 0,
			desktopOnly: false
		},
		capabilities: { generate: true, critique: true },
		probe:
			options.probe ??
			(async () => ({ available: true, requiresDownload: false, approxDownloadMb: 0 })),
		load: options.load ?? (async () => {}),
		unload: options.unload ?? unload,
		generate:
			options.generate ??
			(async () => ({
				id: `${options.id}-art`,
				imageUrl: 'data:image/svg+xml,<svg/>',
				playerPrompt: 'test',
				width: 512,
				height: 512,
				generationMs: 1,
				engineId: options.id
			})),
		critique:
			options.critique ??
			(async () => ({
				title: 'Test Title',
				accuracyScore: 5,
				criticReview: 'Fine.'
			}))
	};

	const descriptor: EngineDescriptor = {
		id: options.id,
		displayName: options.id,
		description: 'test engine',
		requirements: engine.requirements,
		tier: options.tier,
		create: async () => engine
	};

	return { descriptor, engine, unload };
}

describe('EngineManager', () => {
	const storage = new Map<string, string>();

	beforeEach(() => {
		storage.clear();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => {
				storage.set(key, value);
			},
			removeItem: (key: string) => {
				storage.delete(key);
			},
			clear: () => {
				storage.clear();
			}
		});
	});

	it('init leaves activeId as mock', async () => {
		const mock = createFakeEngine({ id: 'mock', tier: 0 });
		const high = createFakeEngine({ id: 'janus-webgpu', tier: 1 });
		const manager = new EngineManager({
			capability: desktopCapability,
			registry: [mock.descriptor, high.descriptor]
		});

		await manager.init();
		expect(manager.activeId).toBe('mock');
	});

	it('recommendedId prefers the highest available tier without download', async () => {
		const mock = createFakeEngine({ id: 'mock', tier: 0 });
		const high = createFakeEngine({
			id: 'janus-webgpu',
			tier: 1,
			probe: async () => ({ available: true, requiresDownload: false, approxDownloadMb: 0 })
		});
		const manager = new EngineManager({
			capability: desktopCapability,
			registry: [mock.descriptor, high.descriptor]
		});

		await manager.init();
		expect(manager.recommendedId).toBe('janus-webgpu');
	});

	it('select on a failing engine falls back to mock and throws EngineError', async () => {
		const mock = createFakeEngine({ id: 'mock', tier: 0 });
		const failing = createFakeEngine({
			id: 'janus-webgpu',
			tier: 1,
			load: async () => {
				throw new Error('load failed');
			}
		});
		const manager = new EngineManager({
			capability: desktopCapability,
			registry: [mock.descriptor, failing.descriptor]
		});
		await manager.init();

		await expect(manager.select('janus-webgpu')).rejects.toBeInstanceOf(EngineError);
		expect(manager.activeId).toBe('mock');
		expect(manager.state).toBe('error');
	});

	it('generate retries on mock after a non-cancel engine failure', async () => {
		let generateCalls = 0;
		const mockDescriptor = createFakeEngine({ id: 'mock', tier: 0 });
		const flaky = createFakeEngine({
			id: 'janus-webgpu',
			tier: 1,
			generate: async () => {
				generateCalls += 1;
				if (generateCalls === 1) {
					throw new EngineError('generation_failed', 'GPU blew up');
				}
				return {
					id: 'should-not-run',
					imageUrl: 'data:image/svg+xml,<svg/>',
					playerPrompt: 'nope',
					width: 512,
					height: 512,
					generationMs: 1,
					engineId: 'janus-webgpu'
				};
			}
		});

		const manager = new EngineManager({
			capability: desktopCapability,
			registry: [mockDescriptor.descriptor, flaky.descriptor]
		});
		await manager.init();
		await manager.select('janus-webgpu');

		const artwork = await manager.generate({
			playerPrompt: 'a cat',
			prompt: 'a cat, flat color'
		});

		expect(manager.activeId).toBe('mock');
		expect(artwork.engineId).toBe('mock');
	});

	it('does not retry cancelled generate errors', async () => {
		const mockDescriptor = createFakeEngine({ id: 'mock', tier: 0 });
		const cancelling = createFakeEngine({
			id: 'janus-webgpu',
			tier: 1,
			generate: async () => {
				throw new EngineError('cancelled', 'cancelled');
			}
		});

		const manager = new EngineManager({
			capability: desktopCapability,
			registry: [mockDescriptor.descriptor, cancelling.descriptor]
		});
		await manager.init();
		await manager.select('janus-webgpu');

		await expect(
			manager.generate({ playerPrompt: 'a cat', prompt: 'a cat, flat color' })
		).rejects.toMatchObject({ code: 'cancelled' });
		expect(manager.activeId).toBe('janus-webgpu');
	});

	it('select unloads the previous engine exactly once', async () => {
		const unloadSpy = vi.spyOn(MockEngine.prototype, 'unload').mockResolvedValue(undefined);
		const mock = createFakeEngine({ id: 'mock', tier: 0 });
		const second = createFakeEngine({ id: 'janus-webgpu', tier: 1 });

		const manager = new EngineManager({
			capability: desktopCapability,
			registry: [mock.descriptor, second.descriptor]
		});
		await manager.init();
		unloadSpy.mockClear();

		await manager.select('janus-webgpu');
		expect(unloadSpy).toHaveBeenCalledTimes(1);
		unloadSpy.mockRestore();
	});
});
