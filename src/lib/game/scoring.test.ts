import { describe, expect, it } from 'vitest';
import { KITCHEN_BRIEFS } from '$lib/data/kitchenBriefs';
import { calculatePayout, reputationGain, scorePrompt, toGalleryScore } from './scoring';

const c1 = KITCHEN_BRIEFS.find((b) => b.id === 'c1')!;
const c2 = KITCHEN_BRIEFS.find((b) => b.id === 'c2')!;
const c6 = KITCHEN_BRIEFS.find((b) => b.id === 'c6')!;

describe('scorePrompt', () => {
	const cases = [
		{
			brief: c1,
			prompt: 'cat',
			accuracy: 10,
			creativity: 1,
			payout: 73,
			galleryScore: 5.5,
			reputation: 1
		},
		{
			brief: c1,
			prompt: 'dog',
			accuracy: 1,
			creativity: 1,
			payout: 10,
			galleryScore: 1,
			reputation: 0
		},
		{
			brief: c2,
			prompt: 'a nice cup of tea on the kitchen table with steam rising softly',
			accuracy: 10,
			creativity: 4,
			payout: 90,
			galleryScore: 7,
			reputation: 2
		},
		{
			brief: c1,
			prompt: '',
			accuracy: 1,
			creativity: 1,
			payout: 10,
			galleryScore: 1,
			reputation: 0
		}
	] as const;

	for (const [index, row] of cases.entries()) {
		it(`matches hand-computed row ${index + 1}`, () => {
			const result = scorePrompt(row.brief, row.prompt);
			expect(result.accuracyScore).toBe(row.accuracy);
			expect(result.creativityScore).toBe(row.creativity);
			expect(calculatePayout(row.brief, result.accuracyScore, result.creativityScore)).toBe(
				row.payout
			);
			expect(toGalleryScore(result.accuracyScore, result.creativityScore)).toBe(row.galleryScore);
			expect(reputationGain(result.accuracyScore, result.creativityScore)).toBe(row.reputation);
		});
	}

	it('partitions keywords into matched and missed in brief order', () => {
		const result = scorePrompt(c1, 'a fluffy cat');
		expect([...result.matchedKeywords, ...result.missedKeywords]).toEqual(c1.preferredKeywords);
	});

	it('matches only tea for a minimal c2 prompt', () => {
		const result = scorePrompt(c2, 'tea');
		expect(result.matchedKeywords).toEqual(['tea']);
		expect(result.missedKeywords).toEqual(['cup']);
	});

	it('is a pure function that does not mutate the brief', () => {
		const brief = { ...c1, preferredKeywords: [...c1.preferredKeywords] };
		const first = scorePrompt(brief, 'cat');
		const second = scorePrompt(brief, 'cat');
		expect(first).toEqual(second);
		expect(brief.preferredKeywords).toEqual(c1.preferredKeywords);
	});

	it('scores c6 parrot prompt at accuracy 1', () => {
		expect(scorePrompt(c6, 'I miss the old days').accuracyScore).toBe(1);
	});

	it('scores c6 nostalgia full match at accuracy 10', () => {
		expect(scorePrompt(c6, 'a faded sepia photograph in a family album').accuracyScore).toBe(10);
	});

	it('scores c6 nostalgia 3/4 match at accuracy 8', () => {
		expect(scorePrompt(c6, 'a faded sepia photograph of relatives').accuracyScore).toBe(8);
	});

	it('scores c6 sunday-dinner cluster at accuracy 10', () => {
		expect(scorePrompt(c6, 'sunday dinner with family around the tablecloth').accuracyScore).toBe(
			10
		);
	});
});

describe('calculatePayout', () => {
	it('never exceeds the brief budget, even with out-of-range scores', () => {
		expect(calculatePayout(c1, 99, 99)).toBe(c1.budget);
		expect(calculatePayout(c2, 99, 99)).toBe(c2.budget);
	});

	it('applies an optional payout multiplier', () => {
		const brief = { ...c1, budget: 100 };
		expect(calculatePayout(brief, 10, 10, 1.0)).toBe(100);
		expect(calculatePayout(brief, 10, 10, 1.5)).toBe(150);
		expect(calculatePayout(brief, 6, 4, 1.5)).toBe(81);
		expect(calculatePayout(brief, 1, 1, 2.2)).toBe(22);
	});

	it('accepts layout × atmosphere composition numbers from spec 14', () => {
		const brief = { ...c1, budget: 100 };
		expect(calculatePayout(brief, 10, 10, 1.356)).toBe(136);
		const brief150 = { ...c1, budget: 150 };
		expect(calculatePayout(brief150, 8, 8, 1.05)).toBe(126);
	});

	it('uses 0.5/0.5 weights for abstract briefs', () => {
		expect(calculatePayout(c6, 10, 10, 1)).toBe(130);
		expect(calculatePayout(c6, 1, 10, 1)).toBe(72);
	});
});
