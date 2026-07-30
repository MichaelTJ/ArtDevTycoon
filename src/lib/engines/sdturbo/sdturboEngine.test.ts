import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEVEL_1_BRIEFS } from '$lib/data/briefs';
import { artworkSchema, critiqueDraftSchema } from '$lib/types/contracts';
import type { JanusEngine } from '../janus/janusEngine';
import { SdturboEngine, isModelCached } from './sdturboEngine';
import type { SdTurboWorkerClient } from './workerClient';

const c1 = LEVEL_1_BRIEFS.find((brief) => brief.id === 'c1')!;

function makeBitmap(): ImageBitmap {
	return {
		width: 512,
		height: 512,
		close: vi.fn()
	} as unknown as ImageBitmap;
}

function createFakeClient(overrides: Partial<SdTurboWorkerClient> = {}): SdTurboWorkerClient {
	return {
		load: vi.fn().mockResolvedValue(undefined),
		generate: vi.fn().mockResolvedValue({ bitmap: makeBitmap(), generationMs: 42 }),
		disposeSessions: vi.fn().mockResolvedValue(undefined),
		terminate: vi.fn(),
		...overrides
	} as unknown as SdTurboWorkerClient;
}

function createFakeJanus(overrides: Partial<JanusEngine> = {}): JanusEngine {
	return {
		load: vi.fn().mockResolvedValue(undefined),
		critique: vi.fn().mockResolvedValue({
			title: 'Morning Brew',
			accuracyScore: 7,
			criticReview: 'A charming amateur piece.'
		}),
		unload: vi.fn().mockResolvedValue(undefined),
		...overrides
	} as unknown as JanusEngine;
}

const desktopCapability = {
	webgpu: true,
	fp16: true,
	maxStorageBufferBindingMb: 2048,
	maxBufferMb: 2048,
	isMobile: false,
	deviceMemoryGb: 8
} as const;

const mobileCapability = {
	...desktopCapability,
	isMobile: true
} as const;

beforeEach(() => {
	vi.stubGlobal(
		'createImageBitmap',
		vi.fn(async (source: ImageBitmap) => {
			void source;
			return makeBitmap();
		})
	);
	vi.stubGlobal(
		'OffscreenCanvas',
		class {
			width: number;
			height: number;
			constructor(width: number, height: number) {
				this.width = width;
				this.height = height;
			}
			getContext() {
				return { drawImage: vi.fn() };
			}
			convertToBlob() {
				return Promise.resolve(new Blob(['png'], { type: 'image/png' }));
			}
		}
	);
});

describe('SdturboEngine.probe', () => {
	it('returns unavailable on mobile', async () => {
		const engine = new SdturboEngine({ createClient: () => createFakeClient() });
		const result = await engine.probe(mobileCapability);

		expect(result).toEqual({
			available: false,
			reason: 'This engine needs a desktop or laptop.'
		});
	});

	it('returns available on desktop when requirements pass', async () => {
		const engine = new SdturboEngine({ createClient: () => createFakeClient() });
		const result = await engine.probe(desktopCapability);

		expect(result.available).toBe(true);
		if (result.available) {
			expect(result.approxDownloadMb).toBe(1536);
		}
	});
});

describe('SdturboEngine.generate', () => {
	it('returns schema-valid Artwork at 512×512 with playerPrompt echoed verbatim', async () => {
		const client = createFakeClient();
		const engine = new SdturboEngine({ createClient: () => client });
		await engine.load();

		const playerPrompt = 'a dragon';
		const prompt = 'a dragon, flat color, crayon texture, amateur style';
		const artwork = await engine.generate({ playerPrompt, prompt });

		expect(() => artworkSchema.parse(artwork)).not.toThrow();
		expect(artwork.engineId).toBe('sdturbo-webgpu');
		expect(artwork.playerPrompt).toBe('a dragon');
		expect(artwork.playerPrompt).not.toBe(prompt);
		expect(artwork.width).toBe(512);
		expect(artwork.height).toBe(512);
		expect(client.generate).toHaveBeenCalledWith(prompt, undefined, undefined, undefined);
	});
});

describe('SdturboEngine.critique', () => {
	it('disposes SD-Turbo sessions before loading Janus and returns the delegate draft', async () => {
		const callOrder: string[] = [];
		const client = createFakeClient({
			disposeSessions: vi.fn(async () => {
				callOrder.push('dispose');
			})
		});
		const janus = createFakeJanus({
			load: vi.fn(async () => {
				callOrder.push('janus-load');
			}),
			critique: vi.fn(async () => {
				callOrder.push('janus-critique');
				return {
					title: 'Cup Study',
					accuracyScore: 8,
					criticReview: 'The cup reads well.'
				};
			})
		});

		const engine = new SdturboEngine({
			createClient: () => client,
			createJanus: () => janus
		});
		await engine.load();

		const artwork = await engine.generate({
			playerPrompt: 'coffee cup',
			prompt: 'coffee cup, flat color'
		});
		const critique = await engine.critique({
			brief: c1,
			playerPrompt: 'coffee cup',
			artwork
		});

		expect(callOrder).toEqual(['dispose', 'janus-load', 'janus-critique']);
		expect(client.disposeSessions).toHaveBeenCalledBefore(janus.load as ReturnType<typeof vi.fn>);
		expect(() => critiqueDraftSchema.parse(critique)).not.toThrow();
		expect(critique.title).toBe('Cup Study');
		expect(artwork.engineId).toBe('sdturbo-webgpu');
	});
});

describe('SdturboEngine.unload', () => {
	it('terminates the worker and unloads the Janus delegate', async () => {
		const client = createFakeClient();
		const janus = createFakeJanus();
		const engine = new SdturboEngine({
			createClient: () => client,
			createJanus: () => janus
		});
		await engine.load();

		await engine.generate({
			playerPrompt: 'cat',
			prompt: 'cat, flat color'
		});

		await engine.critique({
			brief: c1,
			playerPrompt: 'cat',
			artwork: {
				id: 'test',
				imageUrl: 'blob:test',
				playerPrompt: 'cat',
				width: 512,
				height: 512,
				generationMs: 1,
				engineId: 'sdturbo-webgpu'
			}
		});

		await engine.unload();

		expect(client.terminate).toHaveBeenCalled();
		expect(janus.unload).toHaveBeenCalled();
	});
});

describe('isModelCached', () => {
	it('returns false when caches API is unavailable', async () => {
		const original = globalThis.caches;
		Object.defineProperty(globalThis, 'caches', { value: undefined, configurable: true });
		await expect(isModelCached()).resolves.toBe(false);
		Object.defineProperty(globalThis, 'caches', { value: original, configurable: true });
	});
});
