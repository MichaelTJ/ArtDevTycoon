import { describe, expect, it, vi } from 'vitest';
import type { RemoteEngineConfig } from '../remoteConfig';
import { createOpenAiCompatClient } from './openAiCompatClient';

const FAKE_KEY = 'test-key-not-real-00000000';

const config: RemoteEngineConfig = {
	provider: 'openai',
	baseUrl: 'https://api.openai.com/v1',
	apiKey: FAKE_KEY,
	generateModel: 'dall-e-3',
	critiqueModel: 'gpt-4o'
};

const TINY_PNG_B64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('openAiCompatClient', () => {
	it('listModels returns sorted ids', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ data: [{ id: 'z-model' }, { id: 'a-model' }] }), {
				status: 200
			})
		);
		const client = createOpenAiCompatClient({
			fetch: fetchMock,
			deviceLabel: 'openai',
			reachabilityHint: 'unreachable'
		});
		await expect(client.listModels?.(config)).resolves.toEqual(['a-model', 'z-model']);
	});

	it('generate prefers b64_json', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ data: [{ b64_json: TINY_PNG_B64 }] }), { status: 200 })
			);
		const client = createOpenAiCompatClient({
			fetch: fetchMock,
			deviceLabel: 'openai',
			reachabilityHint: 'unreachable'
		});
		const result = await client.generate(config, { prompt: 'a cat' });
		expect(result.images[0]?.base64).toBe(TINY_PNG_B64);
	});

	it('generate fetches url when b64 missing', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ data: [{ url: 'https://cdn.example/img.png' }] }), {
					status: 200
				})
			)
			.mockResolvedValueOnce(
				new Response(Uint8Array.from([1, 2, 3]), {
					status: 200,
					headers: { 'content-type': 'image/png' }
				})
			);
		const client = createOpenAiCompatClient({
			fetch: fetchMock,
			deviceLabel: 'openai',
			reachabilityHint: 'unreachable'
		});
		const result = await client.generate(config, { prompt: 'a cat' });
		expect(result.images[0]?.base64.length).toBeGreaterThan(0);
	});

	it('understand returns string content', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ choices: [{ message: { content: 'yes' } }] }), {
				status: 200
			})
		);
		const client = createOpenAiCompatClient({
			fetch: fetchMock,
			deviceLabel: 'openai',
			reachabilityHint: 'unreachable'
		});
		const result = await client.understand(config, {
			image: new Blob(['x'], { type: 'image/png' }),
			question: 'cat?'
		});
		expect(result.text).toBe('yes');
	});

	it('401 does not leak api key', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: { message: `bad ${FAKE_KEY}` } }), {
				status: 401
			})
		);
		const client = createOpenAiCompatClient({
			fetch: fetchMock,
			deviceLabel: 'openai',
			reachabilityHint: 'unreachable'
		});
		const result = await client.testConnection(config);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).not.toContain(FAKE_KEY);
			expect(result.reason).toMatch(/Authentication failed/);
		}
	});

	it('404 generate uses image-model message', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 404 }));
		const client = createOpenAiCompatClient({
			fetch: fetchMock,
			deviceLabel: 'openai',
			reachabilityHint: 'unreachable'
		});
		await expect(client.generate(config, { prompt: 'a cat' })).rejects.toThrow(
			/does not support image generation/
		);
	});

	it('network failure uses reachability hint', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		const client = createOpenAiCompatClient({
			fetch: fetchMock,
			deviceLabel: 'openai',
			reachabilityHint: 'Check your network and API key.'
		});
		const result = await client.testConnection(config);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/Check your network/);
		}
	});
});
