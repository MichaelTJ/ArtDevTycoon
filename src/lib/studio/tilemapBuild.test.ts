import { describe, expect, it } from 'vitest';
import { DUNGEON, INTERIOR, SHEET } from './roomTiles';
import { ROOMS } from './rooms';
import { TILEMAP_EMPTY, buildGroundTilemap } from './tilemapBuild';

describe('buildGroundTilemap', () => {
	it('paints Mum\'s kitchen as native north bricks over empty walkable floors', () => {
		const kitchen = ROOMS['home-kitchen'];
		const { data, overlays } = buildGroundTilemap(kitchen);

		expect(data).toHaveLength(6);
		expect(data[0]?.[0]).toBe(DUNGEON.wall);
		expect(data[1]?.[0]).toBe(DUNGEON.wall);
		expect(data[0]?.[2]).toBe(TILEMAP_EMPTY);
		expect(data[5]?.[0]).toBe(TILEMAP_EMPTY);
		expect(data[2]?.[0]).toBe(TILEMAP_EMPTY);
		expect(data[5]?.[5]).toBe(TILEMAP_EMPTY);

		const doorOverlay = overlays.find((overlay) => overlay.x === 2 && overlay.y === 0);
		expect(doorOverlay).toEqual({
			x: 2,
			y: 0,
			key: 'home-interior-props',
			frame: INTERIOR.woodFloor
		});
		expect(overlays.some((overlay) => overlay.x === 0 && overlay.y === 5)).toBe(true);
		expect(overlays.some((overlay) => overlay.x === 0 && overlay.y === 0)).toBe(false);
		expect(data[2]?.[1]).toBe(TILEMAP_EMPTY);
	});

	it('keeps north-band bricks on the primary dungeon sheet for every venue', () => {
		for (const room of Object.values(ROOMS)) {
			expect(room.tilesetId).toBe(SHEET.dungeon);
			const { data } = buildGroundTilemap(room);
			for (let tx = 0; tx < room.width; tx++) {
				if (tx === room.door.tx) {
					expect(data[0]?.[tx]).toBe(TILEMAP_EMPTY);
					expect(data[1]?.[tx]).toBe(TILEMAP_EMPTY);
				} else {
					expect(data[0]?.[tx]).toBe(DUNGEON.wall);
					expect(data[1]?.[tx]).toBe(DUNGEON.wall);
				}
			}
			expect(data[room.height - 1]?.[0]).toBe(TILEMAP_EMPTY);
			expect(data[2]?.[0]).toBe(TILEMAP_EMPTY);
			expect(data[2]?.[room.width - 1]).toBe(TILEMAP_EMPTY);
		}
	});
});
