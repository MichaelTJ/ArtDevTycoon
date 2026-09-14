import { describe, expect, it } from 'vitest';
import {
	EASEL_STAND_FRAME,
	easelStandFrame,
	nearestDisplaySlot,
	slotsForVenue
} from './easelLayout';
import { ROOMS } from './rooms';
import { getRoomForVenue } from './venueRooms';

describe('slotsForVenue', () => {
	const room = ROOMS['home-kitchen'];

	it('fridge yields 3 magnets on the solid cabinets, not floor tiles', () => {
		const slots = slotsForVenue('fridge', room);
		expect(slots).toHaveLength(3);
		expect(slots.every((s) => s.kind === 'magnet')).toBe(true);
		const tiles = new Set(slots.map((s) => `${s.tx},${s.ty}`));
		expect(tiles).toEqual(new Set(['1,2', '0,2', '0,3']));
		expect(slots.some((s) => s.tx === 1 && s.ty === 3)).toBe(false);
		expect(slots.some((s) => s.tx === 2 && s.ty === 2)).toBe(false);
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
		expect(slots.filter((s) => s.kind === 'magnet').length).toBeGreaterThanOrEqual(3);
		expect(slots.every((s) => s.kind === 'magnet' || s.kind === 'easel')).toBe(true);
		for (const slot of slots) {
			expect(slot.tx).toBeGreaterThanOrEqual(0);
			expect(slot.ty).toBeGreaterThanOrEqual(0);
			expect(slot.tx).toBeLessThan(garage.width);
			expect(slot.ty).toBeLessThan(garage.height);
			expect(slot.tx === garage.desk.tx && slot.ty === garage.desk.ty).toBe(false);
		}
	});

	it('mega-museum caps at 12 floor slots, all easels', () => {
		const mega = getRoomForVenue('mega-museum');
		const slots = slotsForVenue('mega-museum', mega);
		expect(slots).toHaveLength(12);
		expect(slots.every((s) => s.kind === 'easel')).toBe(true);
	});

	it('storefront and gallery-hall use easels only', () => {
		const storefront = getRoomForVenue('storefront');
		const hall = getRoomForVenue('gallery-hall');
		const shopSlots = slotsForVenue('storefront', storefront);
		const hallSlots = slotsForVenue('gallery-hall', hall);
		expect(shopSlots).toHaveLength(8);
		expect(hallSlots).toHaveLength(10);
		expect(shopSlots.every((s) => s.kind === 'easel')).toBe(true);
		expect(hallSlots.every((s) => s.kind === 'easel')).toBe(true);
	});

	it('fridge extra anchors without solid furniture do not fill neighbor floors', () => {
		const kitchen = {
			...ROOMS['home-kitchen'],
			fridgeAnchors: [{ tx: 4, ty: 4 }]
		};
		const slots = slotsForVenue('fridge', kitchen);
		expect(slots.some((slot) => slot.tx === 1 && slot.ty === 2)).toBe(true);
		expect(slots.some((slot) => slot.tx === 4 && slot.ty === 4)).toBe(false);
		expect(slots.some((slot) => slot.tx === 1 && slot.ty === 3)).toBe(false);
		expect(slots.some((slot) => slot.tx === 2 && slot.ty === 2)).toBe(false);
	});

	it('wall-only fridge anchors still get magnet slots', () => {
		const kitchen = ROOMS['home-kitchen'];
		const collision = [...kitchen.collision];
		collision[4 * kitchen.width + 4] = 1;
		const wallFridge = {
			...kitchen,
			collision,
			fridgeAnchors: [{ tx: 4, ty: 4 }]
		};
		const slots = slotsForVenue('fridge', wallFridge);
		expect(slots.some((slot) => slot.tx === 4 && slot.ty === 4)).toBe(true);
		expect(slots.some((slot) => slot.tx === 1 && slot.ty === 2)).toBe(true);
		expect(slots.every((slot) => slot.kind === 'magnet')).toBe(true);
	});

	it('does not cover fridge cabinets or magnet slots with a furniture stand', () => {
		const kitchen = ROOMS['home-kitchen'];
		const fridge = kitchen.furniture.find((prop) => prop.interactableId === 'fridge');
		expect(fridge).toBeDefined();
		const fridgeSlot = slotsForVenue('fridge', kitchen).find(
			(slot) => slot.tx === fridge!.tx && slot.ty === fridge!.ty
		);
		expect(fridgeSlot?.kind).toBe('magnet');
		expect(easelStandFrame(fridgeSlot!, kitchen)).toBeNull();

		for (const slot of slotsForVenue('fridge', kitchen)) {
			expect(easelStandFrame(slot, kitchen)).toBeNull();
		}

		const twoTileFridge = {
			...kitchen,
			fridgeAnchors: [{ tx: fridge!.tx, ty: fridge!.ty + 1 }],
			furniture: [
				...kitchen.furniture,
				{
					frame: fridge!.frame,
					tx: fridge!.tx,
					ty: fridge!.ty + 1,
					solid: true,
					sheet: fridge!.sheet
				}
			]
		};
		const extraSlot = slotsForVenue('fridge', twoTileFridge).find(
			(slot) => slot.tx === fridge!.tx && slot.ty === fridge!.ty + 1
		);
		expect(extraSlot).toBeDefined();
		expect(easelStandFrame(extraSlot!, twoTileFridge)).toBeNull();

		const storefront = getRoomForVenue('storefront');
		const fridgeCells = new Set(
			[storefront.fridgeAnchor, ...(storefront.fridgeAnchors ?? [])].map(
				(marker) => `${marker.tx},${marker.ty}`
			)
		);
		const easel = slotsForVenue('storefront', storefront).find(
			(slot) =>
				slot.kind === 'easel' &&
				!fridgeCells.has(`${slot.tx},${slot.ty}`) &&
				!storefront.furniture.some((prop) => prop.tx === slot.tx && prop.ty === slot.ty)
		);
		expect(easel?.kind).toBe('easel');
		expect(easelStandFrame(easel!, storefront)).toBe(EASEL_STAND_FRAME);
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

describe('nearestDisplaySlot', () => {
	const tileSize = 16;
	const rangePx = 28;
	const fridgeSlots = [
		{ tx: 1, ty: 2, entryId: 'a' },
		{ tx: 0, ty: 2, entryId: 'b' },
		{ tx: 0, ty: 3, entryId: 'c' }
	] as const;

	function tileCenter(tx: number, ty: number): { px: number; py: number } {
		return { px: (tx + 0.5) * tileSize, py: (ty + 0.5) * tileSize };
	}

	it('A: player at (0,3) picks that fridge', () => {
		const { px, py } = tileCenter(0, 3);
		expect(nearestDisplaySlot(px, py, fridgeSlots, tileSize, rangePx)).toEqual({
			tx: 0,
			ty: 3,
			entryId: 'c'
		});
	});

	it('B: empty nearest slot still wins over farther occupied ones', () => {
		const { px, py } = tileCenter(0, 3);
		const slots = [
			{ tx: 1, ty: 2, entryId: 'a' },
			{ tx: 0, ty: 2, entryId: 'b' },
			{ tx: 0, ty: 3, entryId: null }
		];
		expect(nearestDisplaySlot(px, py, slots, tileSize, rangePx)).toEqual({
			tx: 0,
			ty: 3,
			entryId: null
		});
	});

	it('C: player far away returns null', () => {
		expect(nearestDisplaySlot(200, 200, fridgeSlots, tileSize, rangePx)).toBeNull();
	});

	it('D: equal distance keeps the earlier array index', () => {
		const slots = [
			{ tx: 0, ty: 0, entryId: 'a' },
			{ tx: 2, ty: 0, entryId: 'b' }
		];
		const { px, py } = tileCenter(1, 0);
		expect(nearestDisplaySlot(px, py, slots, tileSize, rangePx)).toEqual(slots[0]);
	});
});
