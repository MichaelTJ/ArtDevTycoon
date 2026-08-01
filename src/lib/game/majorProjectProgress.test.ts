import { describe, expect, it } from 'vitest';
import { MAJOR_PROJECTS } from '$lib/data/majorProjects';
import {
	beatWorkDurationMs,
	createMajorProjectProgress,
	isMajorProjectComplete,
	majorProjectPayout,
	payoutReady
} from './majorProjectProgress';

describe('majorProjectProgress', () => {
	const comic = MAJOR_PROJECTS[0];

	it('creates crew slots matching beat count', () => {
		const progress = createMajorProjectProgress(comic.id, comic.beatCount);
		expect(progress.crewByBeat.length).toBe(4);
		expect(progress.beatsCompleted).toBe(0);
	});

	it('payout literals', () => {
		expect(majorProjectPayout(comic)).toBe(120);
	});

	it('complete when all beats done and idle', () => {
		let progress = createMajorProjectProgress(comic.id, comic.beatCount);
		progress = { ...progress, beatsCompleted: 4 };
		expect(isMajorProjectComplete(progress, comic)).toBe(true);
		expect(payoutReady(progress, comic)).toBe(true);
	});

	it('beatWorkDurationMs shortens with XP and specialism match', () => {
		const matched = beatWorkDurationMs('jade-ink', 0, comic);
		const generic = beatWorkDurationMs('sam-storyboard', 0, comic);
		expect(matched).toBeLessThan(generic);
		const trained = beatWorkDurationMs('jade-ink', 80, comic);
		expect(trained).toBeLessThan(matched);
	});
});
