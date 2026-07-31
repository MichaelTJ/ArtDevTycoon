import { describe, expect, it } from 'vitest';
import {
	applySkillGains,
	createEmptySkillXp,
	previewSkillGains,
	skillPayoutMultiplier,
	skillProgress,
	xpThresholdForLevel
} from './skills';

describe('skills', () => {
	it('starts at level 1 with 15 XP to next', () => {
		const p = skillProgress('prompting', 0);
		expect(p.level).toBe(1);
		expect(p.xpForNext).toBe(15);
	});

	it('fills the current level segment', () => {
		expect(skillProgress('prompting', 14).fill).toBe(14 / 15);
	});

	it('levels up at the first threshold', () => {
		expect(skillProgress('prompting', 15).level).toBe(2);
	});

	it('caps display level at 10 with a full bar', () => {
		const xp = xpThresholdForLevel(10);
		const p = skillProgress('prompting', xp);
		expect(p.level).toBe(10);
		expect(p.fill).toBe(1);
	});

	it('previews skill gains from critique scores', () => {
		expect(previewSkillGains({ accuracyScore: 8, creativityScore: 6, finalPayout: 100 })).toEqual({
			prompting: 8,
			imagination: 6,
			hustle: 4
		});
	});

	it('floors hustle XP at 1', () => {
		expect(
			previewSkillGains({ accuracyScore: 5, creativityScore: 5, finalPayout: 10 }).hustle
		).toBe(1);
	});

	it('caps hustle XP at 20', () => {
		expect(
			previewSkillGains({ accuracyScore: 5, creativityScore: 5, finalPayout: 900 }).hustle
		).toBe(20);
	});

	it('applies gains onto existing XP', () => {
		const next = applySkillGains(createEmptySkillXp(), {
			prompting: 8,
			imagination: 6,
			hustle: 4
		});
		expect(next).toEqual({ prompting: 8, imagination: 6, hustle: 4 });
	});

	it('returns 1.0 payout multiplier for empty skills', () => {
		expect(skillPayoutMultiplier(createEmptySkillXp())).toBe(1);
	});

	it('adds 1% per level above the baseline of three level-1 skills', () => {
		const level4Xp = xpThresholdForLevel(4);
		const skills = {
			prompting: level4Xp,
			imagination: level4Xp,
			hustle: level4Xp
		};
		expect(skillPayoutMultiplier(skills)).toBe(1.09);
	});
});
