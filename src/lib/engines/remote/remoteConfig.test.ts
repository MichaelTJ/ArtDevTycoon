import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearRemoteConfig,
	defaultBaseUrlForProvider,
	loadRemoteConfig,
	REMOTE_CONFIG_STORAGE_KEY,
	saveRemoteConfig
} from './remoteConfig';

const store = new Map<string, string>();

beforeEach(() => {
	store.clear();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		clear: () => {
			store.clear();
		}
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('remoteConfig', () => {
	it('round-trips januslink and strips trailing slashes', () => {
		saveRemoteConfig({
			provider: 'januslink',
			baseUrl: 'https://pc.tailnet-xxxx.ts.net/',
			apiKey: 'a'.repeat(32)
		});

		expect(loadRemoteConfig()).toEqual({
			provider: 'januslink',
			baseUrl: 'https://pc.tailnet-xxxx.ts.net',
			apiKey: 'a'.repeat(32)
		});
		expect(store.get(REMOTE_CONFIG_STORAGE_KEY)).toContain('tailnet');
	});

	it('migrates legacy baseUrl+apiKey to januslink', () => {
		store.set(
			REMOTE_CONFIG_STORAGE_KEY,
			JSON.stringify({
				baseUrl: 'https://pc.tailnet-xxxx.ts.net',
				apiKey: 'a'.repeat(32)
			})
		);
		expect(loadRemoteConfig()).toEqual({
			provider: 'januslink',
			baseUrl: 'https://pc.tailnet-xxxx.ts.net',
			apiKey: 'a'.repeat(32)
		});
	});

	it('round-trips ollama with both models', () => {
		saveRemoteConfig({
			provider: 'ollama',
			baseUrl: 'http://localhost:11434/',
			apiKey: '',
			generateModel: 'flux',
			critiqueModel: 'llava'
		});
		expect(loadRemoteConfig()).toEqual({
			provider: 'ollama',
			baseUrl: 'http://localhost:11434',
			apiKey: '',
			generateModel: 'flux',
			critiqueModel: 'llava'
		});
	});

	it('returns null when ollama is missing critiqueModel', () => {
		store.set(
			REMOTE_CONFIG_STORAGE_KEY,
			JSON.stringify({
				provider: 'ollama',
				baseUrl: 'http://localhost:11434',
				generateModel: 'flux'
			})
		);
		expect(loadRemoteConfig()).toBeNull();
	});

	it('save throws when ollama is missing critiqueModel', () => {
		expect(() =>
			saveRemoteConfig({
				provider: 'ollama',
				baseUrl: 'http://localhost:11434',
				apiKey: '',
				generateModel: 'flux',
				critiqueModel: ''
			} as never)
		).toThrow();
	});

	it('returns null for malformed storage', () => {
		store.set(REMOTE_CONFIG_STORAGE_KEY, '{not-json');
		expect(loadRemoteConfig()).toBeNull();
	});

	it('returns null when januslink apiKey is too short', () => {
		store.set(
			REMOTE_CONFIG_STORAGE_KEY,
			JSON.stringify({
				provider: 'januslink',
				baseUrl: 'https://pc.example.ts.net',
				apiKey: 'short'
			})
		);
		expect(loadRemoteConfig()).toBeNull();
	});

	it('clearRemoteConfig removes the key', () => {
		saveRemoteConfig({
			provider: 'januslink',
			baseUrl: 'https://pc.tailnet-xxxx.ts.net',
			apiKey: 'b'.repeat(32)
		});
		clearRemoteConfig();
		expect(loadRemoteConfig()).toBeNull();
	});

	it('defaultBaseUrlForProvider returns local defaults', () => {
		expect(defaultBaseUrlForProvider('ollama')).toBe('http://localhost:11434');
		expect(defaultBaseUrlForProvider('lmstudio')).toBe('http://localhost:1234');
		expect(defaultBaseUrlForProvider('automatic1111')).toBe('http://127.0.0.1:7860');
		expect(defaultBaseUrlForProvider('januslink')).toBe('');
		expect(defaultBaseUrlForProvider('openrouter')).toBe('https://openrouter.ai/api/v1');
		expect(defaultBaseUrlForProvider('openai')).toBe('https://api.openai.com/v1');
	});

	it('round-trips openrouter config', () => {
		saveRemoteConfig({
			provider: 'openrouter',
			baseUrl: 'https://openrouter.ai/api/v1/',
			apiKey: 'test-key-not-real-00000000',
			generateModel: 'flux',
			critiqueModel: 'gpt-4o'
		});
		expect(loadRemoteConfig()).toEqual({
			provider: 'openrouter',
			baseUrl: 'https://openrouter.ai/api/v1',
			apiKey: 'test-key-not-real-00000000',
			generateModel: 'flux',
			critiqueModel: 'gpt-4o'
		});
	});

	it('returns null when openai apiKey is missing', () => {
		store.set(
			REMOTE_CONFIG_STORAGE_KEY,
			JSON.stringify({
				provider: 'openai',
				baseUrl: 'https://api.openai.com/v1',
				generateModel: 'dall-e-3',
				critiqueModel: 'gpt-4o'
			})
		);
		expect(loadRemoteConfig()).toBeNull();
	});

	it('returns null when openai apiKey is too short', () => {
		store.set(
			REMOTE_CONFIG_STORAGE_KEY,
			JSON.stringify({
				provider: 'openai',
				baseUrl: 'https://api.openai.com/v1',
				apiKey: 'short',
				generateModel: 'dall-e-3',
				critiqueModel: 'gpt-4o'
			})
		);
		expect(loadRemoteConfig()).toBeNull();
	});

	it('save throws when cloud apiKey length is 7', () => {
		expect(() =>
			saveRemoteConfig({
				provider: 'openrouter',
				baseUrl: 'https://openrouter.ai/api/v1',
				apiKey: '1234567',
				generateModel: 'flux',
				critiqueModel: 'gpt-4o'
			})
		).toThrow();
	});
});
