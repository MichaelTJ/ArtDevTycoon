import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientBrief, DeviceCapability } from '$lib/types/contracts';
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
});
