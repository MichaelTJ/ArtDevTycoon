import { describe, expect, it } from 'vitest';
import { getRemoteProviderClient } from './index';

describe('getRemoteProviderClient', () => {
	it('returns clients for local Spec 08 providers', () => {
		expect(getRemoteProviderClient('januslink').generate).toBeTypeOf('function');
		expect(getRemoteProviderClient('ollama').generate).toBeTypeOf('function');
		expect(getRemoteProviderClient('lmstudio').generate).toBeTypeOf('function');
		expect(getRemoteProviderClient('automatic1111').generate).toBeTypeOf('function');
	});

	it('returns clients for Spec 09 cloud providers', () => {
		expect(getRemoteProviderClient('openrouter').generate).toBeTypeOf('function');
		expect(getRemoteProviderClient('openai').generate).toBeTypeOf('function');
		expect(getRemoteProviderClient('openrouter').listModels).toBeTypeOf('function');
		expect(getRemoteProviderClient('openai').listModels).toBeTypeOf('function');
	});

	it('throws on unknown provider', () => {
		expect(() => getRemoteProviderClient('comfyui')).toThrow(/Unknown remote provider: comfyui/);
	});
});
