import { describe, expect, it } from 'vitest';
import { DEFAULT_MEDIUM_TIER_ID, getMediumTier } from '$lib/data/mediumTiers';
import { buildLevel1Prompt, mediumSkillBackground } from '$lib/game';
import {
	clampCheatCash,
	clampCheatMediumSkillLevel,
	clampCheatRep,
	peekLevel1ModifierSuffix
} from './cheats';

describe('clampCheatCash', () => {
	it('truncates toward zero', () => {
		expect(clampCheatCash(3.7)).toBe(3);
	});

	it('floors negatives at 0', () => {
		expect(clampCheatCash(-1)).toBe(0);
	});

	it('caps at 1_000_000_000', () => {
		expect(clampCheatCash(2e9)).toBe(1_000_000_000);
	});

	it('treats non-finite as 0', () => {
		expect(clampCheatCash(Number.NaN)).toBe(0);
		expect(clampCheatCash(Number.POSITIVE_INFINITY)).toBe(0);
	});
});

describe('clampCheatRep', () => {
	it('truncates and clamps', () => {
		expect(clampCheatRep(12.9)).toBe(12);
		expect(clampCheatRep(-5)).toBe(0);
		expect(clampCheatRep(2_000_000)).toBe(1_000_000);
	});
});

describe('clampCheatMediumSkillLevel', () => {
	it('clamps to 1–7 and truncates', () => {
		expect(clampCheatMediumSkillLevel(0)).toBe(1);
		expect(clampCheatMediumSkillLevel(3.9)).toBe(3);
		expect(clampCheatMediumSkillLevel(99)).toBe(7);
		expect(clampCheatMediumSkillLevel(Number.NaN)).toBe(1);
	});
});

describe('peekLevel1ModifierSuffix', () => {
	it('matches the crayon medium suffix used by buildLevel1Prompt', () => {
		const suffix = peekLevel1ModifierSuffix();
		expect(suffix).toBe(getMediumTier(DEFAULT_MEDIUM_TIER_ID).promptModifierSuffix);
		expect(buildLevel1Prompt('a dragon')).toBe(`a dragon, ${suffix}, ${mediumSkillBackground(1)}`);
	});
});
