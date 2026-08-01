import { describe, expect, it } from 'vitest';
import {
	MAJOR_PROJECTS,
	canAcceptMajorProject,
	majorProjectReputationReward
} from './majorProjects';

describe('majorProjects', () => {
	it('locks comic to 4 beats and series to 6', () => {
		const comic = MAJOR_PROJECTS.find((p) => p.kind === 'comic-book');
		const series = MAJOR_PROJECTS.find((p) => p.kind === 'animated-series');
		expect(comic?.beatCount).toBe(4);
		expect(comic?.basePayout).toBe(120);
		expect(series?.beatCount).toBe(6);
		expect(series?.basePayout).toBe(180);
	});

	it('acceptance requires reputation and no active project', () => {
		const comic = MAJOR_PROJECTS[0];
		expect(canAcceptMajorProject(comic, { reputation: 5, activeProjectId: null })).toBe(false);
		expect(canAcceptMajorProject(comic, { reputation: 6, activeProjectId: null })).toBe(true);
		expect(canAcceptMajorProject(comic, { reputation: 20, activeProjectId: 'x' })).toBe(false);
	});

	it('reputation reward literals', () => {
		expect(majorProjectReputationReward(MAJOR_PROJECTS[0])).toBe(3);
		expect(majorProjectReputationReward(MAJOR_PROJECTS[1])).toBe(5);
	});
});
