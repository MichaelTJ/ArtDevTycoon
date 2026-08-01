import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KITCHEN_BRIEFS } from '$lib/data/kitchenBriefs';
import type { ClientBrief, DeviceCapability } from '$lib/types/contracts';
import { EngineError } from '../errors';
import type { RemoteProviderClient } from './providers';
import { RemoteEngine } from './remoteEngine';
import type { RemoteEngineConfig } from './remoteConfig';

const capability: DeviceCapability = {
	webgpu: false,
	fp16: false,
	maxStorageBufferBindingMb: null,
	maxBufferMb: null,
	isMobile: true,
	deviceMemoryGb: null
};

const config: RemoteEngineConfig = {
	provider: 'januslink',
	baseUrl: 'https://pc.tailnet-xxxx.ts.net',
	apiKey: 'k'.repeat(32)
};

const ollamaConfig: RemoteEngineConfig = {
	provider: 'ollama',
	baseUrl: 'http://localhost:11434',
	apiKey: '',
	generateModel: 'flux',
	critiqueModel: 'llava'
};

const brief: ClientBrief = {
	id: 'c1',
	clientName: 'Ada',
	avatarUrl: '/avatars/ada.svg',
	requestText: 'a cozy coffee cup',
	budget: 100,
	preferredKeywords: ['coffee cup', 'wood', 'steam', 'saucer', 'extra']
};

/** Minimal valid 1x1 PNG. */
const TINY_PNG_B64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function fakeClient(overrides: Partial<RemoteProviderClient> = {}): RemoteProviderClient {
	return {
		testConnection: vi.fn().mockResolvedValue({ ok: true, device: 'cuda' }),
		listModels: vi.fn().mockResolvedValue([]),
		generate: vi.fn().mockResolvedValue({
			images: [{ mimeType: 'image/png', base64: TINY_PNG_B64 }]
		}),
		understand: vi.fn().mockResolvedValue({ text: 'yes' }),
		edit: vi.fn().mockResolvedValue({
			images: [{ mimeType: 'image/png', base64: TINY_PNG_B64 }]
		}),
		...overrides
	};
}

beforeEach(() => {
	vi.stubGlobal(
		'createImageBitmap',
		vi.fn(async () => ({
			width: 384,
			height: 384,
			close: vi.fn()
		}))
	);
	vi.stubGlobal('URL', {
		...URL,
		createObjectURL: vi.fn(() => 'blob:remote-test'),
		revokeObjectURL: vi.fn()
	});
});

