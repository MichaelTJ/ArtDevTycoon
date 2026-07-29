import { clientBriefSchema } from '$lib/types/contracts';
import { describe, expect, it } from 'vitest';
import { LEVEL_1_BRIEFS, pickBrief } from './briefs';

describe('LEVEL_1_BRIEFS', () => {
	it('has six briefs with unique ids', () => {
		expect(LEVEL_1_BRIEFS).toHaveLength(6);
		const ids = LEVEL_1_BRIEFS.map((b) => b.id);
		expect(new Set(ids).size).toBe(6);
	});

	it('parses every brief against clientBriefSchema', () => {
		for (const brief of LEVEL_1_BRIEFS) {
			expect(clientBriefSchema.parse(brief)).toEqual(brief);
		}
	});
});

describe('pickBrief', () => {
	it('returns c1 when random is 0', () => {
		expect(pickBrief({ random: () => 0 }).id).toBe('c1');
	});

	it('returns c6 when random is 0.99', () => {
		expect(pickBrief({ random: () => 0.99 }).id).toBe('c6');
	});

	it('returns c6 and does not throw when random is exactly 1', () => {
		expect(pickBrief({ random: () => 1 }).id).toBe('c6');
	});

	it('skips excluded ids', () => {
		expect(pickBrief({ excludeIds: ['c1'], random: () => 0 }).id).toBe('c2');
	});

	it('resets the pool when every brief is excluded', () => {
		expect(
			pickBrief({
				excludeIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
				random: () => 0
			}).id
		).toBe('c1');
	});

	it('does not mutate LEVEL_1_BRIEFS', () => {
		const before = LEVEL_1_BRIEFS.map((b) => b.id);
		pickBrief({ random: () => 0.5 });
		expect(LEVEL_1_BRIEFS.map((b) => b.id)).toEqual(before);
	});
});
