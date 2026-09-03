import { describe, expect, it } from 'vitest';
import { KITCHEN_BRIEFS } from '$lib/data/kitchenBriefs';
import {
	accuracyFromHits,
	buildTitle,
	cleanReview,
	critiqueTargetsForBrief,
	parseYesNo
} from './critiqueProtocol';

const c1 = KITCHEN_BRIEFS.find((b) => b.id === 'c1')!;
const c6 = KITCHEN_BRIEFS.find((b) => b.id === 'c6')!;

describe('accuracyFromHits', () => {
	it('maps the full ladder for four keywords', () => {
		expect(accuracyFromHits(0, 4)).toBe(1);
		expect(accuracyFromHits(1, 4)).toBe(3);
		expect(accuracyFromHits(2, 4)).toBe(6);
		expect(accuracyFromHits(3, 4)).toBe(8);
		expect(accuracyFromHits(4, 4)).toBe(10);
	});

	it('returns 1 when total is zero', () => {
		expect(accuracyFromHits(0, 0)).toBe(1);
	});
});

describe('parseYesNo', () => {
	it('accepts clear yes answers', () => {
		expect(parseYesNo('Yes')).toBe(true);
		expect(parseYesNo('yes, clearly')).toBe(true);
	});

	it('rejects no, ambiguous, and empty answers', () => {
		expect(parseYesNo('No.')).toBe(false);
		expect(parseYesNo('I cannot tell')).toBe(false);
		expect(parseYesNo('')).toBe(false);
	});

	it('does not treat yesterday as yes', () => {
		expect(parseYesNo('yesterday')).toBe(false);
	});
});

describe('buildTitle', () => {
	it('is deterministic for the same seed', () => {
		const a = buildTitle('a cozy coffee cup', 42);
		const b = buildTitle('a cozy coffee cup', 42);
		expect(a).toBe(b);
	});

	it('never exceeds 120 characters', () => {
		const longPrompt = 'supercalifragilisticexpialidocious '.repeat(20);
		expect(buildTitle(longPrompt, 7).length).toBeLessThanOrEqual(120);
	});

	it('returns Untitled Study when no meaningful tokens remain', () => {
		expect(buildTitle('a the of', 1)).toBe('Untitled Study');
	});
});

describe('cleanReview', () => {
	it('returns the fallback for whitespace-only input', () => {
		expect(cleanReview('   ', 'Fallback review.')).toBe('Fallback review.');
	});

	it('truncates long input to at most 600 characters', () => {
		const long = 'word '.repeat(300);
		expect(cleanReview(long, 'Fallback.').length).toBeLessThanOrEqual(600);
	});
});

describe('critiqueTargetsForBrief (re-export)', () => {
	it('returns preferredKeywords for concrete briefs', () => {
		expect(critiqueTargetsForBrief(c1, 'a fluffy cat')).toEqual(['cat', 'cool']);
	});

	it('returns cluster keywords for a committed abstract reading', () => {
		expect(
			[...critiqueTargetsForBrief(c6, 'sunday dinner with family around the tablecloth')].sort()
		).toEqual(['dinner', 'family', 'sunday', 'tablecloth']);
	});

	it('returns empty targets for an abstract parrot', () => {
		expect(critiqueTargetsForBrief(c6, 'I miss the old days')).toEqual([]);
	});
});
