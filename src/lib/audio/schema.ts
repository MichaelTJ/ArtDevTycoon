import { z } from 'zod';

/** Device preference blob — not career progress. Cleared saves must not reset mute. */
export const AUDIO_STORAGE_KEY = 'adt.audio.v1';

/** Clamp helper used by schema transforms and slider writes. */
export function clamp01(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.min(1, Math.max(0, n));
}

export const audioPrefsSchema = z.object({
	version: z.literal(1),
	/** Master fader 0–1. */
	masterVolume: z.number().transform(clamp01).pipe(z.number().min(0).max(1)),
	/** Music bus 0–1. Default OFF so first visits stay quiet. */
	musicVolume: z.number().transform(clamp01).pipe(z.number().min(0).max(1)),
	/** SFX bus 0–1. */
	sfxVolume: z.number().transform(clamp01).pipe(z.number().min(0).max(1)),
	/** Hard mute — ignores bus faders until cleared. */
	muted: z.boolean()
});

export type AudioPrefs = z.infer<typeof audioPrefsSchema>;

export function createDefaultAudioPrefs(): AudioPrefs {
	return {
		version: 1,
		masterVolume: 1,
		musicVolume: 0, // default music OFF
		sfxVolume: 0.65,
		muted: false
	};
}

/**
 * Reads `adt.audio.v1`. Missing / malformed / throws → defaults.
 * Never throws into the game loop.
 */
export function loadAudioPrefs(): AudioPrefs {
	try {
		if (typeof localStorage === 'undefined') {
			return createDefaultAudioPrefs();
		}
		const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
		if (raw === null) return createDefaultAudioPrefs();
		const parsed: unknown = JSON.parse(raw);
		const result = audioPrefsSchema.safeParse(parsed);
		return result.success ? result.data : createDefaultAudioPrefs();
	} catch {
		return createDefaultAudioPrefs();
	}
}

/** Writes prefs. Swallows quota / private-mode errors. Never throws. */
export function persistAudioPrefs(prefs: AudioPrefs): void {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(prefs));
	} catch {
		// Storage full or unavailable — same swallow policy as save.ts.
	}
}
