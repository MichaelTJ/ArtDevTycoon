import { describe, expect, it, vi } from 'vitest';
import type { RemoteEngineConfig } from '../remoteConfig';
import { createOpenRouterClient } from './openrouterClient';

const config: RemoteEngineConfig = {
	provider: 'openrouter',
	baseUrl: 'https://openrouter.ai/api/v1',
	apiKey: 'test-key-not-real-00000000',
	generateModel: 'black-forest-labs/flux',
	critiqueModel: 'openai/gpt-4o'
};

describe('openrouterClient', () => {
	it('testConnection hits /models with OpenRouter headers', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'm1' }] }), { status: 200 }));
		const client = createOpenRouterClient({ fetch: fetchMock });
		const result = await client.testConnection(config);
		expect(result).toEqual({ ok: true, device: 'openrouter' });
		const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
		expect(headers.get('X-Title')).toBe('Art Dev Tycoon');
		expect(headers.get('HTTP-Referer')).toBe('https://art-dev-tycoon.local');
	});
});
