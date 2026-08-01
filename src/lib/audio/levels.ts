import { skillProgress, SKILL_IDS, type SkillId, type SkillXpMap } from '$lib/game/skills';
import type { SkillGainPreview } from '$lib/game/skills';
import { clamp01, type AudioPrefs } from './schema';

export function effectiveMusicGain(prefs: AudioPrefs): number {
	if (prefs.muted) return 0;
	return clamp01(prefs.masterVolume * prefs.musicVolume);
}

export function effectiveSfxGain(prefs: AudioPrefs): number {
	if (prefs.muted) return 0;
	return clamp01(prefs.masterVolume * prefs.sfxVolume);
}

/** True when master is not muted and masterVolume > 0. For future StudioSnapshot sync. */
export function isAudioEnabled(prefs: AudioPrefs): boolean {
	return !prefs.muted && prefs.masterVolume > 0;
}

/** XP map before the collect, reconstructed from post-collect XP − gains. */
export function skillXpBeforeCollect(after: SkillXpMap, gains: SkillGainPreview): SkillXpMap {
	return {
		prompting: Math.max(0, after.prompting - gains.prompting),
		imagination: Math.max(0, after.imagination - gains.imagination),
		hustle: Math.max(0, after.hustle - gains.hustle)
	};
}

export function skillsThatLeveledUp(before: SkillXpMap, after: SkillXpMap): SkillId[] {
	return SKILL_IDS.filter(
		(id) => skillProgress(id, after[id]).level > skillProgress(id, before[id]).level
	);
}
