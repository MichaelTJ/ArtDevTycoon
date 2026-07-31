import type { ClientBrief, InterpretationCluster } from '$lib/types/contracts';
import { keywordMatches } from './scoring';
import { normalize, stem, STOPWORDS } from './text';

export interface ClusterMatch {
	cluster: InterpretationCluster;
	/** Keywords from the cluster that fuzzy-matched the prompt. */
	matchedKeywords: string[];
	/** Keywords from the cluster that did not match. */
	missedKeywords: string[];
	/** matched / cluster.keywords.length, 0..1 */
	ratio: number;
}

/**
 * True when the brief should use interpretation-cluster scoring instead of
 * preferredKeywords. Concrete briefs (0) and prestige briefs without clusters
 * stay on the legacy path.
 */
export function usesInterpretationScoring(brief: ClientBrief): boolean {
	const level = brief.abstractness ?? 0;
	const clusters = brief.interpretationClusters;
	return level >= 1 && Array.isArray(clusters) && clusters.length > 0;
}

/** Score every cluster; highest ratio wins. Ties → first in array order. */
export function selectBestCluster(brief: ClientBrief, playerPrompt: string): ClusterMatch | null {
	const clusters = brief.interpretationClusters;
	if (!clusters || clusters.length === 0) return null;

	const promptStems = new Set(normalize(playerPrompt).map(stem));
	let best: ClusterMatch | null = null;

	for (const cluster of clusters) {
		const matchedKeywords: string[] = [];
		const missedKeywords: string[] = [];
		for (const keyword of cluster.keywords) {
			if (keywordMatches(keyword, promptStems)) matchedKeywords.push(keyword);
			else missedKeywords.push(keyword);
		}
		const ratio = matchedKeywords.length / cluster.keywords.length;
		const candidate: ClusterMatch = { cluster, matchedKeywords, missedKeywords, ratio };
		if (!best || candidate.ratio > best.ratio) best = candidate;
	}
	return best;
}

/**
 * Keywords a vision critic should ask about for this brief+prompt pair.
 * - Concrete / no clusters → preferredKeywords (unchanged).
 * - Abstract with a best cluster → that cluster's keywords.
 * - Abstract with zero cluster overlap → empty array (caller scores accuracy 1).
 */
export function critiqueTargetsForBrief(brief: ClientBrief, playerPrompt: string): string[] {
	if (!usesInterpretationScoring(brief)) {
		return [...brief.preferredKeywords];
	}
	const best = selectBestCluster(brief, playerPrompt);
	if (!best || best.ratio === 0) return [];
	return [...best.cluster.keywords];
}

/**
 * True when the prompt only echoes words from the vague request (and stopwords)
 * without hitting any cluster keyword. Used to keep parrot prompts at accuracy 1.
 */
export function isAbstractParrot(brief: ClientBrief, playerPrompt: string): boolean {
	if (!usesInterpretationScoring(brief)) return false;
	const best = selectBestCluster(brief, playerPrompt);
	if (best && best.ratio > 0) return false;

	const promptTokens = normalize(playerPrompt).filter((t) => !STOPWORDS.has(t));
	if (promptTokens.length === 0) return true;

	const requestStems = new Set(normalize(brief.requestText).map(stem));
	for (const kw of brief.preferredKeywords) {
		for (const t of normalize(kw)) requestStems.add(stem(t));
	}

	return promptTokens.every((t) => requestStems.has(stem(t)));
}
