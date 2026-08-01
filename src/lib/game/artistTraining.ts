/** XP required per level step — level 2 at 40, level 3 at 80, etc. */
export const XP_PER_LEVEL_STEP = 40;

export const ARTIST_LEVEL_CAP = 5;

/** XP granted when an assigned commission or major-project beat completes. */
export const ASSIGNMENT_XP_REWARD = 25;

/**
 * Artist level from lifetime XP. Level 1 at 0 XP; each 40 XP adds a level until cap.
 */
export function artistLevel(xp: number): number {
	const level = Math.floor(xp / XP_PER_LEVEL_STEP) + 1;
	return Math.min(ARTIST_LEVEL_CAP, Math.max(1, level));
}

/** XP still needed to reach the next level; 0 when at cap. */
export function xpToNextLevel(xp: number): number {
	const level = artistLevel(xp);
	if (level >= ARTIST_LEVEL_CAP) return 0;
	const nextThreshold = level * XP_PER_LEVEL_STEP;
	return Math.max(0, nextThreshold - xp);
}

/** Fill ratio 0–1 toward the next level. */
export function artistLevelFill(xp: number): number {
	const level = artistLevel(xp);
	if (level >= ARTIST_LEVEL_CAP) return 1;
	const prevThreshold = (level - 1) * XP_PER_LEVEL_STEP;
	const span = XP_PER_LEVEL_STEP;
	return Math.min(1, (xp - prevThreshold) / span);
}

export function grantArtistXp(currentXp: number, amount: number): number {
	return Math.max(0, currentXp + Math.max(0, amount));
}

/**
 * Mock accuracy/creativity for artist-completed work — scales with training level.
 * Documented literals for tests: level 1 → 7/7, level 5 → 10/10.
 */
export function mockArtistScores(level: number): { accuracy: number; creativity: number } {
	const clamped = Math.min(ARTIST_LEVEL_CAP, Math.max(1, level));
	const score = Math.min(10, 5 + clamped);
	return { accuracy: score, creativity: score };
}
