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
	});
});
