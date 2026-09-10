import { describe, expect, it } from 'vitest';
import {
	ACRYLIC_PALETTE,
	CRAYON_PALETTE,
	hexFromRgb,
	INK_PALETTE,
	OIL_PALETTE,
	rgbFromHex,
	showsCustomColour,
	showsOilStrokePicker,
	showsRgbPicker,
	swatchesForMedium,
	WATERCOLOR_PALETTE
} from './sketchPalettes';

describe('swatchesForMedium', () => {
	it('returns crayon swatches for crayon', () => {
		expect(swatchesForMedium('crayon')).toEqual(CRAYON_PALETTE);
	});

	it('returns crayon swatches for unknown mediums', () => {
		expect(swatchesForMedium('nope')).toEqual(CRAYON_PALETTE);
	});

	it('returns crayon swatches for pencil', () => {
		expect(swatchesForMedium('pencil')).toEqual(CRAYON_PALETTE);
	});

	it('returns ink black and paper white', () => {
		expect(swatchesForMedium('ink')).toEqual(['#0a0a0a', '#fafaf9']);
		expect(swatchesForMedium('ink')).toEqual(INK_PALETTE);
	});

	it('returns watercolor swatches including #3d5a80, not crayon red', () => {
		expect(swatchesForMedium('watercolor')).toEqual(WATERCOLOR_PALETTE);
		expect(WATERCOLOR_PALETTE).toContain('#3d5a80');
		expect(WATERCOLOR_PALETTE).not.toContain('#dc2626');
	});

	it('returns acrylic swatches including #06b6d4', () => {
		expect(swatchesForMedium('acrylic')).toEqual(ACRYLIC_PALETTE);
		expect(ACRYLIC_PALETTE).toContain('#06b6d4');
	});

	it('returns oil swatches including #d4a017', () => {
		expect(swatchesForMedium('oil')).toEqual(OIL_PALETTE);
		expect(OIL_PALETTE).toContain('#d4a017');
	});
});

describe('picker flags', () => {
	it('shows RGB picker for watercolor, acrylic, and oil only', () => {
		expect(showsRgbPicker('watercolor')).toBe(true);
		expect(showsRgbPicker('acrylic')).toBe(true);
		expect(showsRgbPicker('oil')).toBe(true);
		expect(showsRgbPicker('crayon')).toBe(false);
	});

	it('shows Custom colour for pencil, not ink or watercolor', () => {
		expect(showsCustomColour('pencil')).toBe(true);
		expect(showsCustomColour('ink')).toBe(false);
		expect(showsCustomColour('watercolor')).toBe(false);
	});

	it('shows oil stroke picker for oil only', () => {
		expect(showsOilStrokePicker('oil')).toBe(true);
		expect(showsOilStrokePicker('acrylic')).toBe(false);
	});
});

describe('hexFromRgb / rgbFromHex', () => {
	it('composes lowercase #rrggbb', () => {
		expect(hexFromRgb(255, 0, 0)).toBe('#ff0000');
	});

	it('clamps and rounds channels to 0–255', () => {
		expect(hexFromRgb(-4, 300, 15.4)).toBe('#00ff0f');
	});

	it('parses #rrggbb in any case', () => {
		expect(rgbFromHex('#3D5A80')).toEqual({ r: 61, g: 90, b: 128 });
	});

	it('rejects shorthand, named colours, and empty strings', () => {
		expect(rgbFromHex('#fff')).toBeNull();
		expect(rgbFromHex('red')).toBeNull();
		expect(rgbFromHex('')).toBeNull();
	});
});
