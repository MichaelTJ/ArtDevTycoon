import { pickBrief } from '$lib/data/briefs';
import { getMediumTier } from '$lib/data/mediumTiers';
import type { ClientBrief } from '$lib/types/contracts';
import { artistLevel } from './artistTraining';

/** Base simulated work time before level/medium scaling (ms). */
export const BASE_ASSIGNMENT_MS = 8_000;

export interface HiredArtistState {
	catalogId: string;
	xp: number;
}

export interface ArtistAssignment {
	artistCatalogId: string;
	briefId: string;
	startedAt: number;
	durationMs: number;
	mediumTierId: string;
}

/**
 * Simulated timer duration — faster with training, slower on premium mediums.
 * Literals: level 1 + crayon → 6800ms (8000 × 0.85 medium factor).
 */
export function workDurationMs(artistXp: number, mediumTierId: string): number {
	const level = artistLevel(artistXp);
	const levelFactor = Math.max(0.55, 1 - (level - 1) * 0.08);
	const medium = getMediumTier(mediumTierId);
	const mediumFactor = Math.max(0.85, medium.payoutMultiplier * 0.35);
	return Math.round(BASE_ASSIGNMENT_MS * levelFactor * mediumFactor);
}

export function assignmentProgress(
	assignment: Pick<ArtistAssignment, 'startedAt' | 'durationMs'>,
	now: number
): number {
	if (assignment.durationMs <= 0) return 1;
	const elapsed = now - assignment.startedAt;
	return Math.min(1, Math.max(0, elapsed / assignment.durationMs));
}

export function assignmentComplete(
	assignment: Pick<ArtistAssignment, 'startedAt' | 'durationMs'>,
	now: number
): boolean {
	return assignmentProgress(assignment, now) >= 1;
}

/** Draw 2–4 distinct commission offers for the reception desk. */
export function pickBoardOffers(options?: {
	excludeIds?: readonly string[];
	unlockedTiers?: Parameters<typeof pickBrief>[0] extends infer O
		? O extends { unlockedTiers?: infer T }
			? T
			: never
		: never;
	completedSeriesIds?: readonly string[];
	commissionsCompleted?: number;
	random?: () => number;
	count?: number;
}): ClientBrief[] {
	const random = options?.random ?? Math.random;
	const rawCount = options?.count ?? 3;
	const count = Math.min(4, Math.max(2, rawCount));
	const exclude = [...(options?.excludeIds ?? [])];
	const offers: ClientBrief[] = [];

	for (let i = 0; i < count; i++) {
		const brief = pickBrief({
			excludeIds: exclude,
			unlockedTiers: options?.unlockedTiers,
			completedSeriesIds: options?.completedSeriesIds,
			commissionsCompleted: options?.commissionsCompleted,
			random
		});
		offers.push(brief);
		exclude.push(brief.id);
	}

	return offers;
}

export function findHiredArtist(
	artists: readonly HiredArtistState[],
	catalogId: string
): HiredArtistState | undefined {
	return artists.find((a) => a.catalogId === catalogId);
}

export function mockArtistImageUrl(label: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect fill="#fef3c7" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#57534e">${label}</text></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
