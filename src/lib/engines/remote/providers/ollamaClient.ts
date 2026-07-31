import { z } from 'zod';
import type { RemoteEngineConfig } from '../remoteConfig';
import { blobToRawBase64, errorMessageFromBody, parseJson, reachabilityReason } from './http';
import { CONNECTION_TEST_TIMEOUT_MS, REQUEST_TIMEOUT_MS, type RemoteProviderClient } from './types';

const tagsSchema = z.object({
	models: z.array(z.object({ name: z.string().min(1) })).default([])
});

const generateSchema = z.object({
	response: z.string().optional(),
	images: z.array(z.string().min(1)).optional()
});

const chatSchema = z.object({
	message: z.object({
		content: z.string()
	})
});

function isOllamaConfig(
	config: RemoteEngineConfig
): config is Extract<RemoteEngineConfig, { provider: 'ollama' }> {
	return config.provider === 'ollama';
}

function looksLikeBase64Image(value: string): boolean {
	const trimmed = value.replace(/\s+/g, '');
	return trimmed.length > 256 && /^[A-Za-z0-9+/=]+$/.test(trimmed);
}

export interface OllamaClientDeps {
	fetch?: typeof fetch;
}

/** Ollama local HTTP client — image generate via /api/generate, vision via /api/chat. */
export function createOllamaClient(deps: OllamaClientDeps = {}): RemoteProviderClient {
	const fetchImpl = deps.fetch ?? fetch;

	function authHeaders(config: RemoteEngineConfig): HeadersInit {
		const headers: Record<string, string> = {};
		if (config.apiKey.trim().length > 0) {
			headers.Authorization = `Bearer ${config.apiKey}`;
		}
		return headers;
	}

	async function listModels(config: RemoteEngineConfig, signal?: AbortSignal): Promise<string[]> {
		const response = await fetchImpl(`${config.baseUrl}/api/tags`, {
			method: 'GET',
			headers: authHeaders(config),
			signal
		});
		const data = await parseJson(response);
		if (!response.ok) {
			throw new Error(errorMessageFromBody(data, response.status));
		}
		const parsed = tagsSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error('Unexpected model list from Ollama.');
		}
		return parsed.data.models.map((m) => m.name);
	}

	return {
		async testConnection(config, signal) {
			const timeout = AbortSignal.timeout(CONNECTION_TEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;
			try {
				await listModels(config, combined);
				return { ok: true, device: 'ollama' };
			} catch {
				return {
					ok: false,
					reason: reachabilityReason(
						config.baseUrl,
						'Is Ollama running? Enable CORS (OLLAMA_ORIGINS) for this game origin.'
					)
				};
			}
		},

		listModels,

		async generate(config, body, signal) {
			if (!isOllamaConfig(config)) {
				throw new Error('Ollama client requires provider ollama');
			}
			const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;

			const payload: Record<string, unknown> = {
				model: config.generateModel,
				prompt: body.prompt,
				stream: false
			};
			if (body.seed !== undefined) {
				payload.options = { seed: body.seed };
			}

			let response: Response;
			try {
				response = await fetchImpl(`${config.baseUrl}/api/generate`, {
					method: 'POST',
					headers: {
						...authHeaders(config),
						'content-type': 'application/json'
					},
					body: JSON.stringify(payload),
					signal: combined
				});
			} catch {
				throw new Error(
					reachabilityReason(
						config.baseUrl,
						'Is Ollama running? Enable CORS (OLLAMA_ORIGINS) for this game origin.'
					)
				);
			}

			const data = await parseJson(response);
			if (!response.ok) {
				throw new Error(errorMessageFromBody(data, response.status));
			}
			const parsed = generateSchema.safeParse(data);
			if (!parsed.success) {
				throw new Error('Unexpected generate response from Ollama.');
			}

			const fromImages = parsed.data.images?.[0];
			if (fromImages) {
				return { images: [{ mimeType: 'image/png', base64: fromImages }] };
			}
			const fromResponse = parsed.data.response;
			if (fromResponse && looksLikeBase64Image(fromResponse)) {
				return {
					images: [{ mimeType: 'image/png', base64: fromResponse.replace(/\s+/g, '') }]
				};
			}
			throw new Error(
				'Ollama model did not return an image. Pick an image-capable generate model.'
			);
		},

		async understand(config, body, signal) {
			const critiqueModel =
				config.provider === 'ollama'
					? config.critiqueModel
					: 'critiqueModel' in config
						? String((config as { critiqueModel?: string }).critiqueModel ?? '')
						: '';
			if (critiqueModel.length === 0) {
				throw new Error('Ollama critique requires a critiqueModel.');
			}

			const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;
			const images = [await blobToRawBase64(body.image)];

			let response: Response;
			try {
				response = await fetchImpl(`${config.baseUrl}/api/chat`, {
					method: 'POST',
					headers: {
						...authHeaders(config),
						'content-type': 'application/json'
					},
					body: JSON.stringify({
						model: critiqueModel,
						stream: false,
						messages: [
							{
								role: 'user',
								content: body.question,
								images
							}
						]
					}),
					signal: combined
				});
			} catch {
				throw new Error(
					reachabilityReason(
						config.baseUrl,
						'Is Ollama running? Enable CORS (OLLAMA_ORIGINS) for this game origin.'
					)
				);
			}

			const data = await parseJson(response);
			if (!response.ok) {
				throw new Error(errorMessageFromBody(data, response.status));
			}
			const parsed = chatSchema.safeParse(data);
			if (!parsed.success) {
				throw new Error('Unexpected chat response from Ollama.');
			}
			return { text: parsed.data.message.content };
		}
	};
}
