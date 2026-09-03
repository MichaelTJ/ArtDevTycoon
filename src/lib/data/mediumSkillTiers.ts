/**
 * Hidden per-medium quality suffixes and studio-background phrases (Spec 27 ranks 1–7).
 *
 * Style copy is the explorer2 Round 4 ladder with Round 5 replacements for the six
 * Janus failures. Background copy is explorer2 Round 7, shared across mediums.
 * Player-facing HUD must never import this file — only rank names from `mediumSkill.ts`.
 */
import { getMediumTier } from './mediumTiers';

export const MEDIUM_SKILL_SUFFIXES: Readonly<Record<string, readonly string[]>> = {
	crayon: [
		getMediumTier('crayon').promptModifierSuffix,
		'clumsy crayon coloring on construction paper, chunky wax strokes, torn paper',
		'heavy, wobbly wax crayon drawing',
		'smeared oil pastel drawing, basic shapes',
		'neatly colored wax crayon drawing, thick outlines',
		'blended wax crayon illustration, textured',
		'highly detailed wax pastel illustration, expert crayon art'
	],
	pencil: [
		getMediumTier('pencil').promptModifierSuffix,
		'quick, loose gesture sketch',
		'rough thumbnail sketch, visible construction lines',
		'basic contour line drawing',
		'lightly shaded graphite pencil sketch',
		'highly detailed graphite pencil drawing, fine shading, professional sketchbook study',
		'masterful graphite pencil drawing, museum-quality shading, intricate detail'
	],
	ink: [
		getMediumTier('ink').promptModifierSuffix,
		'heavy, blunt charcoal drawing',
		'quick ballpoint pen sketch, scratchy lines',
		'simple black ink outline drawing',
		'loose black ink and brush wash',
		'detailed black ink illustration, confident linework, rich ink shadows',
		'ultra-fine liner pen illustration, stippled shading'
	],
	watercolor: [
		getMediumTier('watercolor').promptModifierSuffix,
		'basic flat copic marker sketch',
		'loose gouache sketch, uneven washes',
		'blended soft chalk pastel drawing',
		'clean copic marker illustration, crisp edges',
		'detailed matte gouache painting',
		'masterful opaque gouache illustration, studio quality'
	],
	acrylic: [
		getMediumTier('acrylic').promptModifierSuffix,
		'basic flat vector art, no shading',
		'simple cell-shaded digital illustration',
		'clean acrylic painting, visible brushstrokes',
		'crisp flat digital illustration, minimal gradients',
		'polished digital painting, rich blended color, professional tablet illustration',
		'polished 2.5D vector art style, smooth gradients'
	],
	oil: [
		getMediumTier('oil').promptModifierSuffix,
		'quick alla prima oil sketch',
		'palette knife oil painting, chunky textures',
		'loose impressionist oil painting',
		'impasto oil on canvas, thick 3D paint strokes',
		'classical still life oil painting',
		'masterful chiaroscuro oil painting, rich museum quality'
	]
};

/**
 * Round 7 studio-background ladder. Rank matches skill level; same phrase for every medium.
 */
export const MEDIUM_SKILL_BACKGROUNDS: readonly string[] = [
	'centered on a solid plain white background',
	'centered on clean textured paper background',
	'against a light studio backdrop with a soft drop shadow',
	'against a soft neutral gradient background with diffused lighting',
	'in a bright studio setup with clean softbox lighting and sharp focus',
	'against a smooth neutral background with soft out-of-focus blur',
	'in a bright professional studio setup with three-point lighting and soft background bokeh'
];

function clampSkillRank(level: number): number {
	return Math.min(7, Math.max(1, Math.floor(level)));
}

/**
 * Hidden Janus style suffix for a medium at a given rank. Clamps to 1..7.
 * Unknown medium ids use the crayon ladder so a corrupt save cannot leak a blank suffix.
 */
export function mediumSkillSuffix(mediumId: string, level: number): string {
	const crayon = MEDIUM_SKILL_SUFFIXES['crayon'] ?? [];
	const ladder = MEDIUM_SKILL_SUFFIXES[mediumId] ?? crayon;
	const suffix = ladder[clampSkillRank(level) - 1] ?? crayon[0];
	return suffix ?? '';
}

/**
 * Hidden studio-background clause for a skill rank. Shared across mediums. Clamps to 1..7.
 */
export function mediumSkillBackground(level: number): string {
	const phrase = MEDIUM_SKILL_BACKGROUNDS[clampSkillRank(level) - 1];
	return phrase ?? MEDIUM_SKILL_BACKGROUNDS[0] ?? '';
}
