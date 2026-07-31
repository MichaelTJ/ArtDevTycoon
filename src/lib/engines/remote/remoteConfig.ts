import { z } from 'zod';

/** localStorage key for the player's My PC connection settings. */
export const REMOTE_CONFIG_STORAGE_KEY = 'adt.engine.remote.config';

const urlSchema = z
	.string()
	.url()
	.transform((url) => url.replace(/\/+$/, ''));

const januslinkConfigSchema = z.object({
	provider: z.literal('januslink'),
	baseUrl: urlSchema,
	apiKey: z.string().min(24).max(256)
});

const ollamaConfigSchema = z.object({
	provider: z.literal('ollama'),
	baseUrl: urlSchema.default('http://localhost:11434'),
	apiKey: z.string().max(256).default(''),
	generateModel: z.string().min(1).max(200),
	critiqueModel: z.string().min(1).max(200)
});

const lmstudioConfigSchema = z.object({
	provider: z.literal('lmstudio'),
	baseUrl: urlSchema.default('http://localhost:1234'),
	apiKey: z.string().max(256).default(''),
	generateModel: z.string().min(1).max(200),
	critiqueModel: z.string().min(1).max(200)
});

const a1111ConfigSchema = z.object({
	provider: z.literal('automatic1111'),
	baseUrl: urlSchema.default('http://127.0.0.1:7860'),
	apiKey: z.string().max(256).default(''),
	/** Checkpoint name is optional — A1111 uses whatever is loaded in its UI. */
	generateModel: z.string().max(200).default(''),
	critiqueProvider: z.enum(['ollama', 'lmstudio']),
	critiqueBaseUrl: urlSchema,
	critiqueModel: z.string().min(1).max(200)
});

const cloudKey = z.string().min(8).max(512);

const openrouterConfigSchema = z.object({
	provider: z.literal('openrouter'),
	baseUrl: urlSchema.default('https://openrouter.ai/api/v1'),
	apiKey: cloudKey,
	generateModel: z.string().min(1).max(200),
	critiqueModel: z.string().min(1).max(200)
});

const openaiConfigSchema = z.object({
	provider: z.literal('openai'),
	baseUrl: urlSchema.default('https://api.openai.com/v1'),
	apiKey: cloudKey,
	generateModel: z.string().min(1).max(200),
	critiqueModel: z.string().min(1).max(200)
});

/**
 * Player-supplied My PC endpoint. Discriminated by `provider`.
 * JanusLink keeps a single API key; local/cloud stacks pick generate + critique models.
 */
export const remoteEngineConfigSchema = z.discriminatedUnion('provider', [
	januslinkConfigSchema,
	ollamaConfigSchema,
	lmstudioConfigSchema,
	a1111ConfigSchema,
	openrouterConfigSchema,
	openaiConfigSchema
]);

export type RemoteEngineConfig = z.infer<typeof remoteEngineConfigSchema>;
export type RemoteProviderId = RemoteEngineConfig['provider'];

/** Inject provider for legacy JanusLink saves that only had baseUrl + apiKey. */
function migrateLegacy(raw: unknown): unknown {
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		const obj = raw as Record<string, unknown>;
		if (
			obj.provider === undefined &&
			typeof obj.baseUrl === 'string' &&
			typeof obj.apiKey === 'string'
		) {
			return { provider: 'januslink', ...obj };
		}
	}
	return raw;
}

/** Default base URL shown in the setup dialog before the player edits. */
export function defaultBaseUrlForProvider(provider: RemoteProviderId): string {
	switch (provider) {
		case 'januslink':
			return '';
		case 'ollama':
			return 'http://localhost:11434';
		case 'lmstudio':
			return 'http://localhost:1234';
		case 'automatic1111':
			return 'http://127.0.0.1:7860';
		case 'openrouter':
			return 'https://openrouter.ai/api/v1';
		case 'openai':
			return 'https://api.openai.com/v1';
	}
}

/** Read and validate stored config. Malformed or missing → null; never throws. */
export function loadRemoteConfig(): RemoteEngineConfig | null {
	try {
		const raw = localStorage.getItem(REMOTE_CONFIG_STORAGE_KEY);
		if (raw === null) {
			return null;
		}
		const parsed: unknown = JSON.parse(raw);
		const result = remoteEngineConfigSchema.safeParse(migrateLegacy(parsed));
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

/** Validate then persist. Throws ZodError if invalid. */
export function saveRemoteConfig(config: RemoteEngineConfig): void {
	const validated = remoteEngineConfigSchema.parse(config);
	localStorage.setItem(REMOTE_CONFIG_STORAGE_KEY, JSON.stringify(validated));
}

/** Remove stored My PC settings. */
export function clearRemoteConfig(): void {
	try {
		localStorage.removeItem(REMOTE_CONFIG_STORAGE_KEY);
	} catch {
		/* ignore quota / private-mode failures */
	}
}
