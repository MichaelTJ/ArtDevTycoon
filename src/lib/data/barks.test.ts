import { describe, expect, it } from 'vitest';
import { BARK_POOL, barkSpeakerLabel, linesForSpeaker } from './barks';

describe('BARK_POOL', () => {
	it('keeps every line within the 42-char soft cap', () => {
		for (const line of BARK_POOL) {
			expect(line.text.length).toBeLessThanOrEqual(42);
		}
	});

	it('uses unique bark ids', () => {
		expect(new Set(BARK_POOL.map((b) => b.id)).size).toBe(BARK_POOL.length);
	});

	it('has at least eight Mum lines', () => {
		expect(linesForSpeaker('mum').length).toBeGreaterThanOrEqual(8);
	});

	it('never uses print-shop as a floor speaker', () => {
		expect(BARK_POOL.every((b) => (b.speaker as string) !== 'print-shop')).toBe(true);
	});
});

describe('barkSpeakerLabel', () => {
	it('labels Mum and Marketing Director', () => {
		expect(barkSpeakerLabel('mum')).toBe('Mum');
		expect(barkSpeakerLabel('marketing-director')).toBe('Marketing Director');
	});
});
