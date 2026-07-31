import { describe, expect, it } from 'vitest';
import { ROOMS, getRoomForEnvironment, markerWalkable } from './rooms';

describe('rooms', () => {
	it('home-kitchen is 6×6 with Mum resident and walkable markers', () => {
		const room = ROOMS['home-kitchen'];
		expect(room.width).toBe(6);
		expect(room.height).toBe(6);
		expect(room.collision).toHaveLength(36);
		expect(room.ground).toHaveLength(36);
		expect(room.palette).toBe('kitchen');
		expect(room.zones).toEqual([]);
		expect(room.residents).toHaveLength(1);
		expect(room.residents[0]?.clientName).toBe('Mum');
		expect(room.residents[0]!.patrol.length).toBeGreaterThanOrEqual(2);

		expect(markerWalkable(room, room.door)).toBe(true);
		expect(markerWalkable(room, room.desk)).toBe(true);
		expect(markerWalkable(room, room.playerSpawn)).toBe(true);
		expect(markerWalkable(room, room.clientWait)).toBe(true);
		for (const point of room.residents[0]!.patrol) {
			expect(markerWalkable(room, point)).toBe(true);
		}
	});

	it('higher venues match size, palette, zones, and have no residents', () => {
		const garage = ROOMS['art-room'];
		expect(garage.width).toBe(12);
		expect(garage.height).toBe(10);
		expect(garage.palette).toBe('garage');
		expect(garage.zones).toHaveLength(0);
		expect(garage.residents).toHaveLength(0);
		expect(markerWalkable(garage, garage.desk)).toBe(true);
		expect(markerWalkable(garage, garage.door)).toBe(true);
		expect(markerWalkable(garage, garage.clientWait)).toBe(true);
		expect(markerWalkable(garage, garage.playerSpawn)).toBe(true);

		const studio = ROOMS.studio;
		expect(studio.width).toBe(18);
		expect(studio.height).toBe(12);
		expect(studio.palette).toBe('storefront');
		expect(studio.zones.length).toBeGreaterThanOrEqual(2);
		expect(studio.residents).toHaveLength(0);

		const hall = ROOMS.gallery;
		expect(hall.width).toBe(22);
		expect(hall.height).toBe(14);
		expect(hall.palette).toBe('museum');
		expect(hall.zones.length).toBeGreaterThanOrEqual(2);
		expect(hall.residents).toHaveLength(0);

		const mega = ROOMS['mega-museum'];
		expect(mega.width).toBe(28);
		expect(mega.height).toBe(16);
		expect(mega.palette).toBe('museum');
		expect(mega.zones.length).toBeGreaterThanOrEqual(3);
		expect(mega.residents).toHaveLength(0);
	});

	it('multi-zone rooms have a walkable doorway on the divider', () => {
		for (const id of ['studio', 'gallery', 'mega-museum'] as const) {
			const room = ROOMS[id];
			const walkableInterior = [];
			for (let ty = 1; ty < room.height - 1; ty++) {
				for (let tx = 1; tx < room.width - 1; tx++) {
					if (room.collision[ty * room.width + tx] === 0) {
						walkableInterior.push({ tx, ty });
					}
				}
			}
			expect(walkableInterior.length).toBeGreaterThan(10);
			expect(markerWalkable(room, room.door)).toBe(true);
			expect(markerWalkable(room, room.desk)).toBe(true);
		}
	});

	it('getRoomForEnvironment falls back to home-kitchen', () => {
		expect(getRoomForEnvironment('unknown').id).toBe('home-kitchen');
		expect(getRoomForEnvironment('home-kitchen').id).toBe('home-kitchen');
	});
});
