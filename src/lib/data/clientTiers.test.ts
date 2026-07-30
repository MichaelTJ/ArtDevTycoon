import { describe, expect, it } from 'vitest';
import { CLIENT_TIER_INFO, getClientTierInfo, unlockedClientTiers } from './clientTiers';

describe('CLIENT_TIER_INFO', () => {
	it('has four tiers with strictly increasing requiredReputation', () => {
		expect(CLIENT_TIER_INFO).toHaveLength(4);
		for (let i = 1; i < CLIENT_TIER_INFO.length; i++) {
			expect(CLIENT_TIER_INFO[i].requiredReputation).toBeGreaterThan(
				CLIENT_TIER_INFO[i - 1].requiredReputation
			);
		}
	});
});

describe('unlockedClientTiers', () => {
	it('returns only walk-in at reputation 0', () => {
		expect(unlockedClientTiers(0)).toEqual(['walk-in']);
	});

	it('includes corporate but not billionaire at reputation 12', () => {
		expect(unlockedClientTiers(12)).toEqual(['walk-in', 'corporate']);
	});

	it('includes all four at reputation 50', () => {
		expect(unlockedClientTiers(50)).toEqual([
			'walk-in',
			'corporate',
			'billionaire',
			'auction-house'
		]);
	});
});

describe('getClientTierInfo', () => {
	it('returns the matching tier info', () => {
		expect(getClientTierInfo('billionaire').name).toBe('Eccentric Billionaire');
	});
});
