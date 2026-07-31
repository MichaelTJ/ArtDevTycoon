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

	it('maps a yes answer on critique targets to accuracyScore 10', async () => {
		const ask = vi.fn().mockResolvedValue({
			answers: ['yes'],
			review: 'A charming amateur piece.'
		});
		const client = createFakeClient({ ask });
		const engine = new JanusEngine({ createClient: () => client });
		await engine.load();

		const artwork = await engine.generate({
			playerPrompt: 'cat',
			prompt: 'cat, flat color'
		});
		const critique = await engine.critique({
			brief: c1,
			playerPrompt: 'cat',
			artwork
		});

		expect(ask).toHaveBeenCalled();
		const questions = ask.mock.calls[0]?.[1] as string[];
		expect(questions).toHaveLength(1);
		expect(questions[0]?.toLowerCase()).toContain('cat');
		expect(critique.accuracyScore).toBe(10);
		expect(() => critiqueDraftSchema.parse(critique)).not.toThrow();
	});

	it('maps a no answer to accuracyScore 1', async () => {
		const client = createFakeClient({
			ask: vi.fn().mockResolvedValue({
				answers: ['no'],
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
				answers: ['yes'],
				review: '   '
			})
		});
		const engine = new JanusEngine({ createClient: () => client });
		await engine.load();

		const artwork = await engine.generate({
			playerPrompt: 'cat',
			prompt: 'cat, flat color'
		});
		const critique = await engine.critique({
			brief: c1,
			playerPrompt: 'cat',
			artwork
		});

		expect(critique.criticReview.length).toBeGreaterThan(0);
	});

	it('scores accuracy 1 with empty critique targets for abstract parrots', async () => {
		const c6 = LEVEL_1_BRIEFS.find((brief) => brief.id === 'c6')!;
		const ask = vi.fn().mockResolvedValue({
			answers: [],
			review: 'A mood without a scene.'
		});
		const client = createFakeClient({ ask });
		const engine = new JanusEngine({ createClient: () => client });
		await engine.load();

		const artwork = await engine.generate({
			playerPrompt: 'I miss the old days',
			prompt: 'I miss the old days, flat color'
		});
		const critique = await engine.critique({
			brief: c6,
			playerPrompt: 'I miss the old days',
			artwork
		});

		expect(ask.mock.calls[0]?.[1]).toEqual([]);
		expect(critique.accuracyScore).toBe(1);
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
		await expect(isModelCached()).resolves.toBe(false);
		Object.defineProperty(globalThis, 'caches', { value: original, configurable: true });
	});
});
