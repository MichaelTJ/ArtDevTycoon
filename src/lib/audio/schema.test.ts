import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	AUDIO_STORAGE_KEY,
	audioPrefsSchema,
	createDefaultAudioPrefs,
	loadAudioPrefs,
	persistAudioPrefs
} from './schema';

function createMemoryStorage(throwsOnGet = false, throwsOnSet = false) {
	const map = new Map<string, string>();
	return {
		getItem: (key: string) => {
			if (throwsOnGet) throw new Error('getItem unavailable');
			return map.get(key) ?? null;
		},
		setItem: (key: string, value: string) => {
			if (throwsOnSet) throw new Error('setItem unavailable');
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

describe('createDefaultAudioPrefs', () => {
	test('musicVolume defaults to 0', () => {
		expect(createDefaultAudioPrefs().musicVolume).toBe(0);
	});

	test('sfxVolume defaults to 0.65', () => {
		expect(createDefaultAudioPrefs().sfxVolume).toBe(0.65);
	});

	test('muted defaults to false', () => {
		expect(createDefaultAudioPrefs().muted).toBe(false);
	});
});

describe('audioPrefsSchema', () => {
	const base = {
		version: 1 as const,
		masterVolume: 1,
		musicVolume: 0.5,
		sfxVolume: 0.5,
		muted: false
	};

	test('clamps musicVolume 2 → 1', () => {
		expect(audioPrefsSchema.parse({ ...base, musicVolume: 2 }).musicVolume).toBe(1);
	});

	test('clamps sfxVolume -1 → 0', () => {
		expect(audioPrefsSchema.parse({ ...base, sfxVolume: -1 }).sfxVolume).toBe(0);
	});
});

describe('loadAudioPrefs / persistAudioPrefs', () => {
	test('missing key returns defaults', () => {
		expect(loadAudioPrefs()).toEqual(createDefaultAudioPrefs());
	});

	test('malformed JSON returns defaults', () => {
		localStorage.setItem(AUDIO_STORAGE_KEY, '{not json');
		expect(loadAudioPrefs()).toEqual(createDefaultAudioPrefs());
	});

	test('valid blob round-trips', () => {
		const prefs = {
			version: 1 as const,
			masterVolume: 0.8,
			musicVolume: 0.4,
			sfxVolume: 0.5,
			muted: true
		};
		persistAudioPrefs(prefs);
		expect(loadAudioPrefs()).toEqual(prefs);
	});

	test('setItem throw is swallowed', () => {
		vi.stubGlobal('localStorage', createMemoryStorage(false, true));
		expect(() => persistAudioPrefs(createDefaultAudioPrefs())).not.toThrow();
	});

	test('getItem throw returns defaults', () => {
		vi.stubGlobal('localStorage', createMemoryStorage(true, false));
		expect(loadAudioPrefs()).toEqual(createDefaultAudioPrefs());
	});
});
