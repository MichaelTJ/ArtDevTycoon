import { describe, expect, it } from 'vitest';
import { ROOMS } from './rooms';
import {
	curatorPatrol,
	floorStaffFromHired,
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
		expect(staffAnchorForRole('apprentice', ROOMS['home-kitchen'])).toEqual({ tx: 4, ty: 3 });
		expect(staffAnchorForRole('marketing-director', ROOMS['home-kitchen'])).toEqual(
			ROOMS['home-kitchen'].clientWait
		);
		expect(staffAnchorForRole('apprentice', getRoomForVenue('garage'))).toEqual({
			tx: 6,
			ty: 5
		});
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

describe('staffLookForRole', () => {
	it('returns distinct frame/tint per floor role', () => {
		expect(staffLookForRole('apprentice')).toEqual({ frame: 1, tint: 0xa8d4ff });
		expect(staffLookForRole('marketing-director')).toEqual({ frame: 1, tint: 0xffd4a8 });
		expect(staffLookForRole('curator')).toEqual({ frame: 0, tint: 0xd4c4a8 });
	});
});