describe('RemoteEngine', () => {
	it('probe is unavailable without config', async () => {
		const client = fakeClient();
		const engine = new RemoteEngine({
			getClient: () => client,
			loadConfig: () => null
		});
		const result = await engine.probe(capability);
		expect(result.available).toBe(false);
		if (!result.available) {
			expect(result.reason).toMatch(/Not connected/);
		}
	});

	it('probe is available when health succeeds', async () => {
		const client = fakeClient();
		const engine = new RemoteEngine({
			getClient: () => client,
			loadConfig: () => config
		});
		const result = await engine.probe(capability);
		expect(result).toEqual({
			available: true,
			requiresDownload: false,
			approxDownloadMb: 0
		});
	});

	it('probe works with ollama-shaped config', async () => {
		const client = fakeClient();
		const engine = new RemoteEngine({
			getClient: () => client,
			loadConfig: () => ollamaConfig
		});
		const result = await engine.probe(capability);
		expect(result.available).toBe(true);
	});

	it('load throws EngineError when connection test fails', async () => {
		const client = fakeClient({
			testConnection: vi.fn().mockResolvedValue({ ok: false, reason: 'unauthorized' })
		});
		const engine = new RemoteEngine({
			getClient: () => client,
			loadConfig: () => config
		});
		await expect(engine.load()).rejects.toMatchObject({
			code: 'internal',
			message: 'unauthorized'
		});
	});

	it('load emits ready progress when health succeeds', async () => {
		const onProgress = vi.fn();
		const engine = new RemoteEngine({
			getClient: () => fakeClient(),
			loadConfig: () => config
		});
		await engine.load({ onProgress });
		expect(onProgress).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'ready', fraction: 1 })
		);
		await engine.unload();
	});

	it('generate returns schema-valid Artwork with verbatim playerPrompt', async () => {
		const client = fakeClient();
		const engine = new RemoteEngine({
			getClient: () => client,
			loadConfig: () => config
		});
		await engine.load();

		const artwork = await engine.generate({
			playerPrompt: 'epic masterpiece',
			prompt: 'epic masterpiece, flat color, crayon texture'
		});

		expect(artwork.engineId).toBe('remote');
		expect(artwork.playerPrompt).toBe('epic masterpiece');
		expect(artwork.playerPrompt).not.toBe('epic masterpiece, flat color, crayon texture');
		expect(artwork.imageUrl).toBe('blob:remote-test');
		expect(client.generate).toHaveBeenCalledWith(
			config,
			expect.objectContaining({ prompt: 'epic masterpiece, flat color, crayon texture' }),
			undefined
		);

		await engine.unload();
	});

	it('critique maps four yes answers to accuracy 10', async () => {
		const understand = vi
			.fn()
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'Yes, clearly.' })
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'A charming cup on wood.' });

		const engine = new RemoteEngine({
			getClient: () => fakeClient({ understand }),
			loadConfig: () => config
		});
		await engine.load();
		const artwork = await engine.generate({
			playerPrompt: 'coffee',
			prompt: 'coffee, crayon'
		});

		const draft = await engine.critique({
			brief,
			playerPrompt: 'coffee',
			artwork
		});

		expect(draft.accuracyScore).toBe(10);
		expect(draft.criticReview).toMatch(/charming cup/i);
		expect(understand).toHaveBeenCalledTimes(5);
		await engine.unload();
	});

	it('calls edit when sketchImage is provided', async () => {
		const client = fakeClient();
		const engine = new RemoteEngine({
			getClient: () => client,
			loadConfig: () => config
		});
		await engine.load();
		const sketch = new Blob([Uint8Array.from([1, 2, 3])], { type: 'image/png' });
		await engine.generate({
			playerPrompt: 'a cat',
			prompt: 'a cat, crayon texture',
			sketchImage: sketch
		});
		expect(client.edit).toHaveBeenCalledWith(
			config,
			expect.objectContaining({
				prompt: 'a cat, crayon texture',
				image: sketch
			}),
			undefined
		);
		const editBody = (client.edit as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<
			string,
			unknown
		>;
		expect(editBody).not.toHaveProperty('playerPrompt');
		expect(client.generate).not.toHaveBeenCalled();
		await engine.unload();
	});

	it('calls generate when sketchImage is absent', async () => {
		const client = fakeClient();
		const engine = new RemoteEngine({
			getClient: () => client,
			loadConfig: () => config
		});
		await engine.load();
		await engine.generate({
			playerPrompt: 'a cat',
			prompt: 'a cat, crayon texture'
		});
		expect(client.generate).toHaveBeenCalledOnce();
		expect(client.edit).not.toHaveBeenCalled();
		await engine.unload();
	});

	it('maps BAGEL / 501 edit failures to player-safe EngineError', async () => {
		const client = fakeClient({
			edit: vi.fn().mockRejectedValue(new Error('BAGEL not installed. Set BAGEL_MODEL_DIR'))
		});
		const engine = new RemoteEngine({
			getClient: () => client,
			loadConfig: () => config
		});
		await engine.load();
		const sketch = new Blob([Uint8Array.from([1, 2, 3])], { type: 'image/png' });
		await expect(
			engine.generate({
				playerPrompt: 'a cat',
				prompt: 'a cat, crayon texture',
				sketchImage: sketch
			})
		).rejects.toMatchObject({
			name: 'EngineError',
			code: 'generation_failed',
			message:
				'Sketch refine needs BAGEL on your PC (ADTLocalServe edit). Falling back is handled by the engine manager.'
		} satisfies Partial<EngineError>);
		await engine.unload();
	});

	it('critique uses fallback when review text is empty', async () => {
		const understand = vi
			.fn()
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: '   ' });

		const engine = new RemoteEngine({
			getClient: () => fakeClient({ understand }),
			loadConfig: () => config
		});
		await engine.load();
		const artwork = await engine.generate({
			playerPrompt: 'coffee',
			prompt: 'coffee, crayon'
		});

		const draft = await engine.critique({
			brief,
			playerPrompt: 'coffee',
			artwork
		});

		expect(draft.criticReview.length).toBeGreaterThan(0);
		expect(draft.criticReview).not.toBe('   ');
		await engine.unload();
	});

	it('scores accuracy 1 with empty critique targets for abstract parrots', async () => {
		const c6 = KITCHEN_BRIEFS.find((b) => b.id === 'c6')!;
		const understand = vi.fn().mockResolvedValue({ text: 'A mood without a scene.' });

		const engine = new RemoteEngine({
			getClient: () => fakeClient({ understand }),
			loadConfig: () => config
		});
		await engine.load();
		const artwork = await engine.generate({
			playerPrompt: 'I miss the old days',
			prompt: 'I miss the old days, crayon'
		});

		const draft = await engine.critique({
			brief: c6,
			playerPrompt: 'I miss the old days',
			artwork
		});

		expect(draft.accuracyScore).toBe(1);
		// No keyword questions — only the review prompt.
		expect(understand).toHaveBeenCalledTimes(1);
		expect(understand.mock.calls[0]?.[1]).toEqual(
			expect.objectContaining({
				question: expect.stringMatching(/miss the old days/i)
			})
		);
		await engine.unload();
	});

	it('asks critiqueTargetsForBrief cluster keywords for a committed reading', async () => {
		const c6 = KITCHEN_BRIEFS.find((b) => b.id === 'c6')!;
		const understand = vi
			.fn()
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'yes' })
			.mockResolvedValueOnce({ text: 'A warm Sunday table.' });

		const engine = new RemoteEngine({
			getClient: () => fakeClient({ understand }),
			loadConfig: () => config
		});
		await engine.load();
		const artwork = await engine.generate({
			playerPrompt: 'sunday dinner with family around the tablecloth',
			prompt: 'sunday dinner with family around the tablecloth, crayon'
		});

		const draft = await engine.critique({
			brief: c6,
			playerPrompt: 'sunday dinner with family around the tablecloth',
			artwork
		});

		expect(draft.accuracyScore).toBe(10);
		expect(understand).toHaveBeenCalledTimes(5);
		const asked = understand.mock.calls
			.slice(0, 4)
			.map((call) => String((call[1] as { question: string }).question).toLowerCase());
		expect(asked.some((q) => q.includes('sunday'))).toBe(true);
		expect(asked.some((q) => q.includes('dinner'))).toBe(true);
		expect(asked.some((q) => q.includes('family'))).toBe(true);
		expect(asked.some((q) => q.includes('tablecloth'))).toBe(true);
		await engine.unload();
	});
});
