import { describe, expect, it } from 'vitest';
import { commissionBoardAvailable, commissionChannelForVenue } from './commissionChannel';

describe('commissionChannelForVenue', () => {
	it('maps venues to channel progression', () => {
		expect(commissionChannelForVenue('fridge')).toBe('none');
		expect(commissionChannelForVenue('garage')).toBe('letterbox');
		expect(commissionChannelForVenue('storefront')).toBe('computer');
		expect(commissionChannelForVenue('gallery-hall')).toBe('receptionist');
		expect(commissionChannelForVenue('mega-museum')).toBe('receptionist');
	});

	it('unknown venue id → none', () => {
		expect(commissionChannelForVenue('unknown')).toBe('none');
	});
});

describe('commissionBoardAvailable', () => {
	it('is false on fridge and true from garage upward', () => {
		expect(commissionBoardAvailable('fridge')).toBe(false);
		expect(commissionBoardAvailable('garage')).toBe(true);
		expect(commissionBoardAvailable('storefront')).toBe(true);
		expect(commissionBoardAvailable('gallery-hall')).toBe(true);
	});
});
