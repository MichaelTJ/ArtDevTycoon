import { describe, expect, it } from 'vitest';
import {
	FURNITURE_SHEETS,
	PEOPLE_SHEETS,
	TILESETS,
	getFurnitureSheet,
	getTileset,
	isTilesetId,
	sheetTileCount,
	tileBackgroundStyle
} from './catalog';

describe('studio-editor catalog', () => {
	it('keeps packed-sheet math consistent with PNG sizes', () => {
		for (const tileset of Object.values(TILESETS)) {
			if (tileset.spacing === 0 && tileset.margin === 0) {
				expect(tileset.columns * tileset.tileSize).toBe(tileset.imageWidth);
				expect(tileset.rows * tileset.tileSize).toBe(tileset.imageHeight);
			}
			expect(sheetTileCount(tileset)).toBe(tileset.columns * tileset.rows);
		}
		const indoor = TILESETS['home-indoor'];
		expect(indoor.imageWidth).toBeGreaterThanOrEqual(
			indoor.columns * indoor.tileSize + (indoor.columns - 1) * indoor.spacing
		);
		expect(indoor.imageHeight).toBe(
			indoor.rows * indoor.tileSize + (indoor.rows - 1) * indoor.spacing
		);
		expect(getFurnitureSheet('home-indoor-props').id).toBe('home-indoor-props');
		expect(sheetTileCount(FURNITURE_SHEETS.furniture)).toBe(5);
		const creatures = PEOPLE_SHEETS['tiny-creatures'];
		expect(creatures.columns * creatures.tileSize).toBe(creatures.imageWidth);
		expect(creatures.rows * creatures.tileSize).toBe(creatures.imageHeight);
	});

	it('falls unknown tileset ids back to tiny-dungeon', () => {
		expect(isTilesetId('nope')).toBe(false);
		expect(getTileset('nope').id).toBe('tiny-dungeon');
	});

	it('places tile 0 at the origin and tile `columns` on the next row', () => {
		const sheet = TILESETS['tiny-dungeon'];
		expect(tileBackgroundStyle(sheet, 0, 2)['background-position']).toBe('0px 0px');
		expect(tileBackgroundStyle(sheet, 12, 2)['background-position']).toBe('0px -32px');
		expect(tileBackgroundStyle(sheet, 1, 2)['background-position']).toBe('-32px 0px');
	});
});
