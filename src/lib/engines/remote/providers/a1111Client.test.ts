import { describe, expect, it, vi } from 'vitest';
import type { RemoteEngineConfig } from '../remoteConfig';
import { createA1111Client } from './a1111Client';
import type { RemoteProviderClient } from './types';

const config: RemoteEngineConfig = {
	provider: 'automatic1111',
	baseUrl: 'http://127.0.0.1:7860',
	apiKey: '',
	generateModel: '',
	critiqueProvider: 'ollama',
	critiqueBaseUrl: 'http://localhost:11434',
	critiqueModel: 'llava'
};

const TINY_PNG_B64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('a1111Client', () => {
	it('generate parses txt2img images', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ images: [TINY_PNG_B64] }), { status: 200 }));
		const client = createA1111Client({
			fetch: fetchMock,
			ollama: {
				testConnection: vi.fn(),
				understand: vi.fn(),
				generate: vi.fn()
			} as unknown as RemoteProviderClient
		});
		const result = await client.generate(config, { prompt: 'a cat', seed: 1 });
		expect(result.images[0]?.base64).toBe(TINY_PNG_B64);
		expect(fetchMock).toHaveBeenCalledWith(
			'http://127.0.0.1:7860/sdapi/v1/txt2img',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('understand delegates to critique provider', async () => {
		const understand = vi.fn().mockResolvedValue({ text: 'yes' });
		const client = createA1111Client({
			fetch: vi.fn(),
			ollama: {
				testConnection: vi.fn(),
				understand,
				generate: vi.fn()
			} as unknown as RemoteProviderClient
		});
		const result = await client.understand(config, {
			image: new Blob(['x']),
			question: 'cat?'
		});
		expect(result.text).toBe('yes');
		expect(understand).toHaveBeenCalledOnce();
		expect(understand.mock.calls[0]?.[0]).toMatchObject({
			provider: 'ollama',
			baseUrl: 'http://localhost:11434',
			critiqueModel: 'llava'
		});
	});
});
