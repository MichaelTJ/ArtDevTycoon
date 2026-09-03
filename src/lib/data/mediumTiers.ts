/**
 * Purchasable art medium ladder. Each tier swaps the hidden prompt suffix that used to
 * be a fixed `LEVEL_1.promptModifiers` string, and multiplies commission payouts.
 * Tier data lives here (not in contracts.ts) — same pattern as `EnvironmentConfig`.
 */

export interface MediumTier {
	id: string;
	name: string;
	/** One line shown under the name in the shop. */
	tagline: string;
	/** One-time cash cost to unlock. Tier 0 is free and always unlocked. */
	unlockCost: number;
	/** Player's `reputation` must be at least this to unlock. */
	requiredReputation: number;
	/**
	 * Appended to the player's prompt exactly like `LEVEL_1.promptModifiers` is today —
	 * see `buildPrompt` in promptPipeline.ts. Never shown to the player.
	 */
	promptModifierSuffix: string;
	/** Multiplies the payout computed by `calculatePayout`. 1.0 = no change. */
	payoutMultiplier: number;
	/** Emoji shown in the shop and the active-tier HUD badge. No new icon assets. */
	icon: string;
}

/**
 * Ordered from worst to best. Index order matters: `getNextMediumTier` and the shop's
 * "up next" preview both walk this array in order. `promptModifierSuffix` values below
 * are the Spec 27 rank-1 (Novice) hidden suffixes. Higher ranks live in
 * `mediumSkillTiers.ts`. Rank-1 copy (except crayon) is the explorer2 Round 4/5 Novice
 * phrase. Crayon rank 1 stays byte-identical to `LEVEL_1.promptModifiers`.
 */
export const MEDIUM_TIERS: readonly MediumTier[] = [
	{
		id: 'crayon',
		name: 'Crayons & Construction Paper',
		tagline: 'Where every artist starts. Free, messy, and a little bit magic.',
		unlockCost: 0,
		requiredReputation: 0,
		promptModifierSuffix:
			'flat color, simple line art, crayon texture, amateur style, low detail, basic shading',
		payoutMultiplier: 1.0,
		icon: '🖍️'
	},
	{
		id: 'pencil',
		name: 'Pencil & Sketchbook',
		tagline: 'Graphite over crayon wax. Clients notice the extra care.',
		unlockCost: 15,
		requiredReputation: 3,
		promptModifierSuffix: 'messy continuous line graphite drawing',
		payoutMultiplier: 1.15,
		icon: '✏️'
	},
	{
		id: 'ink',
		name: 'Ink & Charcoal',
		tagline: 'Bold outlines and real shadow. Your first taste of drama.',
		unlockCost: 35,
		requiredReputation: 6,
		promptModifierSuffix: 'smudged, chaotic charcoal scribble',
		payoutMultiplier: 1.3,
		icon: '🖋️'
	},
	{
		id: 'watercolor',
		name: 'Watercolour Set',
		tagline: 'Soft blends and happy accidents.',
		unlockCost: 75,
		requiredReputation: 10,
		promptModifierSuffix: 'messy chalk pastel scribble',
		payoutMultiplier: 1.5,
		icon: '🎨'
	},
	{
		id: 'acrylic',
		name: 'Acrylic & Digital Tablet',
		tagline: 'Clean, professional, saleable at real galleries.',
		unlockCost: 160,
		requiredReputation: 16,
		promptModifierSuffix: 'MS Paint style pixelated drawing, flat colors',
		payoutMultiplier: 1.75,
		icon: '🖥️'
	},
	{
		id: 'oil',
		name: 'Oil on Canvas',
		tagline: 'The masters\u2019 medium. Every commission now reads as a masterpiece.',
		unlockCost: 350,
		requiredReputation: 24,
		promptModifierSuffix: 'beginner oil painting, muddy colors, amateur canvas, thick messy paint',
		payoutMultiplier: 2.2,
		icon: '🖼️'
	}
] as const;

export const DEFAULT_MEDIUM_TIER_ID = MEDIUM_TIERS[0].id;

export function getMediumTier(id: string): MediumTier {
	const tier = MEDIUM_TIERS.find((t) => t.id === id);
	return tier ?? MEDIUM_TIERS[0];
}

/** `null` when `id` is already the last tier. */
export function getNextMediumTier(id: string): MediumTier | null {
	const index = MEDIUM_TIERS.findIndex((t) => t.id === id);
	if (index === -1 || index === MEDIUM_TIERS.length - 1) return null;
	return MEDIUM_TIERS[index + 1];
}

export function canUnlockMediumTier(
	tier: MediumTier,
	state: { cash: number; reputation: number }
): boolean {
	return state.cash >= tier.unlockCost && state.reputation >= tier.requiredReputation;
}
