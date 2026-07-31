import { z } from 'zod';

/** localStorage key for the player's JanusLink connection settings. */
export const REMOTE_CONFIG_STORAGE_KEY = 'adt.engine.remote.config';

/**
 * Player-supplied JanusLink endpoint. The API key is their own PC secret — never sent
 * anywhere except their Tailscale phone-app host.
 */
export const remoteEngineConfigSchema = z.object({
	baseUrl: z
		.string()
		.url()
		.transform((url) => url.replace(/\/+$/, '')),
	apiKey: z.string().min(24).max(256)
});

export type RemoteEngineConfig = z.infer<typeof remoteEngineConfigSchema>;

/** Read and validate stored config. Malformed or missing → null; never throws. */
export function loadRemoteConfig(): RemoteEngineConfig | null {
	try {
		const raw = localStorage.getItem(REMOTE_CONFIG_STORAGE_KEY);
		if (raw === null) {
			return null;
		}
		const parsed: unknown = JSON.parse(raw);
		const result = remoteEngineConfigSchema.safeParse(parsed);
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
