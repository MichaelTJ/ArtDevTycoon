import type { ExplorerResult, PromptFacets } from './types';

export function makeFacets(overrides: Partial<PromptFacets> = {}): PromptFacets {
	return {
		round: { key: 'round1', label: 'Round 1' },
		subject: { key: 'apple', label: 'Apple' },
		rarity: { key: 'common', label: 'Common' },
		variant: { key: 'v0', label: 'Shot 1' },
		...overrides
	};
}

export function makeResult(overrides: Partial<ExplorerResult> = {}): ExplorerResult {
	return {
		caseId: 'round1-objects-common-apple-v0',
		engineId: 'janus-webgpu',
		category: 'round1-objects',
		categoryLabel: 'Round 1 — Objects (common → rare)',
		modifier: 'Common · Apple · Shot 1',
		subject: 'a red apple',
		prompt: 'A detailed sketch of a red apple',
		facets: makeFacets(),
		imagePath: 'janus-webgpu/round1-objects-common-apple-v0.png',
		generationMs: 1000,
		generatedAt: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}
