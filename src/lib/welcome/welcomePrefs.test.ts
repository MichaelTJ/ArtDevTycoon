import { beforeEach, describe, expect, test, vi } from 'vitest';
import { loadWelcomeDismissed, persistWelcomeDismissed, WELCOME_STORAGE_KEY } from './welcomePrefs';

function createMemoryStorage() {
	const map = new Map<string, string>();
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => {
			map.set(key, value);
		},
		removeItem: (key: string) => {
			map.delete(key);
		},
		clear: () => {
			map.clear();
		}
	};
}

beforeEach(() => {
	vi.stubGlobal('localStorage', createMemoryStorage());
});

describe('loadWelcomeDismissed', () => {
	test('empty storage is not dismissed', () => {
		expect(loadWelcomeDismissed()).toBe(false);
	});

	test('malformed JSON is not dismissed', () => {
		localStorage.setItem(WELCOME_STORAGE_KEY, '{nope');
		expect(loadWelcomeDismissed()).toBe(false);
	});

	test('dismissed false stays false', () => {
		localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify({ version: 1, dismissed: false }));
		expect(loadWelcomeDismissed()).toBe(false);
	});
});

describe('persistWelcomeDismissed', () => {
	test('round-trips dismissed true', () => {
		persistWelcomeDismissed();
		expect(loadWelcomeDismissed()).toBe(true);
		expect(JSON.parse(localStorage.getItem(WELCOME_STORAGE_KEY) ?? '{}')).toEqual({
			version: 1,
			dismissed: true
		});
	});
});
