/** Hard caps — document + enforce. Do not raise without a perf note in agent-log. */
export const WORK_PARTICLE_MAX = 12;
/** Max particles alive in the desk emitter at once. */
export const WORK_PARTICLE_FREQUENCY_MS = 90;
/** Emit period while working (Phaser frequency ≈ ms between spawns). */

export const CASH_BURST_COUNT = 18;
/** Particles spawned in one Collect Cash burst. */
export const CASH_BURST_LIFESPAN_MS = 700;
/** Max lifetime of a cash particle before auto-destroy. */

export type WorkVfxPhase = 'generating' | 'critiquing';

/**
 * True when desk dust/paper should run.
 * OFF when reducedVfx, or when phase is not generating/critiquing.
 */
export function shouldEmitWorkParticles(phase: string, reducedVfx: boolean): phase is WorkVfxPhase {
	if (reducedVfx) return false;
	return phase === 'generating' || phase === 'critiquing';
}

/**
 * True when a one-shot cash burst may play.
 * OFF when reducedVfx — Collect Cash still banks money; HUD tween still runs.
 */
export function shouldBurstCashConfetti(reducedVfx: boolean): boolean {
	return !reducedVfx;
}

/**
 * Detect OS/browser reduced-motion preference.
 * `media` injects `window.matchMedia` (or a fake) for tests; defaults to
 * `globalThis.matchMedia` when available, else `false`.
 */
export function queryPrefersReducedMotion(
	media?: (query: string) => { matches: boolean }
): boolean {
	const m =
		media ??
		(typeof globalThis.matchMedia === 'function'
			? globalThis.matchMedia.bind(globalThis)
			: undefined);
	if (!m) return false;
	return m('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Edge detector for Collect Cash presentation.
 * Fire burst when leaving `results` for `idle` or `levelComplete`.
 * Do not fire on results → failed, or idle → anything.
 */
export function shouldTriggerCashBurst(prevPhase: string | null, nextPhase: string): boolean {
	if (prevPhase !== 'results') return false;
	return nextPhase === 'idle' || nextPhase === 'levelComplete';
}

/** Clamp requested particle count into [0, WORK_PARTICLE_MAX]. */
export function clampWorkParticleCount(n: number): number {
	if (!Number.isFinite(n) || n < 0) return 0;
	return Math.min(Math.floor(n), WORK_PARTICLE_MAX);
}

/** Clamp burst count into [0, CASH_BURST_COUNT]. */
export function clampCashBurstCount(n: number): number {
	if (!Number.isFinite(n) || n < 0) return 0;
	return Math.min(Math.floor(n), CASH_BURST_COUNT);
}
