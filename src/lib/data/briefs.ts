import { AUCTION_BRIEFS } from '$lib/data/auctionBriefs';
import { BILLIONAIRE_BRIEFS } from '$lib/data/billionaireBriefs';
import { CORPORATE_BRIEFS } from '$lib/data/corporateBriefs';
import { isBriefEligibleForProgress, KITCHEN_BRIEFS } from '$lib/data/kitchenBriefs';
import type { ClientBrief, ClientTier } from '$lib/types/contracts';

/** Kitchen walk-in ladder — re-exported under the legacy Level 1 name. */
export const LEVEL_1_BRIEFS: readonly ClientBrief[] = KITCHEN_BRIEFS;

export {
	isBriefEligibleForProgress,
	KITCHEN_BRIEFS,
	maxWalkInAbstractness
} from '$lib/data/kitchenBriefs';

const ALL_PRESTIGE_BRIEFS: readonly ClientBrief[] = [
	...LEVEL_1_BRIEFS,
	...CORPORATE_BRIEFS,
	...BILLIONAIRE_BRIEFS,
	...AUCTION_BRIEFS
];

const OPENER_IDS = new Set(['c1', 'c2', 'c3', 'c7']);

function briefTier(brief: ClientBrief): ClientTier {
	return brief.tier ?? 'walk-in';
}

function isSeriesEligible(
	brief: ClientBrief,
	excludeIds: readonly string[],
	completedSeriesIds: readonly string[]
): boolean {
	if (briefTier(brief) !== 'corporate') {
		return true;
	}
	if (brief.seriesId && completedSeriesIds.includes(brief.seriesId)) {
		return false;
	}
	const position = brief.seriesPosition ?? 1;
	if (position <= 1) {
		return true;
	}
	const predecessor = ALL_PRESTIGE_BRIEFS.find(
		(candidate) =>
			candidate.seriesId === brief.seriesId && candidate.seriesPosition === position - 1
	);
	return predecessor !== undefined && excludeIds.includes(predecessor.id);
}

function buildPool(
	excludeIds: readonly string[],
	unlockedTiers: readonly ClientTier[],
	completedSeriesIds: readonly string[],
	commissionsCompleted: number,
	reputation: number
): ClientBrief[] {
	const tierSet = new Set(unlockedTiers);
	return ALL_PRESTIGE_BRIEFS.filter((brief) => {
		if (!tierSet.has(briefTier(brief))) return false;
		if (excludeIds.includes(brief.id)) return false;
		if (!isBriefEligibleForProgress(brief, commissionsCompleted, reputation)) return false;
		return isSeriesEligible(brief, excludeIds, completedSeriesIds);
	});
}

function pickFromPool(pool: readonly ClientBrief[], random: () => number): ClientBrief {
	const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
	return pool[index];
}

/**
 * Choose the next client. `random` is injected so tests and replays are deterministic;
 * production passes nothing and gets `Math.random`.
 *
 * When every eligible brief has already been used the pool resets rather than returning
 * null, so a long run never runs out of clients. Corporate series always unlock in
 * order (1 → 2 → 3) via `excludeIds`. Walk-in abstractness is gated by
 * `commissionsCompleted` (spec 18).
 */
export function pickBrief(options?: {
	excludeIds?: readonly string[];
	/** Defaults to `['walk-in']` — existing callers unaffected. */
	unlockedTiers?: readonly ClientTier[];
	/** Series ids where all three commissions are already done. */
	completedSeriesIds?: readonly string[];
	/**
	 * Lifetime commissions finished. Gates walk-in abstractness bands.
	 * Defaults to `0` so existing callers only see abstractness 0 kitchen briefs
	 * (plus whatever prestige tiers they unlocked).
	 */
	commissionsCompleted?: number;
	/** Career reputation — OR-unlocks abstractness bands with commission count (playtest P20). */
	reputation?: number;
	random?: () => number;
}): ClientBrief {
	const random = options?.random ?? Math.random;
	const excludeIds = options?.excludeIds ?? [];
	const unlockedTiers = options?.unlockedTiers ?? ['walk-in'];
	const completedSeriesIds = options?.completedSeriesIds ?? [];
	const commissionsCompleted = options?.commissionsCompleted ?? 0;
	const reputation = options?.reputation ?? 0;

	if (commissionsCompleted === 0 && unlockedTiers.includes('walk-in')) {
		let openers = KITCHEN_BRIEFS.filter((b) => OPENER_IDS.has(b.id) && !excludeIds.includes(b.id));
		if (openers.length === 0) {
			openers = KITCHEN_BRIEFS.filter((b) => (b.abstractness ?? 0) === 0);
		}
		if (openers.length > 0) {
			return pickFromPool(openers, random);
		}
	}

	let pool = buildPool(
		excludeIds,
		unlockedTiers,
		completedSeriesIds,
		commissionsCompleted,
		reputation
	);
	if (pool.length === 0) {
		pool = buildPool([], unlockedTiers, completedSeriesIds, commissionsCompleted, reputation);
	}
	return pickFromPool(pool, random);
}
