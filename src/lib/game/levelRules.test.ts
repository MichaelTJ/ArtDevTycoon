import { describe, expect, it } from 'vitest';
import { isLevelComplete, levelProgress } from './levelRules';

describe('isLevelComplete', () => {
	it('is false until both targets are met', () => {
		expect(isLevelComplete({ cash: 100, commissionsCompleted: 0 })).toBe(false);
		expect(isLevelComplete({ cash: 500, commissionsCompleted: 4 })).toBe(false);
		expect(isLevelComplete({ cash: 499, commissionsCompleted: 5 })).toBe(false);
	});

	it('is true when both targets are met', () => {
		expect(isLevelComplete({ cash: 500, commissionsCompleted: 5 })).toBe(true);
		expect(isLevelComplete({ cash: 900, commissionsCompleted: 9 })).toBe(true);
	});
});

describe('levelProgress', () => {
	it('returns clamped fractions and overall as the minimum', () => {
		expect(levelProgress({ cash: 100, commissionsCompleted: 0 })).toEqual({
			commissions: 0,
			cash: 0.2,
			overall: 0
		});
		expect(levelProgress({ cash: 500, commissionsCompleted: 4 })).toEqual({
			commissions: 0.8,
			cash: 1,
			overall: 0.8
		});
		expect(levelProgress({ cash: 499, commissionsCompleted: 5 })).toEqual({
			commissions: 1,
			cash: 0.998,
			overall: 0.998
		});
		expect(levelProgress({ cash: 500, commissionsCompleted: 5 })).toEqual({
			commissions: 1,
			cash: 1,
			overall: 1
		});
	});
});
