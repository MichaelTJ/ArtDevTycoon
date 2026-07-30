import { AUCTION_BRIEFS } from '$lib/data/auctionBriefs';
import { BILLIONAIRE_BRIEFS } from '$lib/data/billionaireBriefs';
import { CORPORATE_BRIEFS } from '$lib/data/corporateBriefs';
import { clientBriefSchema, type ClientBrief, type ClientTier } from '$lib/types/contracts';
import { z } from 'zod';

/** Six Level 1 client briefs — enough variety for a five-commission run without repeats. */
const LEVEL_1_BRIEF_DEFS = [
	{
		id: 'c1',
		clientName: 'Local Cafe Owner',
		avatarUrl: '/avatars/c1.svg',
		requestText:
			'I need a painting of a cozy coffee cup sitting on a wooden table. Something warm for the back wall.',
		budget: 100,
		preferredKeywords: ['coffee', 'cup', 'cozy', 'table']
	},
	{
		id: 'c2',
		clientName: 'Fantasy Novelist',
		avatarUrl: '/avatars/c2.svg',
		requestText:
			'Draw me a glowing magical sword stuck in a stone. It is for the cover of my next book.',
		budget: 150,
		preferredKeywords: ['sword', 'glowing', 'magic', 'stone']
	},
	{
		id: 'c3',
		clientName: 'Cat Enthusiast',
		avatarUrl: '/avatars/c3.svg',
		requestText: 'A majestic fluffy cat wearing a tiny golden crown. Make him look regal.',
		budget: 120,
		preferredKeywords: ['cat', 'fluffy', 'crown', 'gold']
	},
	{
		id: 'c4',
		clientName: 'Retired Sailor',
		avatarUrl: '/avatars/c4.svg',
		requestText:
			'A little wooden sailboat on rough ocean waves at sunset. Reminds me of the old days.',
		budget: 130,
		preferredKeywords: ['sailboat', 'ocean', 'waves', 'sunset']
	},
	{
		id: 'c5',
		clientName: 'Indie Band Manager',
		avatarUrl: '/avatars/c5.svg',
		requestText: 'We need album art: a lonely astronaut floating above a neon city. Moody, please.',
		budget: 170,
		preferredKeywords: ['astronaut', 'floating', 'neon', 'city']
	},
	{
		id: 'c6',
		clientName: 'Botanical Gardener',
		avatarUrl: '/avatars/c6.svg',
		requestText: 'Could you paint a greenhouse full of blooming tropical flowers in morning light?',
		budget: 110,
		preferredKeywords: ['greenhouse', 'flowers', 'tropical', 'light']
	}
];

/** Parsed Level 1 walk-ins; object literals above omit `tier` and still parse via default. */
export const LEVEL_1_BRIEFS: readonly ClientBrief[] = z
	.array(clientBriefSchema)
	.parse(LEVEL_1_BRIEF_DEFS);

const ALL_PRESTIGE_BRIEFS: readonly ClientBrief[] = [
	...LEVEL_1_BRIEFS,
	...CORPORATE_BRIEFS,
	...BILLIONAIRE_BRIEFS,
	...AUCTION_BRIEFS
];

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
	completedSeriesIds: readonly string[]
): ClientBrief[] {
	const tierSet = new Set(unlockedTiers);
	return ALL_PRESTIGE_BRIEFS.filter((brief) => {
		if (!tierSet.has(briefTier(brief))) return false;
		if (excludeIds.includes(brief.id)) return false;
		return isSeriesEligible(brief, excludeIds, completedSeriesIds);
	});
}

/**
 * Choose the next client. `random` is injected so tests and replays are deterministic;
 * production passes nothing and gets `Math.random`.
 *
 * When every eligible brief has already been used the pool resets rather than returning
 * null, so a long run never runs out of clients. Corporate series always unlock in
 * order (1 → 2 → 3) via `excludeIds`.
 */
export function pickBrief(options?: {
	excludeIds?: readonly string[];
	/** Defaults to `['walk-in']` — existing callers unaffected. */
	unlockedTiers?: readonly ClientTier[];
	/** Series ids where all three commissions are already done. */
	completedSeriesIds?: readonly string[];
	random?: () => number;
}): ClientBrief {
	const random = options?.random ?? Math.random;
	const excludeIds = options?.excludeIds ?? [];
	const unlockedTiers = options?.unlockedTiers ?? ['walk-in'];
	const completedSeriesIds = options?.completedSeriesIds ?? [];

	let pool = buildPool(excludeIds, unlockedTiers, completedSeriesIds);
	if (pool.length === 0) {
		pool = buildPool([], unlockedTiers, completedSeriesIds);
	}
	const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
	return pool[index];
}
