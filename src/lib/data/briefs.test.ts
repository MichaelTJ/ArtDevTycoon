import { clientBriefSchema } from '$lib/types/contracts';
import { describe, expect, it } from 'vitest';
import { LEVEL_1_BRIEFS, pickBrief } from './briefs';
import { KITCHEN_BRIEFS } from './kitchenBriefs';

describe('LEVEL_1_BRIEFS', () => {
	it('re-exports the kitchen brief ladder', () => {
		expect(LEVEL_1_BRIEFS).toBe(KITCHEN_BRIEFS);
		expect(LEVEL_1_BRIEFS.length).toBeGreaterThanOrEqual(12);
		const ids = LEVEL_1_BRIEFS.map((b) => b.id);
		expect(new Set(ids).size).toBe(ids.length);
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
	it('returns an opener id when random is 0 at zero commissions', () => {
		expect(pickBrief({ random: () => 0 }).id).toBe('c1');
	});

	it('stays in opener set when random is 0.99 at zero commissions', () => {
		expect(['c1', 'c2', 'c3', 'c7']).toContain(pickBrief({ random: () => 0.99 }).id);
	});

	it('does not throw when random is exactly 1', () => {
		expect(() => pickBrief({ random: () => 1 })).not.toThrow();
	});

	it('skips excluded opener ids', () => {
		expect(pickBrief({ excludeIds: ['c1'], random: () => 0 }).id).toBe('c2');
	});

	it('falls back to band-0 Mum briefs when all openers are excluded', () => {
		expect(
			pickBrief({
				excludeIds: ['c1', 'c2', 'c3', 'c7'],
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
				commissionsCompleted: 4,
				random: () => i / 40
			});
			expect(brief.tier ?? 'walk-in').toBe('walk-in');
		}
	});

	it('does not return corp-1b until corp-1a is excluded', () => {
		for (let i = 0; i < 50; i++) {
			const brief = pickBrief({
				unlockedTiers: ['walk-in', 'corporate'],
				commissionsCompleted: 4,
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
				commissionsCompleted: 4,
				random: () => i / 80
			});
			seen.add(brief.id);
		}
		expect(seen.has('corp-1b')).toBe(true);
	});

	it('forces Mum band-0 openers for 50 draws at commissionsCompleted 0', () => {
		const openerIds = new Set(['c1', 'c2', 'c3', 'c7']);
		for (let i = 0; i < 50; i++) {
			const brief = pickBrief({
				unlockedTiers: ['walk-in'],
				commissionsCompleted: 0,
				random: () => i / 50
			});
			expect(openerIds.has(brief.id)).toBe(true);
			expect(brief.abstractness ?? 0).toBe(0);
		}
	});

	it('never returns abstractness >= 1 at commissionsCompleted 1', () => {
		for (let i = 0; i < 80; i++) {
			const brief = pickBrief({
				unlockedTiers: ['walk-in'],
				commissionsCompleted: 1,
				random: () => i / 80
			});
			expect(brief.abstractness ?? 0).toBeLessThan(1);
		}
	});

	it('unlocks abstractness 1 (not 2) at commissionsCompleted 2', () => {
		const levels = new Set<number>();
		for (let i = 0; i < 80; i++) {
			const brief = pickBrief({
				unlockedTiers: ['walk-in'],
				commissionsCompleted: 2,
				random: () => i / 80
			});
			const level = brief.abstractness ?? 0;
			expect(level).toBeLessThan(2);
			levels.add(level);
		}
		expect(levels.has(1)).toBe(true);
	});

	it('unlocks abstractness 2 including c6 at commissionsCompleted 4', () => {
		const levels = new Set<number>();
		const ids = new Set<string>();
		for (let i = 0; i < 80; i++) {
			const brief = pickBrief({
				unlockedTiers: ['walk-in'],
				commissionsCompleted: 4,
				random: () => i / 80
			});
			levels.add(brief.abstractness ?? 0);
			ids.add(brief.id);
		}
		expect(levels.has(2)).toBe(true);
		expect(ids.has('c6')).toBe(true);
	});

	it('never returns abstractness 2 walk-ins when billionaire is unlocked at 0 commissions', () => {
		for (let i = 0; i < 80; i++) {
			const brief = pickBrief({
				unlockedTiers: ['walk-in', 'billionaire'],
				commissionsCompleted: 0,
				random: () => i / 80
			});
			if ((brief.tier ?? 'walk-in') === 'walk-in') {
				expect(brief.abstractness ?? 0).toBeLessThan(2);
			}
		}
	});
});
