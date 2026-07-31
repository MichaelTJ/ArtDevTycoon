import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearRemoteConfig,
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
	it('round-trips a valid config and strips trailing slashes', () => {
		saveRemoteConfig({
			baseUrl: 'https://pc.tailnet-xxxx.ts.net/',
			apiKey: 'a'.repeat(32)
		});

		expect(loadRemoteConfig()).toEqual({
			baseUrl: 'https://pc.tailnet-xxxx.ts.net',
			apiKey: 'a'.repeat(32)
		});
		expect(store.get(REMOTE_CONFIG_STORAGE_KEY)).toContain('tailnet');
	});

	it('returns null for malformed storage', () => {
		store.set(REMOTE_CONFIG_STORAGE_KEY, '{not-json');
		expect(loadRemoteConfig()).toBeNull();
	});

	it('returns null when apiKey is too short', () => {
		store.set(
			REMOTE_CONFIG_STORAGE_KEY,
			JSON.stringify({ baseUrl: 'https://pc.example.ts.net', apiKey: 'short' })
		);
		expect(loadRemoteConfig()).toBeNull();
	});

	it('clearRemoteConfig removes the key', () => {
		saveRemoteConfig({
			baseUrl: 'https://pc.tailnet-xxxx.ts.net',
			apiKey: 'b'.repeat(32)
		});
		clearRemoteConfig();
		expect(loadRemoteConfig()).toBeNull();
	});
});
