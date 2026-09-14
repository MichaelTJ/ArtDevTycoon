import { describe, expect, it } from 'vitest';
import { clientLookForTier } from './clientLooks';

describe('clientLookForTier', () => {
	it('maps every tier id and unknown → walk-in look', () => {
		expect(clientLookForTier('walk-in')).toEqual({
			frame: 87,
			tint: null,
			spriteKey: 'tiny-dungeon-folk'
		});
		expect(clientLookForTier('corporate')).toEqual({
			frame: 96,
			tint: 0x7a9cc4,
			spriteKey: 'tiny-dungeon-folk'
		});
		expect(clientLookForTier('billionaire')).toEqual({
			frame: 9,
			tint: 0xb48cff,
			spriteKey: 'tiny-creatures'
		});
		expect(clientLookForTier('auction-house')).toEqual({
			frame: 100,
			tint: 0xc47878,
			spriteKey: 'tiny-dungeon-folk'
		});
		expect(clientLookForTier('')).toEqual({
			frame: 87,
			tint: null,
			spriteKey: 'tiny-dungeon-folk'
		});
		expect(clientLookForTier('nope')).toEqual({
			frame: 87,
			tint: null,
			spriteKey: 'tiny-dungeon-folk'
		});
	});
});
