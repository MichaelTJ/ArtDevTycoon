/**
 * Time-based per-medium skill (Spec 27). Distinct from Spec 20 craft XP and Spec 24
 * artist training: this rank only picks the hidden generation style suffix.
 * Studio-background phrases live beside it (`mediumSkillBackground`); `buildPrompt` concatenates both.
 *
 * Pure — no Svelte, DOM, or Date.now. Callers inject elapsed time.
 */
import { mediumSkillBackground, mediumSkillSuffix } from '$lib/data/mediumSkillTiers';

export { mediumSkillBackground, mediumSkillSuffix };

export const MEDIUM_SKILL_LEVEL_CAP = 7;

/** Rank names shown in UI. Index = level - 1. */
export const MEDIUM_SKILL_RANK_LABELS = [
	'Novice',
	'Doodler',
	'Student',
	'Competent',
	'Skilled',
	'Expert',
	'Master'
] as const;

/**
 * XP to go from `level` → `level + 1`. Level 1→2 = 60, then +30 per step.
 * Totals to reach level 7 from 0: 60+90+120+150+180+210 = 810.
 */
export function mediumSkillXpToNext(level: number): number {
	if (level < 1) return 60;
	if (level >= MEDIUM_SKILL_LEVEL_CAP) return 0;
	return 60 + (level - 1) * 30;
}

/** Player: 1 XP per this many ms of generating-phase wall time (active medium). */
export const COMMISSION_PAINT_MS_PER_XP = 2_666;

/** Player: 1 XP per this many ms of pointer-down drawing. Spec 28 calls this. */
export const PRACTICE_MS_PER_XP = 1_000;

/** Hired artist, not on an assignment: 1 XP per this many ms, into the studio's active medium. */
export const ARTIST_IDLE_MS_PER_XP = 20_000;

/** Hired artist on an assignment: 1 XP per this many ms, into `assignment.mediumTierId`. */
export const ARTIST_WORK_MS_PER_XP = 666;

/** Clamp artist catch-up on load / ticker gap. 10 minutes. */
export const MAX_ARTIST_SKILL_CATCHUP_MS = 600_000;

export type MediumSkillXpMap = Record<string, number>;

/** Empty map — missing keys read as 0 XP (Novice). */
export function createEmptyMediumSkillXp(): MediumSkillXpMap {
	return {};
}

export function mediumSkillXpOf(map: MediumSkillXpMap, mediumId: string): number {
	return Math.max(0, Math.floor(map[mediumId] ?? 0));
}

/**
 * Returns a new map with `amount` floored XP added. No-op (same object) when amount ≤ 0
 * so callers can skip persist when nothing changed.
 */
export function grantMediumSkillXp(
	map: MediumSkillXpMap,
	mediumId: string,
	amount: number
): MediumSkillXpMap {
	if (amount <= 0) return map;
	return { ...map, [mediumId]: mediumSkillXpOf(map, mediumId) + Math.floor(amount) };
}

export interface MediumSkillProgress {
	mediumId: string;
	xp: number;
	level: number; // 1..7
	rankLabel: string; // from MEDIUM_SKILL_RANK_LABELS
	xpIntoLevel: number;
	xpForNext: number; // 0 at cap
	fill: number; // 0..1, 1 at cap
}

/** Same loop as spec 20 `skillProgress`, using `mediumSkillXpToNext`. Extra XP past cap is kept on `.xp`. */
export function mediumSkillProgress(mediumId: string, xp: number): MediumSkillProgress {
	const safeXp = Math.max(0, Math.floor(xp));

	let level = 1;
	let remaining = safeXp;
	while (level < MEDIUM_SKILL_LEVEL_CAP) {
		const need = mediumSkillXpToNext(level);
		if (remaining < need) break;
		remaining -= need;
		level += 1;
	}

	const rankLabel = MEDIUM_SKILL_RANK_LABELS[level - 1] ?? MEDIUM_SKILL_RANK_LABELS[0];

	if (level >= MEDIUM_SKILL_LEVEL_CAP) {
		return {
			mediumId,
			xp: safeXp,
			level: MEDIUM_SKILL_LEVEL_CAP,
			rankLabel: MEDIUM_SKILL_RANK_LABELS[MEDIUM_SKILL_LEVEL_CAP - 1],
			xpIntoLevel: remaining,
			xpForNext: 0,
			fill: 1
		};
	}

	const xpForNext = mediumSkillXpToNext(level);
	return {
		mediumId,
		xp: safeXp,
		level,
		rankLabel,
		xpIntoLevel: remaining,
		xpForNext,
		fill: xpForNext === 0 ? 1 : remaining / xpForNext
	};
}

/** Total XP needed to *reach* `level` from zero (level 1 = 0). */
export function mediumSkillXpThresholdForLevel(level: number): number {
	let total = 0;
	for (let L = 1; L < level; L++) total += mediumSkillXpToNext(L);
	return total;
}

/**
 * Convert elapsed time + leftover remainder into whole XP.
 * `msPerXp` MUST be > 0; if not, return current remainder unchanged and xpGain 0.
 */
export function applyElapsedSkillMs(input: {
	elapsedMs: number;
	msPerXp: number;
	remainderMs: number;
}): { xpGain: number; remainderMs: number } {
	const elapsed = Math.max(0, input.elapsedMs);
	const remainder = Math.max(0, input.remainderMs);
	const msPerXp = input.msPerXp;
	if (!(msPerXp > 0)) return { xpGain: 0, remainderMs: remainder };
	const total = elapsed + remainder;
	return { xpGain: Math.floor(total / msPerXp), remainderMs: total % msPerXp };
}

export function clampArtistSkillCatchupMs(elapsedMs: number): number {
	return Math.min(MAX_ARTIST_SKILL_CATCHUP_MS, Math.max(0, elapsedMs));
}
