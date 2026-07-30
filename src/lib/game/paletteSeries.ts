import { keywordMatches } from './scoring';
import { normalize, stem } from './text';

export interface SeriesCheckResult {
	/** How many of the palette words this single prompt used. */
	paletteWordsUsed: number;
	/** True once >= 2 of 3 words are present — the bar for "on brand" on this piece. */
	onBrand: boolean;
}

/** Fuzzy-matches palette words against a prompt using the same stemming as `scorePrompt`. */
export function checkPaletteUsage(prompt: string, paletteConstraint: string[]): SeriesCheckResult {
	const promptStems = new Set(normalize(prompt).map(stem));
	let paletteWordsUsed = 0;
	for (const word of paletteConstraint) {
		if (keywordMatches(word, promptStems)) {
			paletteWordsUsed += 1;
		}
	}
	return {
		paletteWordsUsed,
		onBrand: paletteWordsUsed >= 2
	};
}

/**
 * Called once the 3rd piece in a series is collected. `onBrandFlags` has exactly 3
 * entries, one per piece in series order. Returns the flat bonus paid on top of the
 * 3rd piece's own payout — 0 if the series wasn't kept consistent.
 */
export function seriesCompletionBonus(onBrandFlags: boolean[]): number {
	const allOnBrand = onBrandFlags.length === 3 && onBrandFlags.every(Boolean);
	return allOnBrand ? 300 : 0;
}

/**
 * Series ids where every brief in the series appears in `completedBriefIds`
 * (all three commissions collected).
 */
export function fullyCompletedSeriesIds(
	completedBriefIds: readonly string[],
	corporateBriefs: readonly { id: string; seriesId?: string }[]
): string[] {
	const completed = new Set(completedBriefIds);
	const bySeries = new Map<string, string[]>();
	for (const brief of corporateBriefs) {
		if (!brief.seriesId) continue;
		const list = bySeries.get(brief.seriesId) ?? [];
		list.push(brief.id);
		bySeries.set(brief.seriesId, list);
	}
	const done: string[] = [];
	for (const [seriesId, ids] of bySeries) {
		if (ids.length > 0 && ids.every((id) => completed.has(id))) {
			done.push(seriesId);
		}
	}
	return done;
}
