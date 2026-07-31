import { describe, expect, it, vi } from 'vitest';
import type { RemoteEngineConfig } from '../remoteConfig';
import { createOpenAIClient } from './openaiClient';

const config: RemoteEngineConfig = {
	provider: 'openai',
	baseUrl: 'https://api.openai.com/v1',
	apiKey: 'test-key-not-real-00000000',
	generateModel: 'dall-e-3',
	critiqueModel: 'gpt-4o'
};

describe('openaiClient', () => {
	it('testConnection hits /models', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ data: [{ id: 'gpt-4o' }] }), { status: 200 })
			);
		const client = createOpenAIClient({ fetch: fetchMock });
		const result = await client.testConnection(config);
		expect(result).toEqual({ ok: true, device: 'openai' });
		expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/models');
	});
});
