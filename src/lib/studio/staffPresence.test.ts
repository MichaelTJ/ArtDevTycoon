import { describe, expect, it } from 'vitest';
import { ROOMS } from './rooms';
import {
	curatorPatrol,
	floorStaffFromHired,
	receptionistAnchor,
	staffAnchorForRole,
	staffLookForRole
} from './staffPresence';
import { getRoomForVenue } from './venueRooms';

describe('floorStaffFromHired', () => {
	it('filters and orders floor roles; drops print-shop and unknowns', () => {
		expect(floorStaffFromHired([])).toEqual([]);
		expect(floorStaffFromHired(['print-shop'])).toEqual([]);
		expect(floorStaffFromHired(['curator', 'apprentice'])).toEqual(['apprentice', 'curator']);
		expect(
			floorStaffFromHired(['marketing-director', 'print-shop', 'apprentice', 'curator'])
		).toEqual(['apprentice', 'marketing-director', 'curator']);
		expect(floorStaffFromHired(['nope', 'apprentice'])).toEqual(['apprentice']);
	});
});

describe('staffAnchorForRole', () => {
	it('places apprentice at second work spot and MD at clientWait', () => {
		expect(staffAnchorForRole('apprentice', ROOMS['home-kitchen'])).toEqual({ tx: 4, ty: 4 });
		expect(staffAnchorForRole('marketing-director', ROOMS['home-kitchen'])).toEqual(
			ROOMS['home-kitchen'].clientWait
		);
		expect(staffAnchorForRole('apprentice', getRoomForVenue('garage'))).toEqual({
			tx: 6,
			ty: 6
		});
	});

	it('uses extra desk and extra wait tiles when they exist', () => {
		const kitchen = {
			...ROOMS['home-kitchen'],
			desks: [{ tx: 4, ty: 4 }],
			clientWaits: [{ tx: 3, ty: 1 }]
		};
		expect(staffAnchorForRole('apprentice', kitchen)).toEqual({ tx: 4, ty: 4 });
		expect(staffAnchorForRole('marketing-director', kitchen)).toEqual({ tx: 3, ty: 1 });
	});

	it('anchors curator at first patrol waypoint', () => {
		const kitchen = ROOMS['home-kitchen'];
		expect(staffAnchorForRole('curator', kitchen)).toEqual(curatorPatrol(kitchen)[0]);
	});
});

describe('curatorPatrol', () => {
	it('returns ≥2 waypoints; kitchen uses east-wall pace of length 2', () => {
		expect(curatorPatrol(getRoomForVenue('storefront')).length).toBeGreaterThanOrEqual(2);
		expect(curatorPatrol(ROOMS['home-kitchen']).length).toBe(2);
	});
});

describe('receptionistAnchor', () => {
	it('uses clientWait tile near the door', () => {
		const garage = getRoomForVenue('garage');
		expect(receptionistAnchor(garage)).toEqual(garage.clientWait);
	});
});

describe('staffLookForRole', () => {
	it('returns distinct frame/tint per floor role', () => {
		expect(staffLookForRole('apprentice')).toEqual({
			frame: 112,
			tint: 0xa8d4ff,
			spriteKey: 'tiny-dungeon-folk'
		});
		expect(staffLookForRole('marketing-director')).toEqual({
			frame: 84,
			tint: 0xffd4a8,
			spriteKey: 'tiny-dungeon-folk'
		});
		expect(staffLookForRole('curator')).toEqual({
			frame: 37,
			tint: 0xd4c4a8,
			spriteKey: 'tiny-creatures'
		});
	});
});
