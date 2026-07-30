import { describe, expect, it } from 'vitest';
import { LEVEL_1_BRIEFS } from '$lib/data/briefs';
import { calculatePayout, reputationGain, scorePrompt, toGalleryScore } from './scoring';

const c1 = LEVEL_1_BRIEFS.find((b) => b.id === 'c1')!;
const c2 = LEVEL_1_BRIEFS.find((b) => b.id === 'c2')!;
const c3 = LEVEL_1_BRIEFS.find((b) => b.id === 'c3')!;

describe('scorePrompt', () => {
	const cases = [
		{
			brief: c1,
			prompt: 'a cozy coffee cup on a wooden table',
			accuracy: 10,
			creativity: 2,
			payout: 76,
			galleryScore: 6,
			reputation: 2
		},
		{
			brief: c1,
			prompt: 'dragon',
			accuracy: 1,
			creativity: 1,
			payout: 10,
			galleryScore: 1,
			reputation: 0
		},
		{
			brief: c2,
			prompt:
				'an ancient glowing magical longsword embedded deep within a cracked granite stone, mystical blue runes',
			accuracy: 10,
			creativity: 6,
			payout: 132,
			galleryScore: 8,
			reputation: 3
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
		const result = scorePrompt(c1, 'a cozy coffee cup on a wooden table');
		expect([...result.matchedKeywords, ...result.missedKeywords]).toEqual(c1.preferredKeywords);
	});

	it('matches only sword for a minimal c2 prompt', () => {
		const result = scorePrompt(c2, 'a sword');
		expect(result.matchedKeywords).toEqual(['sword']);
		expect(result.missedKeywords).toEqual(['glowing', 'magic', 'stone']);
	});

	it('matches gold via substring overlap on c3', () => {
		const result = scorePrompt(c3, 'a fluffy cat with a golden crown');
		expect(result.matchedKeywords).toContain('gold');
	});

	it('is a pure function that does not mutate the brief', () => {
		const brief = { ...c1, preferredKeywords: [...c1.preferredKeywords] };
		const first = scorePrompt(brief, 'cozy coffee cup table');
		const second = scorePrompt(brief, 'cozy coffee cup table');
		expect(first).toEqual(second);
		expect(brief.preferredKeywords).toEqual(c1.preferredKeywords);
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
		// Perfect Grid 1.2 × (1 + lighting 0.05 + velvet 0.08) = 1.356
		expect(calculatePayout(brief, 10, 10, 1.356)).toBe(136);
		const brief150 = { ...c1, budget: 150 };
		// Tidy Rows 1.05 alone
		expect(calculatePayout(brief150, 8, 8, 1.05)).toBe(126);
	});
});
