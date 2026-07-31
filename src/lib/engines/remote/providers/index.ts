import { createA1111Client } from './a1111Client';
import { createJanusAdapter } from './janusAdapter';
import { createLmStudioClient } from './lmStudioClient';
import { createOllamaClient } from './ollamaClient';
import { createOpenAIClient } from './openaiClient';
import { createOpenRouterClient } from './openrouterClient';
import type { LocalProviderId, RemoteProviderClient } from './types';

export type { LocalProviderId, RemoteProviderClient } from './types';
export {
	LOCAL_PROVIDER_IDS,
	REMOTE_PROVIDER_IDS,
	CONNECTION_TEST_TIMEOUT_MS,
	REQUEST_TIMEOUT_MS
} from './types';

/** Resolve the HTTP client for a My PC provider id. */
export function getRemoteProviderClient(provider: LocalProviderId | string): RemoteProviderClient {
	switch (provider) {
		case 'januslink':
			return createJanusAdapter();
		case 'ollama':
			return createOllamaClient();
		case 'lmstudio':
			return createLmStudioClient();
		case 'automatic1111':
			return createA1111Client();
		case 'openrouter':
			return createOpenRouterClient();
		case 'openai':
			return createOpenAIClient();
		default:
			throw new Error(`Unknown remote provider: ${provider}`);
	}
}
