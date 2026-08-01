import { describe, expect, it } from 'vitest';
import { MUM_PRAISE_POOL, pickMumPraise } from './mumPraise';

describe('mumPraise', () => {
	it('pool has several toddler-style lines', () => {
		expect(MUM_PRAISE_POOL.length).toBeGreaterThanOrEqual(6);
		expect(MUM_PRAISE_POOL.some((line) => line.text.includes('Wow!'))).toBe(true);
		expect(MUM_PRAISE_POOL.some((line) => line.text.includes('by yourself'))).toBe(true);
	});

	it('pickMumPraise selects first line at seed 0', () => {
		expect(pickMumPraise(0).id).toBe(MUM_PRAISE_POOL[0]!.id);
	});

	it('pickMumPraise selects last line near seed 1', () => {
		expect(pickMumPraise(0.99).id).toBe(MUM_PRAISE_POOL[MUM_PRAISE_POOL.length - 1]!.id);
	});

	it('pickMumPraise clamps out-of-range seeds', () => {
		expect(pickMumPraise(-1).id).toBe(MUM_PRAISE_POOL[0]!.id);
		expect(pickMumPraise(5).id).toBe(MUM_PRAISE_POOL[MUM_PRAISE_POOL.length - 1]!.id);
	});
});
