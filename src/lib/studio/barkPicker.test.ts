import { linesForSpeaker } from '$lib/data/barks';
import { describe, expect, it } from 'vitest';
import {
	DEFAULT_BARK_SCHEDULE,
	barksAllowedForPhase,
	eligibleBarkSpeakers,
	nextBarkDelayMs,
	pickBark
} from './barkPicker';

function seq(values: number[]): () => number {
	let i = 0;
	return () => values[Math.min(i++, values.length - 1)]!;
}

describe('barksAllowedForPhase', () => {
	it('allows only idle', () => {
		expect(barksAllowedForPhase('idle')).toBe(true);
		expect(barksAllowedForPhase('briefing')).toBe(false);
		expect(barksAllowedForPhase('generating')).toBe(false);
		expect(barksAllowedForPhase('critiquing')).toBe(false);
		expect(barksAllowedForPhase('results')).toBe(false);
		expect(barksAllowedForPhase('failed')).toBe(false);
		expect(barksAllowedForPhase('levelComplete')).toBe(false);
	});
});

describe('eligibleBarkSpeakers', () => {
	it('is Mum-only when no staff sprites', () => {
		expect(eligibleBarkSpeakers({ hasMum: true, hiredRoleIds: [], presentStaffIds: [] })).toEqual([
			'mum'
		]);
		expect(
			eligibleBarkSpeakers({
				hasMum: true,
				hiredRoleIds: ['apprentice'],
				presentStaffIds: []
			})
		).toEqual(['mum']);
	});

	it('includes hired staff when sprites are present', () => {
		expect(
			eligibleBarkSpeakers({
				hasMum: true,
				hiredRoleIds: ['apprentice'],
				presentStaffIds: ['apprentice']
			})
		).toEqual(['mum', 'apprentice']);
	});
});

describe('pickBark', () => {
	it('picks first and last Mum lines from seeded RNG', () => {
		const mum = linesForSpeaker('mum');
		const first = pickBark({ eligibleSpeakers: ['mum'], random: seq([0]) });
		expect(first?.line.id).toBe(mum[0]!.id);
		expect(first?.line.text).toBe("Don't forget lunch.");
		expect(first?.line.id).toBe('mum-01');

		const last = pickBark({ eligibleSpeakers: ['mum'], random: seq([0.99]) });
		expect(last?.line.id).toBe(mum[mum.length - 1]!.id);
	});

	it('picks apprentice when speaker RNG lands on index 1', () => {
		const pick = pickBark({
			eligibleSpeakers: ['mum', 'apprentice'],
			random: seq([0.6, 0])
		});
		expect(pick?.line.id).toBe('app-01');
		expect(pick?.line.text).toBe('Another common. Got it.');
	});

	it('picks mum-01 when two speakers and speaker RNG is 0', () => {
		const pick = pickBark({
			eligibleSpeakers: ['mum', 'apprentice'],
			random: seq([0, 0])
		});
		expect(pick?.line.id).toBe('mum-01');
		expect(pick?.line.text).toBe("Don't forget lunch.");
	});

	it('returns null with no eligible speakers', () => {
		expect(pickBark({ eligibleSpeakers: [], random: () => 0 })).toBeNull();
	});

	it('avoids immediate repeat when pool ≥ 2', () => {
		const firstId = linesForSpeaker('mum')[0]!.id;
		const pick = pickBark({
			eligibleSpeakers: ['mum'],
			lastBarkId: firstId,
			random: () => 0
		});
		expect(pick?.line.id).not.toBe(firstId);
	});
});

describe('nextBarkDelayMs', () => {
	it('lerps min..max with injected random', () => {
		expect(nextBarkDelayMs(DEFAULT_BARK_SCHEDULE, () => 0)).toBe(8000);
		expect(nextBarkDelayMs(DEFAULT_BARK_SCHEDULE, () => 0.5)).toBe(12000);
	});
});
