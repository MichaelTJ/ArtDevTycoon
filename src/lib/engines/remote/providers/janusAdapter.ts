import { createJanusLinkClient, type JanusLinkClient } from '../janusLinkClient';
import type { RemoteEngineConfig } from '../remoteConfig';
import type { RemoteProviderClient } from './types';

function assertJanuslink(
	config: RemoteEngineConfig
): asserts config is Extract<RemoteEngineConfig, { provider: 'januslink' }> {
	if (config.provider !== 'januslink') {
		throw new Error('JanusLink client requires provider januslink');
	}
}

/** Adapt the existing JanusLink HTTP client to {@link RemoteProviderClient}. */
export function createJanusAdapter(deps?: { client?: JanusLinkClient }): RemoteProviderClient {
	const client = deps?.client ?? createJanusLinkClient();

	return {
		async testConnection(config, signal) {
			assertJanuslink(config);
			return client.testConnection(config, signal);
		},

		async listModels() {
			return [];
		},

		async generate(config, body, signal) {
			assertJanuslink(config);
			const result = await client.generate(config, body, signal);
			return {
				images: result.images.map((img) => ({
					mimeType: img.mimeType,
					base64: img.base64
				}))
			};
		},

		async understand(config, body, signal) {
			assertJanuslink(config);
			const result = await client.understand(config, body, signal);
			return { text: result.text };
		}
	};
}
