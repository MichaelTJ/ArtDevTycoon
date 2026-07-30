import type { ClientBrief } from '$lib/types/contracts';
import { normalize, stem, STOPWORDS } from './text';

export interface ScoreBreakdown {
	/** Brief keywords the prompt satisfied, in the brief's original order. */
	matchedKeywords: string[];
	/** Brief keywords the prompt missed, in the brief's original order. */
	missedKeywords: string[];
	/** How well the prompt served the brief, 1-10. */
	accuracyScore: number;
	/** How detailed and imaginative the prompt was, 1-10. */
	creativityScore: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function keywordMatches(keyword: string, promptStems: Set<string>): boolean {
	const keywordTokens = normalize(keyword);
	return keywordTokens.every((kt) => {
		const ks = stem(kt);
		if (promptStems.has(ks)) {
			return true;
		}
		if (ks.length >= 4) {
			for (const ps of promptStems) {
				if (ps.includes(ks)) {
					return true;
				}
			}
		}
		return false;
	});
}

/**
 * Score a player's prompt against a client brief. Keyword matching is fuzzy via
 * stemming and substring overlap; creativity rewards unique descriptive words.
 */
export function scorePrompt(brief: ClientBrief, playerPrompt: string): ScoreBreakdown {
	const promptTokens = normalize(playerPrompt);
	const promptStems = new Set(promptTokens.map(stem));

	const matchedKeywords: string[] = [];
	const missedKeywords: string[] = [];

	for (const keyword of brief.preferredKeywords) {
		if (keywordMatches(keyword, promptStems)) {
			matchedKeywords.push(keyword);
		} else {
			missedKeywords.push(keyword);
		}
	}

	const ratio = matchedKeywords.length / brief.preferredKeywords.length;
	const accuracyScore = clamp(Math.round(1 + ratio * 9), 1, 10);

	const meaningful = promptTokens.filter((t) => !STOPWORDS.has(t)).map(stem);
	const unique = new Set(meaningful).size;
	const creativityScore = clamp(Math.round(1 + ((unique - 3) / 17) * 9), 1, 10);

	return { matchedKeywords, missedKeywords, accuracyScore, creativityScore };
}

/**
 * Cash awarded for a commission. Accuracy is weighted more heavily than creativity
 * because the client is paying for their brief to be served.
 *
 * `multiplier` (default 1) is the progression seam — medium tier × layout × atmosphere
 * compose outside this function and pass a single number in.
 */
export function calculatePayout(
	brief: ClientBrief,
	accuracyScore: number,
	creativityScore: number,
	multiplier = 1
): number {
	const quality = (accuracyScore * 0.7 + creativityScore * 0.3) / 10;
	return clamp(
		Math.round(brief.budget * quality * multiplier),
		0,
		Math.round(brief.budget * multiplier)
	);
}

/** Mean of accuracy and creativity, rounded to one decimal place for the gallery. */
export function toGalleryScore(accuracyScore: number, creativityScore: number): number {
	return Math.round(((accuracyScore + creativityScore) / 2) * 10) / 10;
}

/**
 * Reputation earned from a commission. Accumulates for Level 2; unused in Level 1
 * win conditions but keeps the economy consistent across levels.
 */
export function reputationGain(accuracyScore: number, creativityScore: number): number {
	const avg = (accuracyScore + creativityScore) / 2;
	if (avg >= 8) return 3;
	if (avg >= 6) return 2;
	if (avg >= 4) return 1;
	return 0;
}
