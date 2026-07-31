import { z } from 'zod';
import type { RemoteEngineConfig } from '../remoteConfig';
import { errorMessageFromBody, parseJson, reachabilityReason } from './http';
import { createLmStudioClient } from './lmStudioClient';
import { createOllamaClient } from './ollamaClient';
import { CONNECTION_TEST_TIMEOUT_MS, REQUEST_TIMEOUT_MS, type RemoteProviderClient } from './types';

const sdModelsSchema = z.array(
	z.object({
		title: z.string().optional(),
		model_name: z.string().optional()
	})
);

const txt2imgSchema = z.object({
	images: z.array(z.string().min(1)).min(1)
});

function isA1111Config(
	config: RemoteEngineConfig
): config is Extract<RemoteEngineConfig, { provider: 'automatic1111' }> {
	return config.provider === 'automatic1111';
}

function critiqueConfigFor(
	config: Extract<RemoteEngineConfig, { provider: 'automatic1111' }>
): RemoteEngineConfig {
	if (config.critiqueProvider === 'ollama') {
		return {
			provider: 'ollama',
			baseUrl: config.critiqueBaseUrl,
			apiKey: '',
			generateModel: config.critiqueModel,
			critiqueModel: config.critiqueModel
		};
	}
	return {
		provider: 'lmstudio',
		baseUrl: config.critiqueBaseUrl,
		apiKey: '',
		generateModel: config.critiqueModel,
		critiqueModel: config.critiqueModel
	};
}

export interface A1111ClientDeps {
	fetch?: typeof fetch;
	ollama?: RemoteProviderClient;
	lmstudio?: RemoteProviderClient;
}

/** Automatic1111 txt2img + paired Ollama/LM Studio critique. */
export function createA1111Client(deps: A1111ClientDeps = {}): RemoteProviderClient {
	const fetchImpl = deps.fetch ?? fetch;
	const ollama = deps.ollama ?? createOllamaClient({ fetch: fetchImpl });
	const lmstudio = deps.lmstudio ?? createLmStudioClient({ fetch: fetchImpl });

	function critiqueClient(provider: 'ollama' | 'lmstudio'): RemoteProviderClient {
		return provider === 'ollama' ? ollama : lmstudio;
	}

	async function listModels(config: RemoteEngineConfig, signal?: AbortSignal): Promise<string[]> {
		const response = await fetchImpl(`${config.baseUrl}/sdapi/v1/sd-models`, {
			method: 'GET',
			signal
		});
		const data = await parseJson(response);
		if (!response.ok) {
			throw new Error(errorMessageFromBody(data, response.status));
		}
		const parsed = sdModelsSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error('Unexpected model list from Automatic1111.');
		}
		return parsed.data.map((m) => m.title ?? m.model_name ?? '').filter((name) => name.length > 0);
	}

	return {
		async testConnection(config, signal) {
			if (!isA1111Config(config)) {
				return { ok: false, reason: 'Automatic1111 client requires provider automatic1111' };
			}
			const timeout = AbortSignal.timeout(CONNECTION_TEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;
			try {
				await listModels(config, combined);
			} catch {
				return {
					ok: false,
					reason: reachabilityReason(
						config.baseUrl,
						'Is Automatic1111 running with --api and CORS enabled?'
					)
				};
			}

			const critique = await critiqueClient(config.critiqueProvider).testConnection(
				critiqueConfigFor(config),
				signal
			);
			if (!critique.ok) {
				return critique;
			}
			return { ok: true, device: 'automatic1111' };
		},

		listModels,

		async generate(config, body, signal) {
			if (!isA1111Config(config)) {
				throw new Error('Automatic1111 client requires provider automatic1111');
			}
			const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
			const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;

			const payload: Record<string, unknown> = {
				prompt: body.prompt,
				steps: 20,
				width: 512,
				height: 512,
				seed: body.seed ?? -1
			};
			if (config.generateModel.trim().length > 0) {
				payload.override_settings = { sd_model_checkpoint: config.generateModel };
			}

			let response: Response;
			try {
				response = await fetchImpl(`${config.baseUrl}/sdapi/v1/txt2img`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload),
					signal: combined
				});
			} catch {
				throw new Error(
					reachabilityReason(
						config.baseUrl,
						'Is Automatic1111 running with --api and CORS enabled?'
					)
				);
			}

			const data = await parseJson(response);
			if (!response.ok) {
				throw new Error(errorMessageFromBody(data, response.status));
			}
			const parsed = txt2imgSchema.safeParse(data);
			if (!parsed.success) {
				throw new Error('Unexpected txt2img response from Automatic1111.');
			}
			return {
				images: [{ mimeType: 'image/png', base64: parsed.data.images[0]! }]
			};
		},

		async understand(config, body, signal) {
			if (!isA1111Config(config)) {
				throw new Error('Automatic1111 client requires provider automatic1111');
			}
			return critiqueClient(config.critiqueProvider).understand(
				critiqueConfigFor(config),
				body,
				signal
			);
		}
	};
}
