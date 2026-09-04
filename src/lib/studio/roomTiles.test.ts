import { describe, expect, it } from 'vitest';
import { TILESETS } from '$lib/studio-editor/catalog';
import { INDOOR, INTERIOR } from './roomTiles';

describe('roomTiles', () => {
	it('avoids catalog defaultWall indices that are decor, not walls', () => {
		expect(INDOOR.wall).not.toBe(TILESETS['home-indoor'].defaultWall);
		expect(INTERIOR.wall).not.toBe(TILESETS['home-interior'].defaultWall);
	});

	it('uses carpet fill tiles, not bordered corner tiles', () => {
		expect(INTERIOR.carpetBlue).not.toBe(64);
		expect(INTERIOR.carpetBlue).not.toBe(72);
		expect(INTERIOR.carpetPurple).not.toBe(96);
	});

	it('keeps kitchen and gallery furniture on verified frames', () => {
		expect(INDOOR.counterL).toBe(338);
		expect(INDOOR.sink).toBe(372);
		expect(INDOOR.paintingA).toBe(436);
		expect(INTERIOR.woodFloor).toBe(148);
		expect(INTERIOR.armchair).toBe(200);
	});
});
