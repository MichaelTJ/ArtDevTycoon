import type { ExplorerResult, PromptFacets } from './types';

export function makeFacets(overrides: Partial<PromptFacets> = {}): PromptFacets {
	return {
		style: { key: 'crayon', label: 'a messy wax crayon drawing', level: 1 },
		subject: { key: 'fox', label: 'resting fox', level: 3 },
		lighting: { key: 'flatoverhead', label: 'flat, shadowless overhead lighting', level: 1 },
		detail: { key: 'roughedges', label: 'rough uneven edges and splotchy color fills', level: 1 },
		mood: { key: 'serene', label: 'a serene mood' },
		...overrides
	};
}

export function makeResult(overrides: Partial<ExplorerResult> = {}): ExplorerResult {
	return {
		caseId: 'case-a',
		engineId: 'janus-webgpu',
		category: 'axis-style',
		categoryLabel: 'Axis — Art style (crayon → oil)',
		modifier: 'Novice · a messy wax crayon drawing',
		subject: 'a red fox resting in tall grass',
		prompt:
			'a messy wax crayon drawing, a red fox resting in tall grass, flat, shadowless overhead lighting, rough uneven edges and splotchy color fills, a serene mood',
		facets: makeFacets(),
		imagePath: 'janus-webgpu/case-a.png',
		generationMs: 1000,
		generatedAt: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}
