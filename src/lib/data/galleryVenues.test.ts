import { describe, expect, it } from 'vitest';
import { GALLERY_VENUES, canUnlockVenue, getVenue, DEFAULT_VENUE_ID } from './galleryVenues';

describe('GALLERY_VENUES', () => {
	it('has exactly five venues', () => {
		expect(GALLERY_VENUES).toHaveLength(5);
	});

	it('has strictly increasing capacity, cost, and reputation', () => {
		for (let i = 1; i < GALLERY_VENUES.length; i++) {
			const prev = GALLERY_VENUES[i - 1];
			const curr = GALLERY_VENUES[i];
			expect(curr.capacity).toBeGreaterThan(prev.capacity);
			expect(curr.unlockCost).toBeGreaterThan(prev.unlockCost);
			expect(curr.requiredReputation).toBeGreaterThan(prev.requiredReputation);
		}
	});

	it('defaults to the fridge venue', () => {
		expect(DEFAULT_VENUE_ID).toBe('fridge');
		expect(GALLERY_VENUES[0].id).toBe('fridge');
	});
});

describe('getVenue', () => {
	it('returns the matching venue', () => {
		expect(getVenue('garage').name).toBe('Garage Wall');
	});

	it('falls back to fridge for unknown ids', () => {
		expect(getVenue('nope').id).toBe('fridge');
	});
});

describe('canUnlockVenue', () => {
	const garage = getVenue('garage');

	it('returns true when cash and reputation meet thresholds', () => {
		expect(canUnlockVenue(garage, { cash: 30, reputation: 4 })).toBe(true);
	});

	it('returns false when cash is short', () => {
		expect(canUnlockVenue(garage, { cash: 29, reputation: 4 })).toBe(false);
	});

	it('returns false when reputation is short', () => {
		expect(canUnlockVenue(garage, { cash: 30, reputation: 3 })).toBe(false);
	});

	it('allows the free fridge at zero resources', () => {
		expect(canUnlockVenue(getVenue('fridge'), { cash: 0, reputation: 0 })).toBe(true);
	});
});
