import { describe, expect, it } from 'vitest';
import {
	ROOMS,
	getRoomForEnvironment,
	markerWalkable,
	roomDesks,
	roomFridgeAnchors,
	type RoomId
} from './rooms';
import { INDOOR, INTERIOR, FURNITURE_CAP, SHEET } from './roomTiles';

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
		expect(room.residents[0]?.spriteKey).toBe('mum');
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

		for (const room of [garage, studio, hall, mega]) {
			expect(markerWalkable(room, room.desk)).toBe(true);
			expect(markerWalkable(room, room.door)).toBe(true);
			expect(markerWalkable(room, room.clientWait)).toBe(true);
			expect(markerWalkable(room, room.playerSpawn)).toBe(true);
		}
	});

	it('multi-zone rooms have a walkable doorway on each vertical divider', () => {
		/** Columns that are mostly solid walls with ≥1 gap = authored dividers. */
		function verticalDividerGaps(room: (typeof ROOMS)['studio']): number {
			let dividersWithGap = 0;
			const interiorH = room.height - 2;
			for (let tx = 1; tx < room.width - 1; tx++) {
				let wallCount = 0;
				let gapCount = 0;
				for (let ty = 1; ty < room.height - 1; ty++) {
					if (room.collision[ty * room.width + tx] === 1) wallCount += 1;
					else gapCount += 1;
				}
				if (wallCount >= interiorH - 2 && gapCount >= 1) dividersWithGap += 1;
			}
			return dividersWithGap;
		}

		expect(verticalDividerGaps(ROOMS.studio)).toBeGreaterThanOrEqual(1);
		expect(verticalDividerGaps(ROOMS.gallery)).toBeGreaterThanOrEqual(1);
		// Atelier | gallery | foyer needs a gap on both dividers.
		expect(verticalDividerGaps(ROOMS['mega-museum'])).toBeGreaterThanOrEqual(2);

		for (const id of ['studio', 'gallery', 'mega-museum'] as const) {
			const room = ROOMS[id];
			expect(markerWalkable(room, room.door)).toBe(true);
			expect(markerWalkable(room, room.desk)).toBe(true);
		}
	});

	it('collects unique extra desks and fridge anchors', () => {
		const kitchen = ROOMS['home-kitchen'];
		expect(roomDesks(kitchen)).toEqual([kitchen.desk]);
		expect(
			roomFridgeAnchors({
				...kitchen,
				fridgeAnchors: [kitchen.fridgeAnchor, { tx: 4, ty: 4 }]
			})
		).toEqual([kitchen.fridgeAnchor, { tx: 4, ty: 4 }]);
	});

	it('getRoomForEnvironment falls back to home-kitchen', () => {
		expect(getRoomForEnvironment('unknown').id).toBe('home-kitchen');
		expect(getRoomForEnvironment('home-kitchen').id).toBe('home-kitchen');
	});

	it('tags MVP interactables on kitchen fridge and garage toolkit shelf only', () => {
		const fridge = ROOMS['home-kitchen'].furniture.find((p) => p.interactableId === 'fridge');
		expect(fridge).toBeDefined();
		expect(fridge!.tx).toBe(1);
		expect(fridge!.ty).toBe(1);
		expect(fridge!.sheet).toBe(SHEET.indoorProps);

		const shelf = ROOMS['art-room'].furniture.find((p) => p.interactableId === 'toolkit-shelf');
		expect(shelf).toBeDefined();
		expect(shelf!.tx).toBe(3);
		expect(shelf!.ty).toBe(5);
		expect(shelf!.sheet).toBe(SHEET.indoorProps);

		for (const id of ['studio', 'gallery', 'mega-museum'] as const) {
			const tagged = ROOMS[id].furniture.filter((p) => p.interactableId != null);
			expect(tagged).toHaveLength(0);
		}
	});

	it('authored rooms use home packs — never tiny-dungeon', () => {
		const expected: Record<RoomId, string> = {
			'home-kitchen': SHEET.indoor,
			'art-room': SHEET.indoor,
			studio: SHEET.indoor,
			gallery: SHEET.interior,
			'mega-museum': SHEET.interior
		};
		for (const [id, tilesetId] of Object.entries(expected)) {
			expect(ROOMS[id as RoomId].tilesetId).toBe(tilesetId);
		}
		for (const room of Object.values(ROOMS)) {
			expect(room.tilesetId).not.toBe('tiny-dungeon');
			expect(room.tilesetId).toBeDefined();
			for (const prop of room.furniture) {
				expect(prop.sheet).toBeDefined();
				expect(prop.sheet).not.toBe('furniture');
			}
		}
	});

	it('storefront and gallery use small carpet fill overlays from home-interior', () => {
		const studio = ROOMS.studio;
		expect(studio.groundSheets?.some((sheet) => sheet === SHEET.interior)).toBe(true);
		const carpetCell = studio.ground[studio.width * 8 + 14];
		expect(carpetCell).toBe(INTERIOR.carpetBlue);

		const gallery = ROOMS.gallery;
		const galleryCarpet = gallery.ground[gallery.width * 6 + 15];
		expect(galleryCarpet).toBe(INTERIOR.carpetPurple);
	});

	it('keeps furniture sparse and perimeter walls off cabinet/bed indices', () => {
		const bannedPerimeter = new Set([22, 64, 116, 168, 169, 170]);

		for (const [id, cap] of Object.entries(FURNITURE_CAP)) {
			const room = ROOMS[id as RoomId];
			expect(room.furniture.length).toBeLessThanOrEqual(cap);
		}

		for (const room of Object.values(ROOMS)) {
			for (let i = 0; i < room.collision.length; i++) {
				if (room.collision[i] !== 1) continue;
				const tx = i % room.width;
				const ty = Math.floor(i / room.width);
				const onPerimeter =
					tx === 0 || ty === 0 || tx === room.width - 1 || ty === room.height - 1;
				if (!onPerimeter) continue;
				expect(bannedPerimeter.has(room.ground[i]!)).toBe(false);
				expect(room.ground[i]).toBe(INTERIOR.wallPerimeter);
			}
		}
	});

	it('authored rooms paint home-interior wall tiles on every perimeter cell', () => {
		const indoorRooms = ['home-kitchen', 'art-room', 'studio'] as const;
		for (const id of indoorRooms) {
			const room = ROOMS[id];
			expect(room.tilesetId).toBe(SHEET.indoor);
			for (let i = 0; i < room.collision.length; i++) {
				if (room.collision[i] !== 1) continue;
				const tx = i % room.width;
				const ty = Math.floor(i / room.width);
				const onPerimeter =
					tx === 0 || ty === 0 || tx === room.width - 1 || ty === room.height - 1;
				if (!onPerimeter) continue;
				expect(room.ground[i]).toBe(INTERIOR.wallPerimeter);
				expect(room.groundSheets?.[i]).toBe(SHEET.interior);
			}
		}

		for (const id of ['gallery', 'mega-museum'] as const) {
			const room = ROOMS[id];
			expect(room.ground[0]).toBe(INTERIOR.wallPerimeter);
		}
	});
});
