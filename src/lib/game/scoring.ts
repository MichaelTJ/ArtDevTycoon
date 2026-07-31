import type { ClientBrief } from '$lib/types/contracts';
import { isAbstractParrot, selectBestCluster, usesInterpretationScoring } from './abstractCritique';
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

/** Fuzzy keyword match used by `scorePrompt` and corporate palette checks. */
export function keywordMatches(keyword: string, promptStems: Set<string>): boolean {
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

/** Unique-word creativity score shared by concrete and abstract accuracy paths. */
export function creativityFromPrompt(playerPrompt: string): number {
	const promptTokens = normalize(playerPrompt);
	const meaningful = promptTokens.filter((t) => !STOPWORDS.has(t)).map(stem);
	const unique = new Set(meaningful).size;
	return clamp(Math.round(1 + ((unique - 3) / 17) * 9), 1, 10);
}

function scoreAbstractPrompt(brief: ClientBrief, playerPrompt: string): ScoreBreakdown {
	if (isAbstractParrot(brief, playerPrompt)) {
		return {
			matchedKeywords: [],
			missedKeywords: brief.interpretationClusters?.flatMap((c) => c.keywords) ?? [],
			accuracyScore: 1,
			creativityScore: creativityFromPrompt(playerPrompt)
		};
	}

	const best = selectBestCluster(brief, playerPrompt);
	if (!best || best.ratio === 0) {
		return {
			matchedKeywords: [],
			missedKeywords: brief.interpretationClusters?.flatMap((c) => c.keywords) ?? [],
			accuracyScore: 2,
			creativityScore: creativityFromPrompt(playerPrompt)
		};
	}

	const accuracyScore = clamp(Math.round(1 + best.ratio * 9), 1, 10);
	return {
		matchedKeywords: best.matchedKeywords,
		missedKeywords: best.missedKeywords,
		accuracyScore,
		creativityScore: creativityFromPrompt(playerPrompt)
	};
}

/**
 * Score a player's prompt against a client brief. Keyword matching is fuzzy via
 * stemming and substring overlap; creativity rewards unique descriptive words.
 * Abstract briefs (spec 18) score against interpretation clusters instead.
 */
export function scorePrompt(brief: ClientBrief, playerPrompt: string): ScoreBreakdown {
	if (usesInterpretationScoring(brief)) {
		return scoreAbstractPrompt(brief, playerPrompt);
	}

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

	return {
		matchedKeywords,
		missedKeywords,
		accuracyScore,
		creativityScore: creativityFromPrompt(playerPrompt)
	};
}

/**
 * Cash awarded for a commission. Accuracy is weighted more heavily than creativity
 * because the client is paying for their brief to be served — except abstract briefs,
 * which tilt 50/50 so committing to an interpretation is rewarded.
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
	const accuracyWeight = usesInterpretationScoring(brief) ? 0.5 : 0.7;
	const creativityWeight = 1 - accuracyWeight;
	const quality = (accuracyScore * accuracyWeight + creativityScore * creativityWeight) / 10;
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
