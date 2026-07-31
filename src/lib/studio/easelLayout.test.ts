import { describe, expect, it } from 'vitest';
import { slotsForVenue } from './easelLayout';
import { ROOMS } from './rooms';
import { getRoomForVenue } from './venueRooms';

describe('slotsForVenue', () => {
	const room = ROOMS['home-kitchen'];

	it('fridge yields 3 magnets inside 6×6', () => {
		const slots = slotsForVenue('fridge', room);
		expect(slots).toHaveLength(3);
		expect(slots.every((s) => s.kind === 'magnet')).toBe(true);
		for (const slot of slots) {
			expect(slot.tx).toBeLessThan(6);
			expect(slot.ty).toBeLessThan(6);
			expect(slot.tx).toBeGreaterThanOrEqual(0);
			expect(slot.ty).toBeGreaterThanOrEqual(0);
		}
	});

	it('unknown venue falls back to fridge count', () => {
		expect(slotsForVenue('nope', room)).toHaveLength(3);
	});

	it('garage mixes magnets and easels; all slots in-bounds', () => {
		const garage = getRoomForVenue('garage');
		const slots = slotsForVenue('garage', garage);
		expect(slots).toHaveLength(6);
		expect(slots.filter((s) => s.kind === 'magnet')).toHaveLength(3);
		expect(slots.filter((s) => s.kind === 'easel')).toHaveLength(3);
		for (const slot of slots) {
			expect(slot.tx).toBeGreaterThanOrEqual(0);
			expect(slot.ty).toBeGreaterThanOrEqual(0);
			expect(slot.tx).toBeLessThan(garage.width);
			expect(slot.ty).toBeLessThan(garage.height);
			expect(slot.tx === garage.desk.tx && slot.ty === garage.desk.ty).toBe(false);
		}
	});

	it('mega-museum caps at 12 floor slots', () => {
		const mega = getRoomForVenue('mega-museum');
		expect(slotsForVenue('mega-museum', mega)).toHaveLength(12);
	});

	it('never produces out-of-bounds slots on 6×6 kitchen', () => {
		const kitchen = ROOMS['home-kitchen'];
		for (const venue of ['fridge', 'garage', 'storefront', 'gallery-hall', 'mega-museum']) {
			for (const slot of slotsForVenue(venue, kitchen)) {
				expect(slot.tx).toBeLessThan(kitchen.width);
				expect(slot.ty).toBeLessThan(kitchen.height);
			}
		}
	});
});
