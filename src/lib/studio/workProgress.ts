/** First-commission fallback until a real generate+critique duration is known. */
export const DEFAULT_WORK_ESTIMATE_MS = 12_000;

/**
 * Desk work-bar fill 0..1. Caps below 1 while still working so a slow job never
 * looks "done" early; snaps to 1 when `complete` is true.
 */
export function workBarProgress(
	elapsedMs: number,
	estimateMs: number,
	complete: boolean
): number {
	if (complete) return 1;
	const estimate = Math.max(estimateMs, 1);
	return Math.min(0.95, Math.max(0, elapsedMs / estimate));
}
