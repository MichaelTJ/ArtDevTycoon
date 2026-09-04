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

	it('uses plain stone brick (frame 40) for Tiny Dungeon north walls', () => {
		expect(DUNGEON.wall).toBe(40);
		expect(DUNGEON_WALL_FRAMES).toEqual(new Set([40]));
		expect(DUNGEON.wall).toBe(TILESETS['tiny-dungeon'].defaultWall);
		expect(DUNGEON.wall).not.toBe(12);
		expect(DUNGEON.wall).not.toBe(19);
		expect(DUNGEON.wall).not.toBe(20);
	});

	it('uses home-interior plank fills — not home-indoor tabletop frame 0', () => {
		expect(INDOOR.floor).toBe(INTERIOR.woodFloor);
		expect(INDOOR.floor).toBe(148);
		expect(INDOOR.floor).not.toBe(0);
		expect(INDOOR.floorGrey).toBe(INTERIOR.stoneFloor);
		expect(INDOOR.floorGrey).not.toBe(26);
	});

	it('uses carpet center fills without orange border tiles', () => {
		expect(INTERIOR.carpetBlue).toBe(68);
		expect(INTERIOR.carpetPurple).toBe(116);
		expect(INTERIOR.carpetRed).toBe(20);
	});

	it('keeps verified home-indoor furniture frames', () => {
		expect(INDOOR.counterL).toBe(338);
		expect(INDOOR.sink).toBe(372);
		expect(INDOOR.paintingA).toBe(436);
	});
});
