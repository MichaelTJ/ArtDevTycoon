/**
 * Canvas brush profiles keyed by Spec 13 medium tier id. Spec 25 MVP — crayon through
 * watercolour get distinct stroke feel; acrylic and oil keep their line parameters.
 * Palettes live in `sketchPalettes.ts`; oil stroke stamps live in `brushStroke.ts`.
 */

export interface BrushProfile {
	/** Matches `MediumTier.id` (e.g. `crayon`, `watercolor`). */
	id: string;
	/** Player-facing label for the painting picker. */
	label: string;
	/** Multiplier applied to the size slider before clamping. */
	sizeMultiplier: number;
	/** Hard clamp after multiplier — keeps crayon chunky and pencil thin. */
	minSize: number;
	maxSize: number;
	/** Stroke opacity 0–1. */
	opacity: number;
	/** Canvas `shadowBlur` for soft edges (watercolour wash). */
	softEdge: number;
	/** Stamp semi-transparent grain dots along the stroke (crayon wax / charcoal dust). */
	grain: boolean;
	/** Grain stamp variant when `grain` is true; defaults to crayon wax. */
	grainStyle?: 'crayon' | 'charcoal';
	/** Draw a slightly wider dot when the pointer lifts (ink bleed). */
	bleedOnLift: boolean;
	/** Radius multiplier for the lift bleed dot. */
	bleedMultiplier: number;
	compositeOperation: GlobalCompositeOperation;
}

/** MVP mediums with distinct brush feel (Spec 25b B1–B4). */
export const MVP_BRUSH_MEDIUM_IDS = ['crayon', 'pencil', 'ink', 'watercolor'] as const;

export type MvpBrushMediumId = (typeof MVP_BRUSH_MEDIUM_IDS)[number];

const PROFILES: Record<string, BrushProfile> = {
	crayon: {
		id: 'crayon',
		label: 'Crayons',
		sizeMultiplier: 1.45,
		minSize: 4,
		maxSize: 44,
		opacity: 0.62,
		softEdge: 1.5,
		grain: true,
		bleedOnLift: false,
		bleedMultiplier: 1,
		compositeOperation: 'source-over'
	},
	pencil: {
		id: 'pencil',
		label: 'Pencil',
		sizeMultiplier: 0.55,
		minSize: 1,
		maxSize: 18,
		opacity: 0.92,
		softEdge: 0,
		grain: false,
		bleedOnLift: false,
		bleedMultiplier: 1,
		compositeOperation: 'source-over'
	},
	ink: {
		id: 'ink',
		label: 'Ink & Charcoal',
		sizeMultiplier: 1.08,
		minSize: 2,
		maxSize: 32,
		opacity: 0.82,
		softEdge: 0.75,
		grain: true,
		grainStyle: 'charcoal',
		bleedOnLift: true,
		bleedMultiplier: 1.35,
		compositeOperation: 'source-over'
	},
	watercolor: {
		id: 'watercolor',
		label: 'Watercolour',
		sizeMultiplier: 1.25,
		minSize: 3,
		maxSize: 48,
		opacity: 0.34,
		softEdge: 8,
		grain: false,
		bleedOnLift: false,
		bleedMultiplier: 1,
		compositeOperation: 'source-over'
	},
	acrylic: {
		id: 'acrylic',
		label: 'Acrylic',
		sizeMultiplier: 1,
		minSize: 2,
		maxSize: 40,
		opacity: 0.95,
		softEdge: 0,
		grain: false,
		bleedOnLift: false,
		bleedMultiplier: 1,
		compositeOperation: 'source-over'
	},
	oil: {
		id: 'oil',
		label: 'Oil',
		sizeMultiplier: 1.15,
		minSize: 3,
		maxSize: 42,
		opacity: 0.98,
		softEdge: 2,
		grain: false,
		bleedOnLift: false,
		bleedMultiplier: 1,
		compositeOperation: 'source-over'
	}
};

export const DEFAULT_BRUSH_PROFILE_ID = 'crayon';

/** Resolve brush parameters for a medium tier id; unknown ids fall back to crayon. */
export function getBrushProfile(mediumTierId: string): BrushProfile {
	return PROFILES[mediumTierId] ?? PROFILES[DEFAULT_BRUSH_PROFILE_ID];
}

/** True when the tier has a bespoke MVP stroke profile (B1–B4). */
export function isMvpBrushMedium(mediumTierId: string): mediumTierId is MvpBrushMediumId {
	return (MVP_BRUSH_MEDIUM_IDS as readonly string[]).includes(mediumTierId);
}
