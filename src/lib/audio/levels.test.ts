import { describe, expect, test } from 'vitest';
import {
	effectiveMusicGain,
	effectiveSfxGain,
	isAudioEnabled,
	skillXpBeforeCollect,
	skillsThatLeveledUp
} from './levels';
import { createDefaultAudioPrefs } from './schema';

const basePrefs = createDefaultAudioPrefs();

describe('effective gains', () => {
	test('muted music gain is 0', () => {
		expect(
			effectiveMusicGain({
				...basePrefs,
				muted: true,
				masterVolume: 1,
				musicVolume: 1
			})
		).toBe(0);
	});

	test('sfx gain is master × sfx', () => {
		expect(
			effectiveSfxGain({
				muted: false,
				masterVolume: 0.5,
				sfxVolume: 0.5,
				musicVolume: 0,
				version: 1
			})
		).toBe(0.25);
	});

	test('isAudioEnabled false when masterVolume is 0', () => {
		expect(
			isAudioEnabled({
				...basePrefs,
				muted: false,
				masterVolume: 0
			})
		).toBe(false);
	});

	test('isAudioEnabled true when unmuted with master > 0', () => {
		expect(isAudioEnabled({ ...basePrefs, muted: false, masterVolume: 1 })).toBe(true);
	});
});

describe('level-up helpers', () => {
	test('skillsThatLeveledUp includes prompting when crossing 15 XP', () => {
		const before = { prompting: 14, imagination: 0, hustle: 0 };
		const after = { prompting: 22, imagination: 0, hustle: 0 };
		expect(skillsThatLeveledUp(before, after)).toContain('prompting');
	});

	test('skillsThatLeveledUp empty when still level 1', () => {
		const before = { prompting: 0, imagination: 0, hustle: 0 };
		const after = { prompting: 8, imagination: 0, hustle: 0 };
		expect(skillsThatLeveledUp(before, after)).toEqual([]);
	});

	test('skillXpBeforeCollect reconstructs pre-collect XP', () => {
		const before = skillXpBeforeCollect(
			{ prompting: 22, imagination: 10, hustle: 6 },
			{ prompting: 8, imagination: 4, hustle: 2 }
		);
		expect(before.prompting).toBe(14);
		expect(before.imagination).toBe(6);
		expect(before.hustle).toBe(4);
	});
});
