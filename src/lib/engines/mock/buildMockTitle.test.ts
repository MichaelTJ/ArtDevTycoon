import { describe, expect, it } from 'vitest';
import { buildMockTitle } from './buildMockTitle';

describe('buildMockTitle', () => {
	it('is deterministic for the same seed', () => {
		const prompt = 'a cat wearing a crown in a sunny garden';
		expect(buildMockTitle(prompt, 42)).toBe(buildMockTitle(prompt, 42));
	});

	it('includes more meaningful words than the two-token protocol default', () => {
		const title = buildMockTitle('a cat wearing a crown in a sunny garden', 42);
		const contentWords = title.split(' ').slice(2);
		expect(contentWords.length).toBeGreaterThan(2);
	});

	it('never exceeds 120 characters', () => {
		const longPrompt = 'supercalifragilisticexpialidocious '.repeat(20);
		expect(buildMockTitle(longPrompt, 7).length).toBeLessThanOrEqual(120);
	});

	it('returns Untitled Study when no meaningful tokens remain', () => {
		expect(buildMockTitle('a the of', 1)).toBe('Untitled Study');
	});
});
