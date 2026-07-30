import { describe, expect, it } from 'vitest';
import { MAX_IDLE_MS, computeIdleEarnings } from './idleIncome';

describe('computeIdleEarnings', () => {
	it('earns floor(60 × 0.05) = 3 over one minute at apprentice rate', () => {
		expect(computeIdleEarnings(0, 60_000, 0.05)).toEqual({ earned: 3, elapsedMs: 60_000 });
	});

	it('earns floor(3600 × 0.17) = 612 over one hour at combined rate', () => {
		expect(computeIdleEarnings(0, 3_600_000, 0.17)).toEqual({
			earned: 612,
			elapsedMs: 3_600_000
		});
	});

	it('caps elapsed time at MAX_IDLE_MS', () => {
		expect(computeIdleEarnings(0, 100 * 3_600_000, 0.17)).toEqual({
			earned: 4896,
			elapsedMs: MAX_IDLE_MS
		});
		expect(MAX_IDLE_MS).toBe(28_800_000);
	});

	it('earns nothing when the clock appears to run backwards', () => {
		expect(computeIdleEarnings(5000, 1000, 0.05)).toEqual({ earned: 0, elapsedMs: 0 });
	});

	it('earns nothing when lastTickAt equals now', () => {
		expect(computeIdleEarnings(0, 0, 0.05)).toEqual({ earned: 0, elapsedMs: 0 });
	});
});
