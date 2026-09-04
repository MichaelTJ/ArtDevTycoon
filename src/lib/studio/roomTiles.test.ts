import { describe, expect, it } from 'vitest';
import { TILESETS } from '$lib/studio-editor/catalog';
import { INDOOR, INTERIOR } from './roomTiles';

describe('roomTiles', () => {
	it('does not define wall frames on home-indoor (furniture-only pack)', () => {
		expect('wall' in INDOOR).toBe(false);
		expect('wallAlt' in INDOOR).toBe(false);
	});

	it('uses home-interior structural wall indices, not catalog carpet corners', () => {
		expect(INTERIOR.wall).toBe(144);
		expect(INTERIOR.wallTop).toBe(168);
		expect(INTERIOR.wall).not.toBe(TILESETS['home-interior'].defaultWall);
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
		expect(INTERIOR.armchair).toBe(200);
	});
});
