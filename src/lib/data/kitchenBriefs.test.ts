import { clientBriefSchema } from '$lib/types/contracts';
import { describe, expect, it } from 'vitest';
import { isBriefEligibleForProgress, KITCHEN_BRIEFS, maxWalkInAbstractness } from './kitchenBriefs';

describe('KITCHEN_BRIEFS', () => {
	it('parses every brief against clientBriefSchema', () => {
		for (const brief of KITCHEN_BRIEFS) {
			expect(() => clientBriefSchema.parse(brief)).not.toThrow();
		}
	});

	it('has exactly band-0 ids with abstractness 0 and no clusters', () => {
		const band0Ids = new Set(['c1', 'c2', 'c3', 'c7', 'c13', 'c14']);
		for (const brief of KITCHEN_BRIEFS) {
			const level = brief.abstractness ?? 0;
			if (band0Ids.has(brief.id)) {
				expect(level).toBe(0);
				expect(brief.interpretationClusters ?? []).toHaveLength(0);
			} else {
				expect(level).toBeGreaterThanOrEqual(1);
			}
		}
		expect(
			KITCHEN_BRIEFS.filter((b) => (b.abstractness ?? 0) === 0)
				.map((b) => b.id)
				.sort()
		).toEqual(['c1', 'c13', 'c14', 'c2', 'c3', 'c7']);
	});

	it('requires at least two clusters for abstractness >= 1', () => {
		for (const brief of KITCHEN_BRIEFS) {
			if ((brief.abstractness ?? 0) >= 1) {
				expect(brief.interpretationClusters!.length).toBeGreaterThanOrEqual(2);
				for (const cluster of brief.interpretationClusters!) {
					expect(cluster.keywords.length).toBeGreaterThanOrEqual(2);
					expect(cluster.keywords.length).toBeLessThanOrEqual(6);
				}
			}
		}
	});

	it('lists Mum on the kitchen opener and mood ids with shared band-0 avatar', () => {
		const mumIds = ['c1', 'c2', 'c3', 'c6', 'c7', 'c12', 'c13', 'c14'];
		for (const id of mumIds) {
			const brief = KITCHEN_BRIEFS.find((b) => b.id === id);
			expect(brief?.clientName).toBe('Mum');
		}
		for (const id of ['c1', 'c2', 'c3', 'c7', 'c13', 'c14']) {
			expect(KITCHEN_BRIEFS.find((b) => b.id === id)?.avatarUrl).toBe('/avatars/c1.svg');
		}
	});

	it('uses the exact c6 mood request text', () => {
		const c6 = KITCHEN_BRIEFS.find((b) => b.id === 'c6')!;
		expect(c6.requestText).toBe('I miss the old days.');
	});

	it('keeps all Mum brief budgets at $5', () => {
		const mumIds = ['c1', 'c2', 'c3', 'c6', 'c7', 'c12', 'c13', 'c14'];
		for (const id of mumIds) {
			expect(KITCHEN_BRIEFS.find((b) => b.id === id)?.budget).toBe(5);
		}
	});
});

describe('maxWalkInAbstractness / isBriefEligibleForProgress', () => {
	it('gates bands by reputation OR commission count (playtest P28 exponential ramp)', () => {
		const cases: Array<[number, number, number]> = [
			[0, 0, 0],
			[1, 0, 0],
			[5, 0, 0],
			[11, 0, 0],
			[12, 0, 1],
			[0, 7, 0],
			[0, 8, 1],
			[5, 8, 1],
			[19, 0, 1],
			[20, 0, 2],
			[0, 15, 1],
			[0, 16, 2],
			[4, 16, 2]
		];
		for (const [commissions, reputation, expected] of cases) {
			expect(maxWalkInAbstractness(commissions, reputation)).toBe(expected);
		}
	});

	it('always allows prestige briefs', () => {
		const prestige = {
			id: 'corp-x',
			clientName: 'Corp',
			avatarUrl: '/avatars/c1.svg',
			requestText: 'Logo.',
			budget: 500,
			preferredKeywords: ['logo'],
			tier: 'corporate' as const,
			abstractness: 2 as const
		};
		expect(isBriefEligibleForProgress(prestige, 0)).toBe(true);
	});

	it('blocks abstract walk-ins before their unlock', () => {
		const c6 = KITCHEN_BRIEFS.find((b) => b.id === 'c6')!;
		const c4 = KITCHEN_BRIEFS.find((b) => b.id === 'c4')!;
		expect(isBriefEligibleForProgress(c4, 11, 0)).toBe(false);
		expect(isBriefEligibleForProgress(c4, 12, 0)).toBe(true);
		expect(isBriefEligibleForProgress(c4, 0, 7)).toBe(false);
		expect(isBriefEligibleForProgress(c4, 0, 8)).toBe(true);
		expect(isBriefEligibleForProgress(c6, 19, 0)).toBe(false);
		expect(isBriefEligibleForProgress(c6, 20, 0)).toBe(true);
		expect(isBriefEligibleForProgress(c6, 0, 15)).toBe(false);
		expect(isBriefEligibleForProgress(c6, 0, 16)).toBe(true);
	});
});
