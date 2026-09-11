import { describe, expect, it } from 'vitest';
import {
	applyElapsedSkillMs,
	ARTIST_IDLE_MS_PER_XP,
	ARTIST_WORK_MS_PER_XP,
	clampArtistSkillCatchupMs,
	COMMISSION_PAINT_MS_PER_XP,
	grantMediumSkillXp,
	mediumSkillProgress,
	mediumSkillXpThresholdForLevel,
	mediumSkillXpToNext,
	PRACTICE_MS_PER_XP
} from './mediumSkill';

describe('mediumSkillXpToNext', () => {
	it('pins the 1→7 XP table', () => {
		expect(mediumSkillXpToNext(1)).toBe(30);
		expect(mediumSkillXpToNext(2)).toBe(45);
		expect(mediumSkillXpToNext(3)).toBe(60);
		expect(mediumSkillXpToNext(4)).toBe(75);
		expect(mediumSkillXpToNext(5)).toBe(90);
		expect(mediumSkillXpToNext(6)).toBe(105);
		expect(mediumSkillXpToNext(7)).toBe(0);
		expect(mediumSkillXpThresholdForLevel(7)).toBe(405);
		expect(mediumSkillXpThresholdForLevel(1)).toBe(0);
	});
});

describe('mediumSkillProgress', () => {
	it('starts at Novice with an empty bar', () => {
		const p = mediumSkillProgress('pencil', 0);
		expect(p.level).toBe(1);
		expect(p.rankLabel).toBe('Novice');
		expect(p.xpForNext).toBe(30);
		expect(p.fill).toBe(0);
	});

	it('fills 29/30 before the first rank-up', () => {
		expect(mediumSkillProgress('pencil', 29).fill).toBe(29 / 30);
	});

	it('reaches Doodler at 30 XP', () => {
		const p = mediumSkillProgress('pencil', 30);
		expect(p.level).toBe(2);
		expect(p.rankLabel).toBe('Doodler');
	});

	it('caps at Master with a full bar', () => {
		const p = mediumSkillProgress('pencil', 405);
		expect(p.level).toBe(7);
		expect(p.fill).toBe(1);
		expect(p.xpForNext).toBe(0);
	});

	it('keeps extra XP past cap on .xp', () => {
		const p = mediumSkillProgress('pencil', 500);
		expect(p.level).toBe(7);
		expect(p.xp).toBe(500);
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

	it('triples commission paint XP on an 8s generate', () => {
		expect(
			applyElapsedSkillMs({
				elapsedMs: 8000,
				msPerXp: COMMISSION_PAINT_MS_PER_XP,
				remainderMs: 0
			})
		).toEqual({ xpGain: 3, remainderMs: 2 });
	});

	it('triples practice XP on a 3s stroke', () => {
		expect(
			applyElapsedSkillMs({ elapsedMs: 3000, msPerXp: PRACTICE_MS_PER_XP, remainderMs: 0 })
		).toEqual({ xpGain: 3, remainderMs: 0 });
	});
});

describe('medium-skill rate constants', () => {
	it('pins the ×3 ms-per-XP table', () => {
		expect(COMMISSION_PAINT_MS_PER_XP).toBe(2666);
		expect(PRACTICE_MS_PER_XP).toBe(1000);
		expect(ARTIST_IDLE_MS_PER_XP).toBe(20000);
		expect(ARTIST_WORK_MS_PER_XP).toBe(666);
	});
});

describe('clampArtistSkillCatchupMs', () => {
	it('caps AFK catch-up at 10 minutes', () => {
		expect(clampArtistSkillCatchupMs(999_999)).toBe(600_000);
	});
});
