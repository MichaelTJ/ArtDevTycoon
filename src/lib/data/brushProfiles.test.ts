import { describe, expect, it } from 'vitest';
import {
	DEFAULT_BRUSH_PROFILE_ID,
	getBrushProfile,
	isMvpBrushMedium,
	MVP_BRUSH_MEDIUM_IDS
} from './brushProfiles';

describe('getBrushProfile', () => {
	it('returns distinct MVP profiles for crayon, pencil, ink, watercolour', () => {
		const crayon = getBrushProfile('crayon');
		const pencil = getBrushProfile('pencil');
		const ink = getBrushProfile('ink');
		const watercolor = getBrushProfile('watercolor');

		expect(crayon.grain).toBe(true);
		expect(crayon.grainStyle).toBeUndefined();
		expect(pencil.sizeMultiplier).toBeLessThan(1);
		expect(ink.bleedOnLift).toBe(true);
		expect(ink.grain).toBe(true);
		expect(ink.grainStyle).toBe('charcoal');
		expect(ink.label).toBe('Ink & Charcoal');
		expect(ink.opacity).toBeLessThan(pencil.opacity);
		expect(ink.softEdge).toBeGreaterThan(pencil.softEdge);
		expect(watercolor.softEdge).toBeGreaterThan(0);
		expect(watercolor.opacity).toBeLessThan(crayon.opacity);

		const ids = new Set([crayon.id, pencil.id, ink.id, watercolor.id]);
		expect(ids.size).toBe(4);
	});

	it('falls back to crayon for unknown tier ids', () => {
		expect(getBrushProfile('unknown-medium').id).toBe(DEFAULT_BRUSH_PROFILE_ID);
	});

	it('flags MVP brush mediums', () => {
		for (const id of MVP_BRUSH_MEDIUM_IDS) {
			expect(isMvpBrushMedium(id)).toBe(true);
		}
		expect(isMvpBrushMedium('acrylic')).toBe(false);
	});
});
