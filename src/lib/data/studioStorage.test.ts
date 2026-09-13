import { describe, expect, it } from 'vitest';
import { storageForVenue, VENUE_STORAGE } from './studioStorage';

describe('storageForVenue', () => {
	it('returns mega-museum vault copy', () => {
		expect(storageForVenue('mega-museum').promptLabel).toBe('Open vault');
	});

	it("falls back to Mum's rainy-day box", () => {
		expect(storageForVenue('nope').name).toBe("Mum's rainy-day box");
	});

	it('has one row per known venue', () => {
		expect(VENUE_STORAGE.map((row) => row.venueId)).toEqual([
			'fridge',
			'garage',
			'storefront',
			'gallery-hall',
			'mega-museum'
		]);
	});

	it('uses distinct interior furniture sprites, not the dungeon strip or fridge cabinet', () => {
		expect(storageForVenue('fridge')).toMatchObject({
			frame: 193,
			sheet: 'home-interior',
			promptLabel: 'Open drawers'
		});
		expect(storageForVenue('garage')).toMatchObject({
			frame: 188,
			sheet: 'home-interior',
			promptLabel: 'Open shelves'
		});
		expect(storageForVenue('storefront')).toMatchObject({
			frame: 320,
			sheet: 'home-indoor',
			promptLabel: 'Open stock'
		});
		expect(storageForVenue('gallery-hall')).toMatchObject({
			frame: 187,
			sheet: 'home-interior',
			promptLabel: 'Open archive'
		});
		expect(storageForVenue('mega-museum')).toMatchObject({
			frame: 199,
			sheet: 'home-interior',
			promptLabel: 'Open vault'
		});
		const frames = VENUE_STORAGE.map((row) => `${row.sheet}:${row.frame}`);
		expect(new Set(frames).size).toBe(5);
	});
});
