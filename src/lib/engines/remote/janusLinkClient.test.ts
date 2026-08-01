import { describe, expect, it, vi } from 'vitest';
import { createJanusLinkClient } from './janusLinkClient';
import type { RemoteEngineConfig } from './remoteConfig';

const config: RemoteEngineConfig = {
	provider: 'januslink',
	baseUrl: 'https://pc.tailnet-xxxx.ts.net',
	apiKey: 'k'.repeat(32)
};

describe('janusLinkClient', () => {
	it('testConnection succeeds on healthy response', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: true, device: 'cuda' }), { status: 200 })
			);
		const client = createJanusLinkClient({ fetch: fetchMock });

		const result = await client.testConnection(config);
		expect(result).toEqual({ ok: true, device: 'cuda' });
		expect(fetchMock).toHaveBeenCalledWith(
			'https://pc.tailnet-xxxx.ts.net/api/janus/health',
			expect.objectContaining({
				method: 'GET',
				headers: expect.any(Headers)
			})
		);
		const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
		expect(headers.get('Authorization')).toBe(`Bearer ${config.apiKey}`);
	});

	it('testConnection returns reason on 401', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }));
		const client = createJanusLinkClient({ fetch: fetchMock });
		const result = await client.testConnection(config);
		expect(result).toEqual({ ok: false, reason: 'unauthorized' });
	});

	it('testConnection maps network failure to CORS/reachability message', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		const client = createJanusLinkClient({ fetch: fetchMock });
		const result = await client.testConnection(config);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toContain('JANUS_ALLOWED_ORIGINS');
			expect(result.reason).toContain(config.baseUrl);
		}
	});

	it('generate parses base64 images', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					promptId: 'p1',
					images: [{ mimeType: 'image/png', base64: 'AAAA' }]
				}),
				{ status: 200 }
			)
		);
		const client = createJanusLinkClient({ fetch: fetchMock });
		const result = await client.generate(config, { prompt: 'a fox', seed: 1 });
		expect(result.promptId).toBe('p1');
		expect(result.images[0]?.base64).toBe('AAAA');
	});

	it('understand returns text', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ promptId: 'u1', text: 'yes' }), { status: 200 })
			);
		const client = createJanusLinkClient({ fetch: fetchMock });
		const result = await client.understand(config, {
			image: new Blob(['x'], { type: 'image/png' }),
			question: 'Does this show a fox?'
		});
		expect(result).toEqual({ promptId: 'u1', text: 'yes' });
	});

	it('generate fails closed on invalid JSON shape', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ nope: true }), { status: 200 }));
		const client = createJanusLinkClient({ fetch: fetchMock });
		await expect(client.generate(config, { prompt: 'x' })).rejects.toThrow(
			'Unexpected generate response'
		);
	});

	it('edit posts multipart to /api/janus/edit', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					promptId: 'e1',
					images: [{ mimeType: 'image/png', base64: 'BBBB' }]
				}),
				{ status: 200 }
			)
		);
		const client = createJanusLinkClient({ fetch: fetchMock });
		const result = await client.edit(config, {
			image: new Blob(['x'], { type: 'image/png' }),
			prompt: 'a fox, crayon texture',
			seed: 3
		});
		expect(result.images[0]?.base64).toBe('BBBB');
		expect(fetchMock.mock.calls[0]?.[0]).toBe('https://pc.tailnet-xxxx.ts.net/api/janus/edit');
		const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect(init.body).toBeInstanceOf(FormData);
	});
});
