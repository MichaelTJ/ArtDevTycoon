import { describe, expect, it } from 'vitest';
import { TILESETS } from '$lib/studio-editor/catalog';
import { DUNGEON, DUNGEON_WALL_FRAMES, INDOOR, INTERIOR } from './roomTiles';

describe('roomTiles', () => {
	it('does not define wall frames on home-indoor (furniture-only pack)', () => {
		expect('wall' in INDOOR).toBe(false);
		expect('wallAlt' in INDOOR).toBe(false);
	});

	it('does not define home-interior wall frames (furniture panels, not walls)', () => {
		expect('wall' in INTERIOR).toBe(false);
		expect('wallPerimeter' in INTERIOR).toBe(false);
	});

	it('uses Tiny Dungeon autotile indices for structural walls', () => {
		expect(DUNGEON.cornerNW).toBe(12);
		expect(DUNGEON.cornerNE).toBe(14);
		expect(DUNGEON.cornerSW).toBe(18);
		expect(DUNGEON.cornerSE).toBe(20);
		expect(DUNGEON.edgeN).toBe(13);
		expect(DUNGEON.edgeW).toBe(15);
		expect(DUNGEON.edgeE).toBe(17);
		expect(DUNGEON.edgeS).toBe(19);
		expect(DUNGEON.fill).toBe(16);
		expect(DUNGEON_WALL_FRAMES.size).toBe(9);
		expect(DUNGEON.cornerNW).toBe(TILESETS['tiny-dungeon'].defaultWall);
	});

	it('uses carpet center fills without orange border tiles', () => {
		expect(INTERIOR.carpetBlue).toBe(68);
		expect(INTERIOR.carpetPurple).toBe(116);
		expect(INTERIOR.carpetRed).toBe(20);
		expect(INTERIOR.carpetBlue).not.toBe(60);
		expect(INTERIOR.carpetBlue).not.toBe(64);
	});

	it('keeps verified home-indoor furniture frames', () => {
		expect(INDOOR.counterL).toBe(338);
		expect(INDOOR.sink).toBe(372);
		expect(INDOOR.paintingA).toBe(436);
	});
});
