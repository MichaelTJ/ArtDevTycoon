import { z } from 'zod';
import type { RemoteEngineConfig } from './remoteConfig';

export const CONNECTION_TEST_TIMEOUT_MS = 6000;
export const REQUEST_TIMEOUT_MS = 180_000;

export const janusGenerateResultSchema = z.object({
	promptId: z.string().min(1),
	images: z
		.array(
			z.object({
				filename: z.string().optional(),
				mimeType: z.string().min(1),
				base64: z.string().min(1)
			})
		)
		.min(1)
});

export const janusUnderstandResultSchema = z.object({
	promptId: z.string().min(1),
	text: z.string()
});

export const janusHealthResultSchema = z.object({
	ok: z.literal(true),
	device: z.string().optional(),
	dtype: z.string().optional(),
	modelDir: z.string().optional(),
	version: z.string().optional()
});

export type JanusGenerateResult = z.infer<typeof janusGenerateResultSchema>;
export type JanusUnderstandResult = z.infer<typeof janusUnderstandResultSchema>;

export interface JanusLinkClientDeps {
	fetch?: typeof fetch;
}

export interface JanusLinkClient {
	testConnection(
		config: RemoteEngineConfig,
		signal?: AbortSignal
	): Promise<{ ok: true; device?: string } | { ok: false; reason: string }>;
	generate(
		config: RemoteEngineConfig,
		body: { prompt: string; seed?: number },
		signal?: AbortSignal
	): Promise<JanusGenerateResult>;
	understand(
		config: RemoteEngineConfig,
		body: { image: Blob; question: string; filename?: string },
		signal?: AbortSignal
	): Promise<JanusUnderstandResult>;
}

function reachabilityReason(baseUrl: string): string {
	return (
		`Could not reach ${baseUrl}. Is JanusLink running? ` +
		'Is this game origin in JANUS_ALLOWED_ORIGINS on the PC?'
	);
}

function errorMessageFromBody(data: unknown, status: number): string {
	if (data && typeof data === 'object' && 'error' in data) {
		const err = (data as { error: unknown }).error;
		if (typeof err === 'string' && err.trim().length > 0) {
			return err;
		}
	}
	return `Request failed (${status})`;
}

async function parseJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return {};
	}
}

/** Browser HTTP client for JanusLink phone-app `/api/janus/*` (Bearer auth only). */
export function createJanusLinkClient(deps: JanusLinkClientDeps = {}): JanusLinkClient {
	const fetchImpl = deps.fetch ?? fetch;

	async function authorizedFetch(
		config: RemoteEngineConfig,
		path: string,
		init: RequestInit,
		signal?: AbortSignal
	): Promise<Response> {
		const headers = new Headers(init.headers);
		headers.set('Authorization', `Bearer ${config.apiKey}`);
		return fetchImpl(`${config.baseUrl}${path}`, {
			...init,
			headers,
			signal
		});
	}

	return {
		async testConnection(config, signal) {
			const timeout = AbortSignal.timeout(CONNECTION_TEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;

			try {
				const response = await authorizedFetch(
					config,
					'/api/janus/health',
					{ method: 'GET' },
					combined
				);
				const data = await parseJson(response);
				if (!response.ok) {
					return { ok: false, reason: errorMessageFromBody(data, response.status) };
				}
				const health = janusHealthResultSchema.safeParse(data);
				if (!health.success) {
					return { ok: false, reason: 'Unexpected health response from JanusLink.' };
				}
				return { ok: true, device: health.data.device };
			} catch {
				return { ok: false, reason: reachabilityReason(config.baseUrl) };
			}
		},

		async generate(config, body, signal) {
			const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;

			let response: Response;
			try {
				response = await authorizedFetch(
					config,
					'/api/janus/generate',
					{
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ prompt: body.prompt, seed: body.seed })
					},
					combined
				);
			} catch {
				throw new Error(reachabilityReason(config.baseUrl));
			}

			const data = await parseJson(response);
			if (!response.ok) {
				throw new Error(errorMessageFromBody(data, response.status));
			}
			const parsed = janusGenerateResultSchema.safeParse(data);
			if (!parsed.success) {
				throw new Error('Unexpected generate response from JanusLink.');
			}
			return parsed.data;
		},

		async understand(config, body, signal) {
			const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;

			const form = new FormData();
			form.append('image', body.image, body.filename ?? 'artwork.png');
			form.append('question', body.question);

			let response: Response;
			try {
				response = await authorizedFetch(
					config,
					'/api/janus/understand',
					{ method: 'POST', body: form },
					combined
				);
			} catch {
				throw new Error(reachabilityReason(config.baseUrl));
			}

			const data = await parseJson(response);
			if (!response.ok) {
				throw new Error(errorMessageFromBody(data, response.status));
			}
			const parsed = janusUnderstandResultSchema.safeParse(data);
			if (!parsed.success) {
				throw new Error('Unexpected understand response from JanusLink.');
			}
			return parsed.data;
		}
	};
}
