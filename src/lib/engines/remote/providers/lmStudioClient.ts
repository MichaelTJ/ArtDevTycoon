import { z } from 'zod';
import type { RemoteEngineConfig } from '../remoteConfig';
import {
	blobToDataUrl,
	blobToRawBase64,
	errorMessageFromBody,
	parseJson,
	reachabilityReason
} from './http';
import { CONNECTION_TEST_TIMEOUT_MS, REQUEST_TIMEOUT_MS, type RemoteProviderClient } from './types';

const modelsSchema = z.object({
	data: z.array(z.object({ id: z.string().min(1) })).default([])
});

const imagesSchema = z.object({
	data: z
		.array(
			z.object({
				b64_json: z.string().min(1).optional(),
				url: z.string().url().optional()
			})
		)
		.min(1)
});

const chatSchema = z.object({
	choices: z
		.array(
			z.object({
				message: z.object({
					content: z.union([
						z.string(),
						z.array(
							z.object({
								type: z.string().optional(),
								text: z.string().optional()
							})
						)
					])
				})
			})
		)
		.min(1)
});

function isLmStudioConfig(
	config: RemoteEngineConfig
): config is Extract<RemoteEngineConfig, { provider: 'lmstudio' }> {
	return config.provider === 'lmstudio';
}

function extractChatContent(
	content: z.infer<typeof chatSchema>['choices'][0]['message']['content']
): string {
	if (typeof content === 'string') {
		return content;
	}
	return content
		.map((part) => part.text ?? '')
		.filter((t) => t.length > 0)
		.join(' ');
}

export interface LmStudioClientDeps {
	fetch?: typeof fetch;
}

/** LM Studio OpenAI-compatible local server client. */
export function createLmStudioClient(deps: LmStudioClientDeps = {}): RemoteProviderClient {
	const fetchImpl = deps.fetch ?? fetch;

	function authHeaders(config: RemoteEngineConfig): HeadersInit {
		const headers: Record<string, string> = {};
		if (config.apiKey.trim().length > 0) {
			headers.Authorization = `Bearer ${config.apiKey}`;
		}
		return headers;
	}

	async function listModels(config: RemoteEngineConfig, signal?: AbortSignal): Promise<string[]> {
		const response = await fetchImpl(`${config.baseUrl}/v1/models`, {
			method: 'GET',
			headers: authHeaders(config),
			signal
		});
		const data = await parseJson(response);
		if (!response.ok) {
			throw new Error(errorMessageFromBody(data, response.status));
		}
		const parsed = modelsSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error('Unexpected model list from LM Studio.');
		}
		return parsed.data.data.map((m) => m.id);
	}

	return {
		async testConnection(config, signal) {
			const timeout = AbortSignal.timeout(CONNECTION_TEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;
			try {
				await listModels(config, combined);
				return { ok: true, device: 'lmstudio' };
			} catch {
				return {
					ok: false,
					reason: reachabilityReason(
						config.baseUrl,
						'Is LM Studio running with a local server and CORS enabled?'
					)
				};
			}
		},

		listModels,

		async generate(config, body, signal) {
			if (!isLmStudioConfig(config)) {
				throw new Error('LM Studio client requires provider lmstudio');
			}
			const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;

			let response: Response;
			try {
				response = await fetchImpl(`${config.baseUrl}/v1/images/generations`, {
					method: 'POST',
					headers: {
						...authHeaders(config),
						'content-type': 'application/json'
					},
					body: JSON.stringify({
						model: config.generateModel,
						prompt: body.prompt,
						n: 1,
						size: '512x512',
						response_format: 'b64_json'
					}),
					signal: combined
				});
			} catch {
				throw new Error(
					reachabilityReason(
						config.baseUrl,
						'Is LM Studio running with a local server and CORS enabled?'
					)
				);
			}

			const data = await parseJson(response);
			if (!response.ok) {
				throw new Error(errorMessageFromBody(data, response.status));
			}
			const parsed = imagesSchema.safeParse(data);
			if (!parsed.success) {
				throw new Error('Unexpected image response from LM Studio.');
			}

			const first = parsed.data.data[0]!;
			if (first.b64_json) {
				return { images: [{ mimeType: 'image/png', base64: first.b64_json }] };
			}
			if (first.url) {
				const imgRes = await fetchImpl(first.url, { signal: combined });
				if (!imgRes.ok) {
					throw new Error('Failed to download generated image from LM Studio.');
				}
				const blob = await imgRes.blob();
				const base64 = await blobToRawBase64(blob);
				return {
					images: [
						{
							mimeType: blob.type || 'image/png',
							base64
						}
					]
				};
			}
			throw new Error('LM Studio returned no image data.');
		},

		async understand(config, body, signal) {
			const critiqueModel =
				config.provider === 'lmstudio'
					? config.critiqueModel
					: 'critiqueModel' in config && typeof config.critiqueModel === 'string'
						? config.critiqueModel
						: '';
			if (critiqueModel.length === 0) {
				throw new Error('LM Studio critique requires a critiqueModel.');
			}

			const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;
			const dataUrl = await blobToDataUrl(body.image);

			let response: Response;
			try {
				response = await fetchImpl(`${config.baseUrl}/v1/chat/completions`, {
					method: 'POST',
					headers: {
						...authHeaders(config),
						'content-type': 'application/json'
					},
					body: JSON.stringify({
						model: critiqueModel,
						messages: [
							{
								role: 'user',
								content: [
									{ type: 'text', text: body.question },
									{ type: 'image_url', image_url: { url: dataUrl } }
								]
							}
						]
					}),
					signal: combined
				});
			} catch {
				throw new Error(
					reachabilityReason(
						config.baseUrl,
						'Is LM Studio running with a local server and CORS enabled?'
					)
				);
			}

			const data = await parseJson(response);
			if (!response.ok) {
				throw new Error(errorMessageFromBody(data, response.status));
			}
			const parsed = chatSchema.safeParse(data);
			if (!parsed.success) {
				throw new Error('Unexpected chat response from LM Studio.');
			}
			return { text: extractChatContent(parsed.data.choices[0]!.message.content) };
		}
	};
}
