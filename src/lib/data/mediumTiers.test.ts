import { describe, expect, it } from 'vitest';
import { LEVEL_1 } from '$lib/types/contracts';
import { MEDIUM_TIERS, canUnlockMediumTier, getMediumTier, getNextMediumTier } from './mediumTiers';

describe('MEDIUM_TIERS', () => {
	it('starts with free crayon', () => {
		expect(MEDIUM_TIERS[0]?.id).toBe('crayon');
		expect(MEDIUM_TIERS[0]?.unlockCost).toBe(0);
		expect(MEDIUM_TIERS[0]?.requiredReputation).toBe(0);
	});

	it('crayon rank-1 suffix is byte-identical to LEVEL_1.promptModifiers', () => {
		expect(getMediumTier('crayon').promptModifierSuffix).toBe(LEVEL_1.promptModifiers);
	});

	it('has strictly increasing payout multipliers', () => {
		for (let i = 1; i < MEDIUM_TIERS.length; i++) {
			expect(MEDIUM_TIERS[i]!.payoutMultiplier).toBeGreaterThan(
				MEDIUM_TIERS[i - 1]!.payoutMultiplier
			);
		}
	});

	it('has strictly increasing unlock costs and reputations', () => {
		for (let i = 1; i < MEDIUM_TIERS.length; i++) {
			expect(MEDIUM_TIERS[i]!.unlockCost).toBeGreaterThan(MEDIUM_TIERS[i - 1]!.unlockCost);
			expect(MEDIUM_TIERS[i]!.requiredReputation).toBeGreaterThan(
				MEDIUM_TIERS[i - 1]!.requiredReputation
			);
		}
	});
});

describe('getMediumTier', () => {
	it('falls back to crayon for unknown ids', () => {
		expect(getMediumTier('nope')).toBe(MEDIUM_TIERS[0]);
	});
});

describe('getNextMediumTier', () => {
	it('returns null at the top of the ladder', () => {
		expect(getNextMediumTier('oil')).toBeNull();
	});

	it('returns pencil after crayon', () => {
		expect(getNextMediumTier('crayon')).toBe(MEDIUM_TIERS[1]);
	});
});

describe('canUnlockMediumTier', () => {
	const pencil = getMediumTier('pencil');

	it('is true at the inclusive cash and reputation boundary', () => {
		expect(canUnlockMediumTier(pencil, { cash: 15, reputation: 3 })).toBe(true);
	});

	it('is false when cash is one below the cost', () => {
		expect(canUnlockMediumTier(pencil, { cash: 14, reputation: 3 })).toBe(false);
	});

	it('is false when reputation is one below the requirement', () => {
		expect(canUnlockMediumTier(pencil, { cash: 15, reputation: 2 })).toBe(false);
	});
});
