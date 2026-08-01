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

	it('generate sends override_settings when generateModel is set', async () => {
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
		await client.generate(
			{ ...config, generateModel: 'sdxl.safetensors' },
			{ prompt: 'a cat', seed: 7 }
		);
		const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect(JSON.parse(String(init.body))).toMatchObject({
			prompt: 'a cat',
			seed: 7,
			override_settings: { sd_model_checkpoint: 'sdxl.safetensors' }
		});
	});

	it('testConnection falls back to /options when sd-models fails', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response('missing', { status: 404 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ sd_model_checkpoint: 'a' }), { status: 200 })
			);
		const testConnection = vi.fn().mockResolvedValue({ ok: true, device: 'ollama' });
		const client = createA1111Client({
			fetch: fetchMock,
			ollama: {
				testConnection,
				understand: vi.fn(),
				generate: vi.fn()
			} as unknown as RemoteProviderClient
		});
		const result = await client.testConnection(config);
		expect(result).toEqual({ ok: true, device: 'automatic1111' });
		expect(fetchMock.mock.calls[0]?.[0]).toBe('http://127.0.0.1:7860/sdapi/v1/sd-models');
		expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:7860/sdapi/v1/options');
		expect(testConnection).toHaveBeenCalledOnce();
	});

	it('testConnection returns critique failure reason', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify([{ title: 'sdxl' }]), { status: 200 }));
		const client = createA1111Client({
			fetch: fetchMock,
			ollama: {
				testConnection: vi.fn().mockResolvedValue({
					ok: false,
					reason: 'Could not reach http://localhost:11434. Is Ollama running?'
				}),
				understand: vi.fn(),
				generate: vi.fn()
			} as unknown as RemoteProviderClient
		});
		const result = await client.testConnection(config);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/Ollama/);
		}
	});
});
