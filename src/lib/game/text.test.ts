import { describe, expect, it } from 'vitest';
import { normalize, stem } from './text';

describe('normalize', () => {
	it('lowercases, strips punctuation, and splits on whitespace', () => {
		expect(normalize('A cozy, coffee-cup!')).toEqual(['a', 'cozy', 'coffee', 'cup']);
	});

	it('returns an empty array for whitespace-only input', () => {
		expect(normalize('   ')).toEqual([]);
	});

	it('preserves digits and collapses runs of spaces', () => {
		expect(normalize('Cat 42 wearing a CROWN')).toEqual(['cat', '42', 'wearing', 'a', 'crown']);
	});
});

describe('stem', () => {
	it('strips common suffixes when enough characters remain', () => {
		expect(stem('glowing')).toBe('glow');
		expect(stem('cups')).toBe('cup');
		expect(stem('runes')).toBe('run');
		expect(stem('cracked')).toBe('crack');
	});

	it('leaves short or unsuffixed tokens unchanged', () => {
		expect(stem('cat')).toBe('cat');
		expect(stem('coffee')).toBe('coffee');
		expect(stem('table')).toBe('table');
		expect(stem('is')).toBe('is');
	});
});
