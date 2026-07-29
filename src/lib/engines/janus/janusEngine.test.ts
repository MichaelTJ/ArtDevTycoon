import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEVEL_1_BRIEFS } from '$lib/data/briefs';
import { artworkSchema, critiqueDraftSchema } from '$lib/types/contracts';
import { JanusEngine, isModelCached } from './janusEngine';
import type { JanusWorkerClient } from './workerClient';

const c1 = LEVEL_1_BRIEFS.find((brief) => brief.id === 'c1')!;

function makeBitmap(): ImageBitmap {
	return {
		width: 384,
		height: 384,
		close: vi.fn()
	} as unknown as ImageBitmap;
}

function createFakeClient(overrides: Partial<JanusWorkerClient> = {}): JanusWorkerClient {
	return {
		load: vi.fn().mockResolvedValue(undefined),
		generate: vi.fn().mockResolvedValue({ bitmap: makeBitmap(), generationMs: 42 }),
		ask: vi.fn(),
		terminate: vi.fn(),
		...overrides
	} as unknown as JanusWorkerClient;
}

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

describe('JanusEngine', () => {
	it('returns schema-valid Artwork with playerPrompt echoed verbatim', async () => {
		const client = createFakeClient();
		const engine = new JanusEngine({ createClient: () => client });
		await engine.load();

		const playerPrompt = 'a dragon';
		const prompt = 'a dragon, flat color, crayon texture, amateur style';
		const artwork = await engine.generate({ playerPrompt, prompt });

		expect(() => artworkSchema.parse(artwork)).not.toThrow();
		expect(artwork.engineId).toBe('janus-webgpu');
		expect(artwork.playerPrompt).toBe('a dragon');
		expect(artwork.playerPrompt).not.toBe(prompt);
		expect(artwork.width).toBe(384);
		expect(artwork.height).toBe(384);
		expect(client.generate).toHaveBeenCalledWith(prompt, undefined, undefined);
	});

	it('maps four yes answers to accuracyScore 10', async () => {
		const client = createFakeClient({
			ask: vi.fn().mockResolvedValue({
				answers: ['yes', 'yes', 'yes', 'yes'],
				review: 'A charming amateur piece.'
			})
		});
		const engine = new JanusEngine({ createClient: () => client });
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

		expect(critique.accuracyScore).toBe(10);
		expect(() => critiqueDraftSchema.parse(critique)).not.toThrow();
	});

	it('maps four no answers to accuracyScore 1', async () => {
		const client = createFakeClient({
			ask: vi.fn().mockResolvedValue({
				answers: ['no', 'no', 'no', 'no'],
				review: 'Not what they asked for.'
			})
		});
		const engine = new JanusEngine({ createClient: () => client });
		await engine.load();

		const artwork = await engine.generate({
			playerPrompt: 'dragon',
			prompt: 'dragon, flat color'
		});
		const critique = await engine.critique({
			brief: c1,
			playerPrompt: 'dragon',
			artwork
		});

		expect(critique.accuracyScore).toBe(1);
	});

	it('falls back when review prose is empty', async () => {
		const client = createFakeClient({
			ask: vi.fn().mockResolvedValue({
				answers: ['yes', 'no', 'no', 'no'],
				review: '   '
			})
		});
		const engine = new JanusEngine({ createClient: () => client });
		await engine.load();

		const artwork = await engine.generate({
			playerPrompt: 'coffee',
			prompt: 'coffee, flat color'
		});
		const critique = await engine.critique({
			brief: c1,
			playerPrompt: 'coffee',
			artwork
		});

		expect(critique.criticReview.length).toBeGreaterThan(0);
	});

	it('revokes every object URL on unload', async () => {
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		const client = createFakeClient();
		const engine = new JanusEngine({ createClient: () => client });
		await engine.load();

		const artwork = await engine.generate({
			playerPrompt: 'cat',
			prompt: 'cat, flat color'
		});

		expect(artwork.imageUrl.startsWith('blob:')).toBe(true);
		await engine.unload();

		expect(revoke).toHaveBeenCalledWith(artwork.imageUrl);
		revoke.mockRestore();
	});
});

describe('isModelCached', () => {
	it('returns false when caches API is unavailable', async () => {
		const original = globalThis.caches;
		Object.defineProperty(globalThis, 'caches', { value: undefined, configurable: true });
		await expect(isModelCached(true)).resolves.toBe(false);
		Object.defineProperty(globalThis, 'caches', { value: original, configurable: true });
	});
});
