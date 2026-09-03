import type { ExplorerResult, PromptFacets } from './types';

export function makeFacets(overrides: Partial<PromptFacets> = {}): PromptFacets {
	return {
		style: { key: 'crayon', label: 'Crayon', level: 1 },
		subject: { key: 'fox', label: 'Resting fox', level: 3 },
		lighting: { key: 'flatoverhead', label: 'Flat overhead', level: 1 },
		detail: { key: 'roughedges', label: 'Rough edges', level: 1 },
		mood: { key: 'serene', label: 'Serene' },
		...overrides
	};
}

export function makeResult(overrides: Partial<ExplorerResult> = {}): ExplorerResult {
	return {
		caseId: 'case-a',
		engineId: 'janus-webgpu',
		category: 'axis-style',
		categoryLabel: 'Axis — Art style (crayon → oil)',
		modifier: 'Novice · Crayon',
		subject: 'a red fox resting in tall grass',
		prompt:
			'art drawn by a five-year-old child with wax crayons, a red fox resting in tall grass, flat shadowless overhead lighting, rough uneven edges, a serene mood, perfectly centered subject on a flat solid background',
		facets: makeFacets(),
		imagePath: 'janus-webgpu/case-a.png',
		generationMs: 1000,
		generatedAt: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}
