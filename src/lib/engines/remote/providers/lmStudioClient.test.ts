import { describe, expect, it, vi } from 'vitest';
import type { RemoteEngineConfig } from '../remoteConfig';
import { createLmStudioClient } from './lmStudioClient';

const config: RemoteEngineConfig = {
	provider: 'lmstudio',
	baseUrl: 'http://localhost:1234',
	apiKey: '',
	generateModel: 'sdxl',
	critiqueModel: 'llava'
};

const TINY_PNG_B64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('lmStudioClient', () => {
	it('listModels returns ids', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ data: [{ id: 'sdxl' }, { id: 'llava' }] }), {
				status: 200
			})
		);
		const client = createLmStudioClient({ fetch: fetchMock });
		await expect(client.listModels?.(config)).resolves.toEqual(['sdxl', 'llava']);
	});

	it('generate prefers b64_json', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ data: [{ b64_json: TINY_PNG_B64 }] }), { status: 200 })
			);
		const client = createLmStudioClient({ fetch: fetchMock });
		const result = await client.generate(config, { prompt: 'a cat' });
		expect(result.images[0]?.base64).toBe(TINY_PNG_B64);
	});

	it('understand returns string content', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					choices: [{ message: { content: 'yes' } }]
				}),
				{ status: 200 }
			)
		);
		const client = createLmStudioClient({ fetch: fetchMock });
		const result = await client.understand(config, {
			image: new Blob(['x'], { type: 'image/png' }),
			question: 'cat?'
		});
		expect(result.text).toBe('yes');
	});

	it('generate surfaces 401 reason without leaking api key', async () => {
		const secret = 'super-secret-lmstudio-key-0001';
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), { status: 401 })
			);
		const client = createLmStudioClient({ fetch: fetchMock });
		let caught: unknown;
		try {
			await client.generate({ ...config, apiKey: secret }, { prompt: 'a cat' });
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(Error);
		const message = (caught as Error).message;
		expect(message).toMatch(/Invalid API key/);
		expect(message).not.toContain(secret);
	});

	it('testConnection returns CORS hint on network failure', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		const client = createLmStudioClient({ fetch: fetchMock });
		const result = await client.testConnection(config);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/CORS/);
		}
	});
});
