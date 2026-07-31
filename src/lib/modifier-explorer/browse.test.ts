import { describe, expect, it } from 'vitest';
import {
	BROWSE_PRESETS,
	EMPTY_BROWSE_QUERY,
	applyBrowsePreset,
	collectFacetOptions,
	collectLevelOptions,
	filterTaggedResults,
	groupTaggedResults,
	isGenerationTagActive,
	listGenerationTags,
	summarizeGoodPromptTags,
	tagResults,
	toggleGenerationTagInQuery
} from './browse';
import { hasAnyGoodTag } from './picks';
import { makeFacets, makeResult } from './test-fixtures';

function emptyQuery() {
	return {
		...EMPTY_BROWSE_QUERY,
		keys: { style: [], subject: [], lighting: [], detail: [] },
		levels: { style: [], subject: [], lighting: [], detail: [] }
	};
}

describe('modifier explorer browse', () => {
	it('lists generation tags straight from the exact facets used to make the image', () => {
		const result = makeResult({
			facets: makeFacets({
				subject: { key: 'horse', label: 'galloping horse', level: 5 },
				style: { key: 'pencilsketch', label: 'a rough graphite pencil sketch', level: 2 }
			})
		});
		const tags = listGenerationTags(result);
		expect(tags.some((tag) => tag.kind === 'subject' && tag.id === 'horse')).toBe(true);
		expect(tags.some((tag) => tag.kind === 'style' && tag.id === 'pencilsketch')).toBe(true);
		expect(tags.some((tag) => tag.kind === 'mood')).toBe(true);
	});

	it('toggles generation tags into the browse query', () => {
		const tag = { kind: 'style' as const, id: 'crayon', label: 'Crayon' };
		const next = toggleGenerationTagInQuery(emptyQuery(), tag);
		expect(isGenerationTagActive(next, tag)).toBe(true);
		expect(isGenerationTagActive(toggleGenerationTagInQuery(next, tag), tag)).toBe(false);
	});

	it('filters by exact style key', () => {
		const tagged = tagResults([
			makeResult({
				caseId: 'crayon-fox',
				facets: makeFacets({ style: { key: 'crayon', label: 'crayon drawing', level: 1 } })
			}),
			makeResult({
				caseId: 'oil-owl',
				facets: makeFacets({
					style: { key: 'oilpainting', label: 'oil painting', level: 5 },
					subject: { key: 'owl', label: 'perched owl', level: 3 }
				})
			})
		]);

		const query = { ...emptyQuery(), keys: { ...emptyQuery().keys, style: ['crayon'] } };
		const hits = filterTaggedResults(tagged, query, hasAnyGoodTag);
		expect(hits).toHaveLength(1);
		expect(hits[0]?.result.caseId).toBe('crayon-fox');
	});

	it('filters by axis level regardless of exact key', () => {
		const tagged = tagResults([
			makeResult({
				caseId: 'a',
				facets: makeFacets({ lighting: { key: 'chiaroscuro', label: 'chiaroscuro', level: 5 } })
			}),
			makeResult({
				caseId: 'b',
				facets: makeFacets({ lighting: { key: 'flatoverhead', label: 'flat light', level: 1 } })
			})
		]);
		const query = { ...emptyQuery(), levels: { ...emptyQuery().levels, lighting: [5 as const] } };
		const hits = filterTaggedResults(tagged, query, hasAnyGoodTag);
		expect(hits).toHaveLength(1);
		expect(hits[0]?.result.caseId).toBe('a');
	});

	it('applies the style spectrum preset', () => {
		const preset = BROWSE_PRESETS.find((p) => p.id === 'style-spectrum');
		expect(preset).toBeTruthy();
		const query = applyBrowsePreset(emptyQuery(), preset!);
		expect(query.category).toBe('axis-style');
		expect(preset!.groupBy).toBe('style-level');
	});

	it('summarises good prompt-tags by tag key', () => {
		const results = [
			makeResult({
				caseId: 'a',
				goodTags: ['subject:fox', 'style:crayon'],
				facets: makeFacets({ subject: { key: 'fox', label: 'resting fox', level: 3 } })
			}),
			makeResult({
				caseId: 'b',
				goodTags: ['subject:fox'],
				facets: makeFacets({ subject: { key: 'fox', label: 'resting fox', level: 3 } })
			}),
			makeResult({
				caseId: 'c',
				facets: makeFacets({ subject: { key: 'owl', label: 'perched owl', level: 3 } })
			})
		];
		const summary = summarizeGoodPromptTags(results);
		expect(summary.find((row) => row.id === 'fox')?.count).toBe(2);
		expect(summary.find((row) => row.id === 'crayon')?.count).toBe(1);
	});

	it('groups into style-level lanes ordered novice → expert', () => {
		const tagged = tagResults([
			makeResult({
				caseId: 'expert',
				facets: makeFacets({ style: { key: 'oilpainting', label: 'oil painting', level: 5 } })
			}),
			makeResult({
				caseId: 'novice',
				facets: makeFacets({ style: { key: 'crayon', label: 'crayon drawing', level: 1 } })
			})
		]);
		const groups = groupTaggedResults(tagged, 'style-level');
		expect(groups.map((group) => group.id)).toEqual(['1', '5']);
	});

	it('collects facet options with counts, sorted by level', () => {
		const tagged = tagResults([
			makeResult({
				caseId: 'a',
				facets: makeFacets({ subject: { key: 'fox', label: 'resting fox', level: 3 } })
			}),
			makeResult({
				caseId: 'b',
				facets: makeFacets({ subject: { key: 'fox', label: 'resting fox', level: 3 } })
			})
		]);
		expect(
			collectFacetOptions(tagged, 'subject').find((option) => option.id === 'fox')?.count
		).toBe(2);
	});

	it('collects level options independent of exact key', () => {
		const tagged = tagResults([
			makeResult({
				caseId: 'a',
				facets: makeFacets({ detail: { key: 'roughedges', label: 'rough', level: 1 } })
			}),
			makeResult({
				caseId: 'b',
				facets: makeFacets({ detail: { key: 'hyperdetail', label: '8k detail', level: 5 } })
			})
		]);
		const options = collectLevelOptions(tagged, 'detail');
		expect(options.map((o) => o.level)).toEqual([1, 5]);
	});
});
