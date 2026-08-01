import type { BarkLine, BarkSpeakerId } from '$lib/data/barks';
import { linesForSpeaker } from '$lib/data/barks';

/** Floor staff speakers in spawn order (matches staffPresence). */
const STAFF_SPEAKER_IDS = ['apprentice', 'marketing-director', 'curator'] as const;

export interface BarkPickerInput {
	/** Speakers that currently exist on the floor. Mum-only → ['mum']. */
	eligibleSpeakers: readonly BarkSpeakerId[];
	/** Last bark id shown; avoid immediate repeat when pool ≥ 2. */
	lastBarkId?: string | null;
	/** Injected RNG in [0, 1). Default Math.random. */
	random?: () => number;
}

export interface BarkPick {
	line: BarkLine;
	speaker: BarkSpeakerId;
}

/**
 * Pick speaker uniformly from eligibleSpeakers, then a line from that speaker's
 * pool. If the pick equals lastBarkId and pool size > 1, redraw once from the
 * remaining lines. Returns null when no eligible speaker has any lines.
 */
export function pickBark(input: BarkPickerInput): BarkPick | null {
	const random = input.random ?? Math.random;
	const speakers = input.eligibleSpeakers;
	if (speakers.length === 0) return null;

	const si = Math.min(Math.floor(random() * speakers.length), speakers.length - 1);
	const speaker = speakers[si]!;
	const pool = linesForSpeaker(speaker);
	if (pool.length === 0) return null;

	const li = Math.min(Math.floor(random() * pool.length), pool.length - 1);
	let line = pool[li]!;

	if (input.lastBarkId && line.id === input.lastBarkId && pool.length > 1) {
		const remaining = pool.filter((b) => b.id !== input.lastBarkId);
		const ri = Math.min(Math.floor(random() * remaining.length), remaining.length - 1);
		line = remaining[ri]!;
	}

	return { line, speaker };
}

export interface BarkScheduleConfig {
	/** Minimum ms between bark *attempts* while ambient is allowed. */
	minIntervalMs: number;
	/** Maximum ms between attempts. */
	maxIntervalMs: number;
}

export const DEFAULT_BARK_SCHEDULE: BarkScheduleConfig = {
	minIntervalMs: 8_000,
	maxIntervalMs: 16_000
};

/**
 * Next delay until an attempt. Uses random in [0,1) → lerp min..max.
 * Formula: `min + random() * (max - min)`.
 */
export function nextBarkDelayMs(
	config: BarkScheduleConfig = DEFAULT_BARK_SCHEDULE,
	random: () => number = Math.random
): number {
	return config.minIntervalMs + random() * (config.maxIntervalMs - config.minIntervalMs);
}

/**
 * True when ambient barks may fire for this phase.
 * MVP: only `idle`.
 */
export function barksAllowedForPhase(phase: string): boolean {
	return phase === 'idle';
}

/**
 * Build eligible speakers from snapshot + who is actually spawned.
 * - Always include 'mum' if Mum sprite exists.
 * - Include staff speaker when role id is in hiredRoleIds AND sprite exists.
 * - Never include 'visitor' in MVP.
 */
export function eligibleBarkSpeakers(input: {
	hasMum: boolean;
	hiredRoleIds: readonly string[];
	presentStaffIds: readonly string[];
}): BarkSpeakerId[] {
	const out: BarkSpeakerId[] = [];
	if (input.hasMum) out.push('mum');

	const hired = new Set(input.hiredRoleIds);
	const present = new Set(input.presentStaffIds);
	for (const id of STAFF_SPEAKER_IDS) {
		if (hired.has(id) && present.has(id)) out.push(id);
	}
	return out;
}
