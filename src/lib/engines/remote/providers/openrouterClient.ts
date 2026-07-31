import { createOpenAiCompatClient } from './openAiCompatClient';
import type { RemoteProviderClient } from './types';

export interface OpenRouterClientDeps {
	fetch?: typeof fetch;
}

/** OpenRouter cloud provider (OpenAI-compatible). */
export function createOpenRouterClient(deps: OpenRouterClientDeps = {}): RemoteProviderClient {
	return createOpenAiCompatClient({
		fetch: deps.fetch,
		deviceLabel: 'openrouter',
		reachabilityHint: 'Could not reach OpenRouter. Check your network and API key.',
		extraHeaders: {
			'HTTP-Referer': 'https://art-dev-tycoon.local',
			'X-Title': 'Art Dev Tycoon'
		}
	});
}
