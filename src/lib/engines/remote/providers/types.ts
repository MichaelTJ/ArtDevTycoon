import type { RemoteEngineConfig } from '../remoteConfig';

export const CONNECTION_TEST_TIMEOUT_MS = 6000;
export const REQUEST_TIMEOUT_MS = 180_000;

export const LOCAL_PROVIDER_IDS = ['januslink', 'ollama', 'lmstudio', 'automatic1111'] as const;

export type LocalProviderId = (typeof LOCAL_PROVIDER_IDS)[number];

/**
 * HTTP backend for a My PC remote provider. RemoteEngine routes generate/critique here;
 * nothing outside `remote/` should construct these clients.
 */
export interface RemoteProviderClient {
	testConnection(
		config: RemoteEngineConfig,
		signal?: AbortSignal
	): Promise<{ ok: true; device?: string } | { ok: false; reason: string }>;

	/** Optional — JanusLink has no model list. Return [] if unsupported. */
	listModels?(config: RemoteEngineConfig, signal?: AbortSignal): Promise<string[]>;

	generate(
		config: RemoteEngineConfig,
		body: { prompt: string; seed?: number },
		signal?: AbortSignal
	): Promise<{ images: Array<{ mimeType: string; base64: string }> }>;

	understand(
		config: RemoteEngineConfig,
		body: { image: Blob; question: string; filename?: string },
		signal?: AbortSignal
	): Promise<{ text: string }>;
}
