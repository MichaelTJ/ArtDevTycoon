import { describe, expect, it } from 'vitest';
import {
	generationTagKey,
	hasAnyGoodTag,
	isPromptTagGood,
	toggleGoodTagList
} from './picks';
import { makeResult } from './test-fixtures';

describe('modifier explorer good prompt-tags', () => {
	it('toggles good tag keys', () => {
		expect(toggleGoodTagList([], 'style:crayon')).toEqual(['style:crayon']);
		expect(toggleGoodTagList(['style:crayon', 'mood:serene'], 'style:crayon')).toEqual([
			'mood:serene'
		]);
	});

	it('detects good prompt-tags on a result', () => {
		const result = makeResult({ goodTags: ['style:crayon', 'subject:fox'] });
		expect(hasAnyGoodTag(result)).toBe(true);
		expect(isPromptTagGood(result, { kind: 'style', id: 'crayon' })).toBe(true);
		expect(isPromptTagGood(result, { kind: 'mood', id: 'serene' })).toBe(false);
		expect(generationTagKey({ kind: 'lighting', id: 'chiaroscuro' })).toBe('lighting:chiaroscuro');
	});
});
