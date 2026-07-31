import { KITCHEN_BRIEFS } from '$lib/data/kitchenBriefs';
import { describe, expect, it } from 'vitest';
import {
	critiqueTargetsForBrief,
	isAbstractParrot,
	selectBestCluster,
	usesInterpretationScoring
} from './abstractCritique';

const c1 = KITCHEN_BRIEFS.find((b) => b.id === 'c1')!;
const c6 = KITCHEN_BRIEFS.find((b) => b.id === 'c6')!;

describe('abstractCritique (c6 worked examples)', () => {
	const cases = [
		{
			prompt: 'I miss the old days',
			ratio: 0,
			parrot: true,
			targets: [] as string[]
		},
		{
			prompt: 'miss old',
			ratio: 0,
			parrot: true,
			targets: [] as string[]
		},
		{
			// Spec table listed ratio 0.75, but this prompt hits all four cluster keywords → 1.0.
			prompt: 'a faded sepia photograph in a family album',
			clusterId: 'nostalgia-photo',
			ratio: 1.0,
			parrot: false,
			targets: ['photograph', 'sepia', 'album', 'faded']
		},
		{
			// Explicit 3/4 hit so the 0.75 → accuracy 8 ladder stays covered.
			prompt: 'a faded sepia photograph of relatives',
			clusterId: 'nostalgia-photo',
			ratio: 0.75,
			parrot: false,
			targets: ['photograph', 'sepia', 'album', 'faded']
		},
		{
			prompt: 'sunday dinner with family around the tablecloth',
			clusterId: 'sunday-dinner',
			ratio: 1.0,
			parrot: false,
			targets: ['sunday', 'dinner', 'family', 'tablecloth']
		},
		{
			prompt: 'vinyl record playing under a warm lamp evening',
			clusterId: 'vinyl-evening',
			ratio: 1.0,
			parrot: false,
			targets: ['vinyl', 'record', 'lamp', 'evening']
		},
		{
			prompt: 'dragon spaceship laser',
			ratio: 0,
			parrot: false,
			targets: [] as string[]
		}
	] as const;

	for (const row of cases) {
		it(`scores "${row.prompt}"`, () => {
			const best = selectBestCluster(c6, row.prompt);
			expect(best?.ratio ?? 0).toBe(row.ratio);
			if ('clusterId' in row && row.clusterId) {
				expect(best?.cluster.id).toBe(row.clusterId);
			}
			expect(isAbstractParrot(c6, row.prompt)).toBe(row.parrot);
			expect([...critiqueTargetsForBrief(c6, row.prompt)].sort()).toEqual([...row.targets].sort());
		});
	}
});

describe('abstractCritique (concrete c1)', () => {
	it('does not use interpretation scoring', () => {
		expect(usesInterpretationScoring(c1)).toBe(false);
		expect(critiqueTargetsForBrief(c1, 'a fluffy cat')).toEqual(['cat']);
	});
});
