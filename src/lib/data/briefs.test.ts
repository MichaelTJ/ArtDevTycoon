import { clientBriefSchema } from '$lib/types/contracts';
import { describe, expect, it } from 'vitest';
import { LEVEL_1_BRIEFS, pickBrief } from './briefs';

describe('LEVEL_1_BRIEFS', () => {
	it('has six briefs with unique ids', () => {
		expect(LEVEL_1_BRIEFS).toHaveLength(6);
		const ids = LEVEL_1_BRIEFS.map((b) => b.id);
		expect(new Set(ids).size).toBe(6);
	});

	it('parses every brief against clientBriefSchema with walk-in default', () => {
		for (const brief of LEVEL_1_BRIEFS) {
			const parsed = clientBriefSchema.parse(brief);
			expect(parsed).toMatchObject({
				id: brief.id,
				clientName: brief.clientName,
				budget: brief.budget
			});
			expect(parsed.tier).toBe('walk-in');
		}
	});
});

describe('pickBrief', () => {
	it('returns c1 when random is 0', () => {
		expect(pickBrief({ random: () => 0 }).id).toBe('c1');
	});

	it('returns c6 when random is 0.99', () => {
		expect(pickBrief({ random: () => 0.99 }).id).toBe('c6');
	});

	it('returns c6 and does not throw when random is exactly 1', () => {
		expect(pickBrief({ random: () => 1 }).id).toBe('c6');
	});

	it('skips excluded ids', () => {
		expect(pickBrief({ excludeIds: ['c1'], random: () => 0 }).id).toBe('c2');
	});

	it('resets the pool when every brief is excluded', () => {
		expect(
			pickBrief({
				excludeIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
				random: () => 0
			}).id
		).toBe('c1');
	});

	it('does not mutate LEVEL_1_BRIEFS', () => {
		const before = LEVEL_1_BRIEFS.map((b) => b.id);
		pickBrief({ random: () => 0.5 });
		expect(LEVEL_1_BRIEFS.map((b) => b.id)).toEqual(before);
	});

	it('never returns prestige tiers when only walk-in is unlocked', () => {
		for (let i = 0; i < 40; i++) {
			const brief = pickBrief({
				unlockedTiers: ['walk-in'],
				random: () => i / 40
			});
			expect(brief.tier ?? 'walk-in').toBe('walk-in');
		}
	});

	it('does not return corp-1b until corp-1a is excluded', () => {
		for (let i = 0; i < 50; i++) {
			const brief = pickBrief({
				unlockedTiers: ['walk-in', 'corporate'],
				random: () => i / 50
			});
			expect(brief.id).not.toBe('corp-1b');
		}
	});

	it('makes corp-1b eligible once corp-1a is excluded', () => {
		const seen = new Set<string>();
		for (let i = 0; i < 80; i++) {
			const brief = pickBrief({
				excludeIds: ['corp-1a'],
				unlockedTiers: ['walk-in', 'corporate'],
				random: () => i / 80
			});
			seen.add(brief.id);
		}
		expect(seen.has('corp-1b')).toBe(true);
	});
});
