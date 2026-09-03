import { describe, expect, it } from 'vitest';
import {
	BROWSE_PRESETS,
	EMPTY_BROWSE_QUERY,
	applyBrowsePreset,
	filterTaggedResults,
	groupTaggedResults,
	listGenerationTags,
	summarizeGoodPromptTags,
	tagResults,
	toggleGenerationTagInQuery
} from './browse';
import { hasAnyGoodTag } from './picks';
import { makeFacets, makeResult } from './test-fixtures';

describe('modifier explorer2 browse', () => {
	it('lists round/subject/rarity/variant tags from facets', () => {
		const tags = listGenerationTags(makeResult());
		expect(tags.map((t) => `${t.kind}:${t.id}`)).toEqual([
			'round:round1',
			'subject:apple',
			'rarity:common',
			'variant:v0'
		]);
	});

	it('filters by rarity and subject', () => {
		const tagged = tagResults([
			makeResult({ caseId: 'a' }),
			makeResult({
				caseId: 'b',
				facets: makeFacets({
					subject: { key: 'narwhal', label: 'Narwhal' },
					rarity: { key: 'rare', label: 'Rare' }
				})
			})
		]);
		const hits = filterTaggedResults(
			tagged,
			{ ...EMPTY_BROWSE_QUERY, rarities: ['common'] },
			hasAnyGoodTag
		);
		expect(hits).toHaveLength(1);
		expect(hits[0]?.result.caseId).toBe('a');
	});

	it('applies Round 1 preset', () => {
		const preset = BROWSE_PRESETS.find((p) => p.id === 'round1');
		expect(preset).toBeTruthy();
		const query = applyBrowsePreset(EMPTY_BROWSE_QUERY, preset!);
		expect(query.category).toBe('round1-objects');
		expect(preset!.groupBy).toBe('rarity');
	});

	it('applies Round 5 preset', () => {
		const preset = BROWSE_PRESETS.find((p) => p.id === 'round5');
		expect(preset).toBeTruthy();
		const query = applyBrowsePreset(EMPTY_BROWSE_QUERY, preset!);
		expect(query.category).toBe('round5-retries');
		expect(preset!.groupBy).toBe('style');
	});

	it('applies Round 6 preset', () => {
		const preset = BROWSE_PRESETS.find((p) => p.id === 'round6');
		expect(preset).toBeTruthy();
		const query = applyBrowsePreset(EMPTY_BROWSE_QUERY, preset!);
		expect(query.category).toBe('round6-backgrounds');
		expect(preset!.groupBy).toBe('background');
	});

	it('applies Round 7 preset', () => {
		const preset = BROWSE_PRESETS.find((p) => p.id === 'round7');
		expect(preset).toBeTruthy();
		const query = applyBrowsePreset(EMPTY_BROWSE_QUERY, preset!);
		expect(query.category).toBe('round7-backgrounds');
		expect(preset!.groupBy).toBe('background');
	});

	it('groups by rarity in common → very-rare order', () => {
		const tagged = tagResults([
			makeResult({
				caseId: 'rare',
				facets: makeFacets({ rarity: { key: 'rare', label: 'Rare' } })
			}),
			makeResult({
				caseId: 'common',
				facets: makeFacets({ rarity: { key: 'common', label: 'Common' } })
			})
		]);
		const groups = groupTaggedResults(tagged, 'rarity');
		expect(groups.map((g) => g.id)).toEqual(['common', 'rare']);
	});

	it('summarises good subject tags', () => {
		const results = [
			makeResult({ caseId: 'a', goodTags: ['subject:apple'] }),
			makeResult({ caseId: 'b', goodTags: ['subject:apple', 'rarity:common'] })
		];
		const summary = summarizeGoodPromptTags(results);
		expect(summary.find((row) => row.id === 'apple')?.count).toBe(2);
	});

	it('toggles subject tags into the browse query', () => {
		const tag = { kind: 'subject' as const, id: 'apple', label: 'Apple' };
		const next = toggleGenerationTagInQuery(EMPTY_BROWSE_QUERY, tag);
		expect(next.subjects).toEqual(['apple']);
	});
});
