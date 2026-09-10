/** Crayon box — also used by pencil. Same eight hexes SketchCanvas shipped in Spec 25. */
export const CRAYON_PALETTE = [
	'#1c1917',
	'#ffffff',
	'#dc2626',
	'#ea580c',
	'#ca8a04',
	'#16a34a',
	'#2563eb',
	'#7c3aed'
] as const;

/** Ink & Charcoal — black and paper white only (playtest P22). */
export const INK_PALETTE = ['#0a0a0a', '#fafaf9'] as const;

/** Watercolour swatches for SketchCanvas (Spec 32). */
export const WATERCOLOR_PALETTE = [
	'#f7f1e8',
	'#f4d35e',
	'#e76f51',
	'#c1121f',
	'#3d5a80',
	'#4cc9f0',
	'#588157',
	'#9c6644'
] as const;

/** Acrylic & Digital Tablet swatches for SketchCanvas (Spec 32). */
export const ACRYLIC_PALETTE = [
	'#ffffff',
	'#111827',
	'#ef4444',
	'#f59e0b',
	'#84cc16',
	'#06b6d4',
	'#3b82f6',
	'#a855f7'
] as const;

/** Oil swatches for SketchCanvas (Spec 32). */
export const OIL_PALETTE = [
	'#f5f0e6',
	'#1c1917',
	'#d4a017',
	'#9b1b30',
	'#c2a355',
	'#5c3317',
	'#2f6b4f',
	'#2a3d7c'
] as const;

/** Mediums that show the RGB colour well + channel inputs instead of Custom colour. */
export const RGB_PICKER_MEDIUM_IDS = ['watercolor', 'acrylic', 'oil'] as const;

/** Oil stroke-texture kinds on SketchCanvas (session-only; not saved). */
export const OIL_STROKE_KINDS = ['round', 'bristle', 'flat', 'knife'] as const;
/** Player-picked oil stamp kind. `round` uses the existing line stroke. */
export type OilStrokeKind = (typeof OIL_STROKE_KINDS)[number];

/** Accessible button labels for the Oil stroke group. */
export const OIL_STROKE_LABELS: Record<OilStrokeKind, string> = {
	round: 'Round',
	bristle: 'Bristle',
	flat: 'Flat',
	knife: 'Palette knife'
};

/** Default oil stroke when SketchCanvas first mounts. */
export const DEFAULT_OIL_STROKE_KIND: OilStrokeKind = 'round';

/**
 * Swatches for a Spec 13 medium tier id.
 * `ink` → INK; `watercolor` → WATERCOLOR; `acrylic` → ACRYLIC; `oil` → OIL; else CRAYON.
 */
export function swatchesForMedium(mediumTierId: string): readonly string[] {
	switch (mediumTierId) {
		case 'ink':
			return INK_PALETTE;
		case 'watercolor':
			return WATERCOLOR_PALETTE;
		case 'acrylic':
			return ACRYLIC_PALETTE;
		case 'oil':
			return OIL_PALETTE;
		default:
			return CRAYON_PALETTE;
	}
}

/** true iff mediumTierId is in RGB_PICKER_MEDIUM_IDS. */
export function showsRgbPicker(mediumTierId: string): boolean {
	return (RGB_PICKER_MEDIUM_IDS as readonly string[]).includes(mediumTierId);
}

/** true iff not ink and not showsRgbPicker (crayon, pencil, unknown). */
export function showsCustomColour(mediumTierId: string): boolean {
	return mediumTierId !== 'ink' && !showsRgbPicker(mediumTierId);
}

/** true iff mediumTierId === 'oil'. */
export function showsOilStrokePicker(mediumTierId: string): boolean {
	return mediumTierId === 'oil';
}

function clampChannel(n: number): number {
	return Math.min(255, Math.max(0, Math.round(n)));
}

/** Clamp each channel with Math.round to 0–255; return lowercase #rrggbb. */
export function hexFromRgb(r: number, g: number, b: number): string {
	const toHex = (n: number) => clampChannel(n).toString(16).padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Accept #rrggbb (any case). Otherwise null. No #rgb shorthand. */
export function rgbFromHex(hex: string): { r: number; g: number; b: number } | null {
	const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
	if (!match) {
		return null;
	}
	return {
		r: parseInt(match[1], 16),
		g: parseInt(match[2], 16),
		b: parseInt(match[3], 16)
	};
}
