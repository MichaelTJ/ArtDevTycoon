import { describe, expect, it } from 'vitest';
import { hashString, mulberry32, pick } from './random';

describe('hashString', () => {
	it('is stable for the same input', () => {
		expect(hashString('hello')).toBe(hashString('hello'));
	});

	it('is case-sensitive', () => {
		expect(hashString('Hello')).not.toBe(hashString('hello'));
	});
});

describe('mulberry32', () => {
	it('produces identical sequences from the same seed', () => {
		const a = mulberry32(42);
		const b = mulberry32(42);
		const firstFiveA = [a(), a(), a(), a(), a()];
		const firstFiveB = [b(), b(), b(), b(), b()];
		expect(firstFiveA).toEqual(firstFiveB);
	});

	it('returns values in [0, 1)', () => {
		const rng = mulberry32(99);
		for (let i = 0; i < 100; i++) {
			const value = rng();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});
});

describe('pick', () => {
	it('throws on an empty array', () => {
		expect(() => pick([], () => 0.5)).toThrow();
	});

	it('returns the last item when random is exactly 1', () => {
		expect(pick(['a', 'b', 'c'], () => 1)).toBe('c');
	});
});
