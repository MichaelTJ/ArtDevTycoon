import { describe, expect, it } from 'vitest';
import { getRoomForVenue, roomIdForVenue } from './venueRooms';

describe('venueRooms', () => {
	it('roomIdForVenue maps progressive venues', () => {
		expect(roomIdForVenue('fridge')).toBe('home-kitchen');
		expect(roomIdForVenue('garage')).toBe('art-room');
		expect(roomIdForVenue('storefront')).toBe('studio');
		expect(roomIdForVenue('gallery-hall')).toBe('gallery');
		expect(roomIdForVenue('mega-museum')).toBe('mega-museum');
		expect(roomIdForVenue('unknown')).toBe('home-kitchen');
	});

	it('getRoomForVenue returns authored sizes and palettes', () => {
		const kitchen = getRoomForVenue('fridge');
		expect(kitchen.width).toBe(6);
		expect(kitchen.height).toBe(6);
		expect(kitchen.palette).toBe('kitchen');

		const garage = getRoomForVenue('garage');
		expect(garage.width).toBe(12);
		expect(garage.height).toBe(10);
		expect(garage.palette).toBe('garage');

		const storefront = getRoomForVenue('storefront');
		expect(storefront.width).toBe(18);
		expect(storefront.height).toBe(12);
		expect(storefront.palette).toBe('storefront');
		expect(storefront.zones.length).toBeGreaterThanOrEqual(2);

		const hall = getRoomForVenue('gallery-hall');
		expect(hall.width).toBe(22);
		expect(hall.height).toBe(14);
		expect(hall.palette).toBe('museum');
		expect(hall.zones.length).toBeGreaterThanOrEqual(2);

		const mega = getRoomForVenue('mega-museum');
		expect(mega.width).toBe(28);
		expect(mega.height).toBe(16);
		expect(mega.palette).toBe('museum');
		expect(mega.zones.length).toBeGreaterThanOrEqual(3);
	});
});
