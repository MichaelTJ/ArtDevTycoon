/**
 * Craft skills that grow when commissions are collected (spec 20).
 * Levels are derived from lifetime XP — never stored separately.
 */

export const SKILL_IDS = ['prompting', 'imagination', 'hustle'] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export interface SkillDef {
	id: SkillId;
	label: string;
	/** One short line for ProgressPanel. */
	tagline: string;
}

export const SKILL_DEFS: readonly SkillDef[] = [
	{ id: 'prompting', label: 'Prompting', tagline: 'Hitting the brief.' },
	{ id: 'imagination', label: 'Imagination', tagline: 'Inventing the scene.' },
	{ id: 'hustle', label: 'Hustle', tagline: 'Getting paid for it.' }
];

/** Lifetime XP per skill. Level is derived; never store level separately. */
export type SkillXpMap = Record<SkillId, number>;

export function createEmptySkillXp(): SkillXpMap {
	return { prompting: 0, imagination: 0, hustle: 0 };
}

/**
 * XP required to advance from `level` → `level + 1`.
 * Level is 1-based. Level 1→2 costs 15, then +10 per step (25, 35, …).
 * Cap display level at 10 (further XP still accumulates but bar stays full).
 */
export const SKILL_LEVEL_CAP = 10;

export function xpToNextLevel(level: number): number {
	if (level < 1) return 15;
	if (level >= SKILL_LEVEL_CAP) return 0;
	return 15 + (level - 1) * 10;
}

/** Total XP needed to *reach* `level` from zero (level 1 = 0). */
export function xpThresholdForLevel(level: number): number {
	let total = 0;
	for (let L = 1; L < level; L++) total += xpToNextLevel(L);
	return total;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export interface SkillProgress {
	id: SkillId;
	label: string;
	xp: number;
	level: number;
	/** XP into the current level. */
	xpIntoLevel: number;
	/** XP needed for next level; 0 when capped. */
	xpForNext: number;
	/** 0–1 fill for the current level segment. 1 when capped. */
	fill: number;
}

export function skillProgress(id: SkillId, xp: number): SkillProgress {
	const def = SKILL_DEFS.find((s) => s.id === id) ?? SKILL_DEFS[0];
	const safeXp = Math.max(0, Math.floor(xp));

	let level = 1;
	let remaining = safeXp;
	while (level < SKILL_LEVEL_CAP) {
		const need = xpToNextLevel(level);
		if (remaining < need) break;
		remaining -= need;
		level += 1;
	}

	if (level >= SKILL_LEVEL_CAP) {
		return {
			id,
			label: def.label,
			xp: safeXp,
			level: SKILL_LEVEL_CAP,
			xpIntoLevel: remaining,
			xpForNext: 0,
			fill: 1
		};
	}

	const xpForNext = xpToNextLevel(level);
	return {
		id,
		label: def.label,
		xp: safeXp,
		level,
		xpIntoLevel: remaining,
		xpForNext,
		fill: xpForNext === 0 ? 1 : remaining / xpForNext
	};
}

/**
 * Pending gains from a finished critique (before Collect Cash).
 *   prompting   += accuracyScore
 *   imagination += creativityScore
 *   hustle      += clamp(round(finalPayout / 25), 1, 20)
 */
export interface SkillGainPreview {
	prompting: number;
	imagination: number;
	hustle: number;
}

export function previewSkillGains(input: {
	accuracyScore: number;
	creativityScore: number;
	finalPayout: number;
}): SkillGainPreview {
	return {
		prompting: clamp(Math.round(input.accuracyScore), 1, 10),
		imagination: clamp(Math.round(input.creativityScore), 1, 10),
		hustle: clamp(Math.round(input.finalPayout / 25), 1, 20)
	};
}

export function applySkillGains(current: SkillXpMap, gains: SkillGainPreview): SkillXpMap {
	return {
		prompting: current.prompting + gains.prompting,
		imagination: current.imagination + gains.imagination,
		hustle: current.hustle + gains.hustle
	};
}

/**
 * Soft payout bonus from craft levels. Level 1 in all three = 1.0.
 * Each level above 1 across all skills adds +0.01, capped at +0.15.
 */
export function skillPayoutMultiplier(skills: SkillXpMap): number {
	const levels = SKILL_IDS.map((id) => skillProgress(id, skills[id]).level);
	const sum = levels.reduce((a, b) => a + b, 0);
	const bonus = Math.min(0.15, Math.max(0, (sum - 3) * 0.01));
	return 1 + bonus;
}
