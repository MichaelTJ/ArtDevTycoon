import { describe, expect, it } from 'vitest';
import { assignmentComplete, pickBoardOffers, workDurationMs } from './assignCommission';

describe('assignCommission', () => {
	it('workDurationMs literals for level 1 crayon', () => {
		// crayon mediumFactor 0.85 → 8000 * 0.85 = 6800
		expect(workDurationMs(0, 'crayon')).toBe(6800);
	});

	it('higher level shortens timer', () => {
		const fast = workDurationMs(80, 'crayon');
		const slow = workDurationMs(0, 'crayon');
		expect(fast).toBeLessThan(slow);
	});

	it('assignmentComplete respects duration', () => {
		const assignment = {
			startedAt: 1000,
			durationMs: 5000
		};
		expect(assignmentComplete(assignment, 4000)).toBe(false);
		expect(assignmentComplete(assignment, 6000)).toBe(true);
	});

	it('pickBoardOffers returns 2–4 distinct ids', () => {
		const offers = pickBoardOffers({
			count: 3,
			random: () => 0.1
		});
		expect(offers.length).toBe(3);
		const ids = offers.map((b) => b.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
