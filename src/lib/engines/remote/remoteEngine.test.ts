import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientBrief, DeviceCapability } from '$lib/types/contracts';
import type { JanusLinkClient } from './janusLinkClient';
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
	baseUrl: 'https://pc.tailnet-xxxx.ts.net',
	apiKey: 'k'.repeat(32)
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

function fakeClient(overrides: Partial<JanusLinkClient> = {}): JanusLinkClient {
	return {
		testConnection: vi.fn().mockResolvedValue({ ok: true, device: 'cuda' }),
		generate: vi.fn().mockResolvedValue({
			promptId: 'g1',
			images: [{ mimeType: 'image/png', base64: TINY_PNG_B64 }]
		}),
		understand: vi.fn().mockResolvedValue({ promptId: 'u1', text: 'yes' }),
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
		const engine = new RemoteEngine({
			client: fakeClient(),
			loadConfig: () => null
		});
		const result = await engine.probe(capability);
		expect(result.available).toBe(false);
		if (!result.available) {
			expect(result.reason).toMatch(/Not connected/);
		}
	});

	it('probe is available when health succeeds', async () => {
		const engine = new RemoteEngine({
			client: fakeClient(),
			loadConfig: () => config
		});
		const result = await engine.probe(capability);
		expect(result).toEqual({
			available: true,
			requiresDownload: false,
			approxDownloadMb: 0
		});
	});

	it('generate returns schema-valid Artwork with verbatim playerPrompt', async () => {
		const client = fakeClient();
		const engine = new RemoteEngine({ client, loadConfig: () => config });
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
			.mockResolvedValueOnce({ promptId: '1', text: 'yes' })
			.mockResolvedValueOnce({ promptId: '2', text: 'Yes, clearly.' })
			.mockResolvedValueOnce({ promptId: '3', text: 'yes' })
			.mockResolvedValueOnce({ promptId: '4', text: 'yes' })
			.mockResolvedValueOnce({ promptId: '5', text: 'A charming cup on wood.' });

		const engine = new RemoteEngine({
			client: fakeClient({ understand }),
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

	it('critique uses fallback when review text is empty', async () => {
		const understand = vi.fn().mockResolvedValue({ promptId: '1', text: 'yes' });
		// 4 keywords sliced to 4 + 1 review → make the last (review) empty
		understand
			.mockResolvedValueOnce({ promptId: '1', text: 'yes' })
			.mockResolvedValueOnce({ promptId: '2', text: 'yes' })
			.mockResolvedValueOnce({ promptId: '3', text: 'yes' })
			.mockResolvedValueOnce({ promptId: '4', text: 'yes' })
			.mockResolvedValueOnce({ promptId: '5', text: '   ' });

		const engine = new RemoteEngine({
			client: fakeClient({ understand }),
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
