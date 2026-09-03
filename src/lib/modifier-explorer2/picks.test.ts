import { describe, expect, it } from 'vitest';
import { generationTagKey, hasAnyGoodTag, isPromptTagGood, toggleGoodTagList } from './picks';
import { makeResult } from './test-fixtures';

describe('modifier explorer2 picks', () => {
	it('toggles good-tag keys', () => {
		expect(toggleGoodTagList([], 'subject:apple')).toEqual(['subject:apple']);
		expect(toggleGoodTagList(['subject:apple', 'rarity:common'], 'subject:apple')).toEqual([
			'rarity:common'
		]);
	});

	it('reads good tags from a result', () => {
		const result = makeResult({ goodTags: ['subject:apple', 'style:wireframe'] });
		expect(hasAnyGoodTag(result)).toBe(true);
		expect(isPromptTagGood(result, { kind: 'subject', id: 'apple' })).toBe(true);
		expect(generationTagKey({ kind: 'style', id: 'wireframe' })).toBe('style:wireframe');
	});
});
