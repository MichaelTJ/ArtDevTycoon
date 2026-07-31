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

function isCloudConfig(
	config: RemoteEngineConfig
): config is Extract<RemoteEngineConfig, { provider: 'openrouter' | 'openai' }> {
	return config.provider === 'openrouter' || config.provider === 'openai';
}

function redactKey(message: string, apiKey: string): string {
	if (apiKey.length === 0) {
		return message;
	}
	return message.replaceAll(apiKey, '***');
}

function safeErrorMessage(data: unknown, status: number, apiKey: string): string {
	if (status === 401 || status === 403) {
		return 'Authentication failed (401). Check your API key.';
	}
	return redactKey(errorMessageFromBody(data, status), apiKey);
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

export interface OpenAiCompatOptions {
	extraHeaders?: Record<string, string>;
	reachabilityHint: string;
	deviceLabel: string;
	fetch?: typeof fetch;
}

/** Shared OpenAI-compatible HTTP client for OpenRouter and OpenAI. */
export function createOpenAiCompatClient(options: OpenAiCompatOptions): RemoteProviderClient {
	const fetchImpl = options.fetch ?? fetch;

	function headers(config: RemoteEngineConfig): Headers {
		const h = new Headers({
			Authorization: `Bearer ${config.apiKey}`,
			'content-type': 'application/json'
		});
		if (options.extraHeaders) {
			for (const [key, value] of Object.entries(options.extraHeaders)) {
				h.set(key, value);
			}
		}
		return h;
	}

	async function listModels(config: RemoteEngineConfig, signal?: AbortSignal): Promise<string[]> {
		const response = await fetchImpl(`${config.baseUrl}/models`, {
			method: 'GET',
			headers: headers(config),
			signal
		});
		const data = await parseJson(response);
		if (!response.ok) {
			throw new Error(safeErrorMessage(data, response.status, config.apiKey));
		}
		const parsed = modelsSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error('Unexpected model list from cloud provider.');
		}
		return parsed.data.data.map((m) => m.id).sort((a, b) => a.localeCompare(b));
	}

	return {
		async testConnection(config, signal) {
			const timeout = AbortSignal.timeout(CONNECTION_TEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;
			try {
				await listModels(config, combined);
				return { ok: true, device: options.deviceLabel };
			} catch (error) {
				const message =
					error instanceof Error
						? redactKey(error.message, config.apiKey)
						: options.reachabilityHint;
				if (message.includes('Authentication failed')) {
					return { ok: false, reason: message };
				}
				return {
					ok: false,
					reason: reachabilityReason(config.baseUrl, options.reachabilityHint)
				};
			}
		},

		listModels,

		async generate(config, body, signal) {
			if (!isCloudConfig(config)) {
				throw new Error('OpenAI-compat client requires openrouter or openai provider');
			}
			const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;

			let response: Response;
			try {
				response = await fetchImpl(`${config.baseUrl}/images/generations`, {
					method: 'POST',
					headers: headers(config),
					body: JSON.stringify({
						model: config.generateModel,
						prompt: body.prompt,
						n: 1,
						size: '1024x1024',
						response_format: 'b64_json'
					}),
					signal: combined
				});
			} catch {
				throw new Error(reachabilityReason(config.baseUrl, options.reachabilityHint));
			}

			const data = await parseJson(response);
			if (response.status === 404) {
				throw new Error(
					'This model does not support image generation via /images/generations. Pick an image model.'
				);
			}
			if (!response.ok) {
				throw new Error(safeErrorMessage(data, response.status, config.apiKey));
			}
			const parsed = imagesSchema.safeParse(data);
			if (!parsed.success) {
				throw new Error('Unexpected image response from cloud provider.');
			}

			const first = parsed.data.data[0]!;
			if (first.b64_json) {
				return { images: [{ mimeType: 'image/png', base64: first.b64_json }] };
			}
			if (first.url) {
				const imgRes = await fetchImpl(first.url, { signal: combined });
				if (!imgRes.ok) {
					throw new Error('Failed to download generated image from cloud provider.');
				}
				const blob = await imgRes.blob();
				return {
					images: [
						{
							mimeType: blob.type || 'image/png',
							base64: await blobToRawBase64(blob)
						}
					]
				};
			}
			throw new Error('Image API returned no image data.');
		},

		async understand(config, body, signal) {
			if (!isCloudConfig(config)) {
				throw new Error('OpenAI-compat client requires openrouter or openai provider');
			}
			const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;
			const dataUrl = await blobToDataUrl(body.image);

			let response: Response;
			try {
				response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
					method: 'POST',
					headers: headers(config),
					body: JSON.stringify({
						model: config.critiqueModel,
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
				throw new Error(reachabilityReason(config.baseUrl, options.reachabilityHint));
			}

			const data = await parseJson(response);
			if (!response.ok) {
				throw new Error(safeErrorMessage(data, response.status, config.apiKey));
			}
			const parsed = chatSchema.safeParse(data);
			if (!parsed.success) {
				throw new Error('Unexpected chat response from cloud provider.');
			}
			return { text: extractChatContent(parsed.data.choices[0]!.message.content) };
		}
	};
}
