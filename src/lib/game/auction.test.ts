import { describe, expect, it } from 'vitest';
import { resolveAuction } from './auction';

function sequence(values: number[]): () => number {
	let i = 0;
	return () => {
		const value = values[Math.min(i, values.length - 1)] ?? 0;
		i += 1;
		return value;
	};
}

describe('resolveAuction', () => {
	it('floors at reserve when quality is 0 and wobble is minimal', () => {
		const result = resolveAuction(0, 200, sequence([0, 0, 0]));
		expect(result.bidderCount).toBe(3);
		expect(result.bids).toEqual([80, 80, 80]);
		expect(result.winningBid).toBe(200);
	});

	it('pays 320 at quality 10 with minimal wobble', () => {
		const result = resolveAuction(10, 200, sequence([0, 0, 0, 0, 0, 0, 0, 0]));
		expect(result.bidderCount).toBe(8);
		expect(result.bids).toEqual([320, 320, 320, 320, 320, 320, 320, 320]);
		expect(result.winningBid).toBe(320);
	});

	it('lets a high wobble raise the winning bid', () => {
		const result = resolveAuction(10, 200, sequence([1, 0, 0, 0, 0, 0, 0, 0]));
		expect(result.bidderCount).toBe(8);
		expect(result.bids[0]).toBe(560);
		expect(result.bids.slice(1)).toEqual([320, 320, 320, 320, 320, 320, 320]);
		expect(result.winningBid).toBe(560);
	});

	it('matches the mid-quality worked example', () => {
		const result = resolveAuction(5, 400, sequence([0.5, 0.5, 0.5, 0.5, 0.5]));
		expect(result.bidderCount).toBe(5);
		expect(result.bids).toEqual([550, 550, 550, 550, 550]);
		expect(result.winningBid).toBe(550);
	});

	it('does not clamp bidderCount above 8 for scores above 10', () => {
		const result = resolveAuction(12, 200, () => 0);
		expect(result.bidderCount).toBe(3 + Math.floor(12 / 2));
		expect(result.bidderCount).toBe(9);
	});

	it('never returns a winningBid below reservePrice', () => {
		const result = resolveAuction(0, 500, () => 0);
		expect(result.winningBid).toBeGreaterThanOrEqual(500);
	});
});
