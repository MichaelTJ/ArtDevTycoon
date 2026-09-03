import { describe, expect, it } from 'vitest';
import {
	applyElapsedSkillMs,
	clampArtistSkillCatchupMs,
	grantMediumSkillXp,
	mediumSkillProgress,
	mediumSkillXpThresholdForLevel,
	mediumSkillXpToNext
} from './mediumSkill';

describe('mediumSkillXpToNext', () => {
	it('pins the 1→7 XP table', () => {
		expect(mediumSkillXpToNext(1)).toBe(60);
		expect(mediumSkillXpToNext(2)).toBe(90);
		expect(mediumSkillXpToNext(3)).toBe(120);
		expect(mediumSkillXpToNext(4)).toBe(150);
		expect(mediumSkillXpToNext(5)).toBe(180);
		expect(mediumSkillXpToNext(6)).toBe(210);
		expect(mediumSkillXpToNext(7)).toBe(0);
		expect(mediumSkillXpThresholdForLevel(7)).toBe(810);
		expect(mediumSkillXpThresholdForLevel(1)).toBe(0);
	});
});

describe('mediumSkillProgress', () => {
	it('starts at Novice with an empty bar', () => {
		const p = mediumSkillProgress('pencil', 0);
		expect(p.level).toBe(1);
		expect(p.rankLabel).toBe('Novice');
		expect(p.xpForNext).toBe(60);
		expect(p.fill).toBe(0);
	});

	it('fills 59/60 before the first rank-up', () => {
		expect(mediumSkillProgress('pencil', 59).fill).toBe(59 / 60);
	});

	it('reaches Doodler at 60 XP', () => {
		const p = mediumSkillProgress('pencil', 60);
		expect(p.level).toBe(2);
		expect(p.rankLabel).toBe('Doodler');
	});

	it('caps at Master with a full bar', () => {
		const p = mediumSkillProgress('pencil', 810);
		expect(p.level).toBe(7);
		expect(p.fill).toBe(1);
		expect(p.xpForNext).toBe(0);
	});

	it('keeps extra XP past cap on .xp', () => {
		const p = mediumSkillProgress('pencil', 900);
		expect(p.level).toBe(7);
		expect(p.xp).toBe(900);
	});
});

describe('grantMediumSkillXp', () => {
	it('adds floored XP into a missing key', () => {
		expect(grantMediumSkillXp({}, 'pencil', 10).pencil).toBe(10);
	});

	it('leaves the map unchanged when amount is 0', () => {
		const map = { pencil: 5 };
		expect(grantMediumSkillXp(map, 'pencil', 0)).toEqual({ pencil: 5 });
		expect(grantMediumSkillXp(map, 'pencil', 0).pencil).toBe(5);
	});
});

describe('applyElapsedSkillMs', () => {
	it('grants 1 XP on an exact interval', () => {
		expect(applyElapsedSkillMs({ elapsedMs: 8000, msPerXp: 8000, remainderMs: 0 })).toEqual({
			xpGain: 1,
			remainderMs: 0
		});
	});

	it('banks a remainder when under one XP', () => {
		expect(applyElapsedSkillMs({ elapsedMs: 7999, msPerXp: 8000, remainderMs: 0 })).toEqual({
			xpGain: 0,
			remainderMs: 7999
		});
	});

	it('combines remainder with a 1ms tick to grant 1 XP', () => {
		expect(applyElapsedSkillMs({ elapsedMs: 1, msPerXp: 8000, remainderMs: 7999 })).toEqual({
			xpGain: 1,
			remainderMs: 0
		});
	});
});

describe('clampArtistSkillCatchupMs', () => {
	it('caps AFK catch-up at 10 minutes', () => {
		expect(clampArtistSkillCatchupMs(999_999)).toBe(600_000);
	});
});
