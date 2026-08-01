import { describe, expect, it } from 'vitest';
import { clientLookForTier } from './clientLooks';

describe('clientLookForTier', () => {
	it('maps every tier id and unknown → walk-in look', () => {
		expect(clientLookForTier('walk-in')).toEqual({ frame: 0, tint: null });
		expect(clientLookForTier('corporate')).toEqual({ frame: 0, tint: 0x7a9cc4 });
		expect(clientLookForTier('billionaire')).toEqual({ frame: 0, tint: 0xb48cff });
		expect(clientLookForTier('auction-house')).toEqual({ frame: 0, tint: 0xc47878 });
		expect(clientLookForTier('')).toEqual({ frame: 0, tint: null });
		expect(clientLookForTier('nope')).toEqual({ frame: 0, tint: null });
	});
});
