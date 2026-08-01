import { describe, expect, it } from 'vitest';
import { LEVEL_1 } from '$lib/types/contracts';
import { isLevelComplete, levelProgress } from './levelRules';

const { targetCash, targetCommissions, startingCash } = LEVEL_1;

describe('isLevelComplete', () => {
	it('is false until both targets are met', () => {
		expect(isLevelComplete({ cash: startingCash, commissionsCompleted: 0 })).toBe(false);
		expect(isLevelComplete({ cash: targetCash, commissionsCompleted: targetCommissions - 1 })).toBe(
			false
		);
		expect(isLevelComplete({ cash: targetCash - 1, commissionsCompleted: targetCommissions })).toBe(
			false
		);
	});

	it('is true when both targets are met', () => {
		expect(isLevelComplete({ cash: targetCash, commissionsCompleted: targetCommissions })).toBe(
			true
		);
		expect(
			isLevelComplete({ cash: targetCash + 40, commissionsCompleted: targetCommissions + 4 })
		).toBe(true);
	});
});

describe('levelProgress', () => {
	it('returns clamped fractions and overall as the minimum', () => {
		expect(levelProgress({ cash: startingCash, commissionsCompleted: 0 })).toEqual({
			commissions: 0,
			cash: startingCash / targetCash,
			overall: 0
		});
		expect(
			levelProgress({ cash: targetCash, commissionsCompleted: targetCommissions - 1 })
		).toEqual({
			commissions: (targetCommissions - 1) / targetCommissions,
			cash: 1,
			overall: (targetCommissions - 1) / targetCommissions
		});
		expect(
			levelProgress({ cash: targetCash - 1, commissionsCompleted: targetCommissions })
		).toEqual({
			commissions: 1,
			cash: (targetCash - 1) / targetCash,
			overall: (targetCash - 1) / targetCash
		});
		expect(levelProgress({ cash: targetCash, commissionsCompleted: targetCommissions })).toEqual({
			commissions: 1,
			cash: 1,
			overall: 1
		});
	});
});
