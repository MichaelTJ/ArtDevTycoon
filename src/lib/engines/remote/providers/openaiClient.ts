import { createOpenAiCompatClient } from './openAiCompatClient';
import type { RemoteProviderClient } from './types';

export interface OpenAIClientDeps {
	fetch?: typeof fetch;
}

/** OpenAI cloud provider. */
export function createOpenAIClient(deps: OpenAIClientDeps = {}): RemoteProviderClient {
	return createOpenAiCompatClient({
		fetch: deps.fetch,
		deviceLabel: 'openai',
		reachabilityHint: 'Could not reach OpenAI. Check your network and API key.'
	});
}
