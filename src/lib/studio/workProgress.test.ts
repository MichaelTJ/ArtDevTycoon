import { describe, expect, it } from 'vitest';
import { DEFAULT_WORK_ESTIMATE_MS, workBarProgress } from './workProgress';

describe('workBarProgress', () => {
	it('is 0 at start and approaches but does not hit 1 while incomplete', () => {
		expect(workBarProgress(0, 10_000, false)).toBe(0);
		expect(workBarProgress(5_000, 10_000, false)).toBe(0.5);
		expect(workBarProgress(20_000, 10_000, false)).toBe(0.95);
	});

	it('snaps to 1 when complete', () => {
		expect(workBarProgress(100, 10_000, true)).toBe(1);
	});

	it('exports a positive default estimate', () => {
		expect(DEFAULT_WORK_ESTIMATE_MS).toBeGreaterThan(0);
	});
});
