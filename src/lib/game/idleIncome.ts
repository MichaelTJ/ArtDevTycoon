/** Cap how much offline time counts, so leaving a tab open for a week isn't a windfall. */
export const MAX_IDLE_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Base delay before the next client walks in while idle (Marketing Director shortens this). */
export const BASE_AUTO_INVITE_DELAY_MS = 6000;

/**
 * Cash earned between `lastTickAt` and `now` at `incomePerSecond`. Clamps elapsed time to
 * `MAX_IDLE_MS` and to a minimum of 0 (a clock that appears to run backwards, e.g. a
 * corrected system clock, earns nothing rather than a negative number).
 */
export function computeIdleEarnings(
	lastTickAt: number,
	now: number,
	incomePerSecond: number
): { earned: number; elapsedMs: number } {
	const rawElapsed = now - lastTickAt;
	const elapsedMs = Math.min(Math.max(rawElapsed, 0), MAX_IDLE_MS);
	const earned = Math.floor((elapsedMs / 1000) * incomePerSecond);
	return { earned, elapsedMs };
}
