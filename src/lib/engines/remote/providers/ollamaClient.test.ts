import { describe, expect, it, vi } from 'vitest';
import type { RemoteEngineConfig } from '../remoteConfig';
import { createOllamaClient } from './ollamaClient';

const config: RemoteEngineConfig = {
	provider: 'ollama',
	baseUrl: 'http://localhost:11434',
	apiKey: '',
	generateModel: 'flux',
	critiqueModel: 'llava'
};

const TINY_PNG_B64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('ollamaClient', () => {
	it('listModels returns names from /api/tags', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ models: [{ name: 'llava' }, { name: 'flux' }] }), {
				status: 200
			})
		);
		const client = createOllamaClient({ fetch: fetchMock });
		await expect(client.listModels?.(config)).resolves.toEqual(['llava', 'flux']);
	});

	it('generate uses images[0]', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ images: [TINY_PNG_B64] }), { status: 200 }));
		const client = createOllamaClient({ fetch: fetchMock });
		const result = await client.generate(config, { prompt: 'a cat' });
		expect(result.images[0]?.base64).toBe(TINY_PNG_B64);
	});

	it('generate includes options.seed when seed is provided', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ images: [TINY_PNG_B64] }), { status: 200 }));
		const client = createOllamaClient({ fetch: fetchMock });
		await client.generate(config, { prompt: 'a cat', seed: 42 });
		const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect(JSON.parse(String(init.body))).toMatchObject({
			model: 'flux',
			prompt: 'a cat',
			stream: false,
			options: { seed: 42 }
		});
	});

	it('generate accepts long base64 in response field', async () => {
		const padded = TINY_PNG_B64 + 'A'.repeat(300);
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ response: padded }), { status: 200 }));
		const client = createOllamaClient({ fetch: fetchMock });
		const result = await client.generate(config, { prompt: 'a cat' });
		expect(result.images[0]?.base64).toBe(padded);
	});

	it('generate throws when only short text is returned', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ response: 'hello' }), { status: 200 }));
		const client = createOllamaClient({ fetch: fetchMock });
		await expect(client.generate(config, { prompt: 'a cat' })).rejects.toThrow(
			/did not return an image/
		);
	});

	it('understand returns chat content', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ message: { content: 'yes' } }), { status: 200 })
			);
		const client = createOllamaClient({ fetch: fetchMock });
		const result = await client.understand(config, {
			image: new Blob(['x'], { type: 'image/png' }),
			question: 'Does this show a cat?'
		});
		expect(result.text).toBe('yes');
	});

	it('testConnection returns CORS hint on network failure', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		const client = createOllamaClient({ fetch: fetchMock });
		const result = await client.testConnection(config);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/OLLAMA_ORIGINS/);
		}
	});
});
