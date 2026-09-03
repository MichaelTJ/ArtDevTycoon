import { describe, expect, it } from 'vitest';
import { LEVEL_1 } from '$lib/types/contracts';
import { MEDIUM_TIERS, getMediumTier } from './mediumTiers';
import {
	MEDIUM_SKILL_BACKGROUNDS,
	MEDIUM_SKILL_SUFFIXES,
	mediumSkillBackground,
	mediumSkillSuffix
} from './mediumSkillTiers';

describe('MEDIUM_SKILL_SUFFIXES', () => {
	it('gives every MEDIUM_TIERS id exactly 7 suffixes', () => {
		for (const tier of MEDIUM_TIERS) {
			expect(MEDIUM_SKILL_SUFFIXES[tier.id]?.length).toBe(7);
		}
	});
});

describe('mediumSkillSuffix', () => {
	it("rank 1 matches each medium's promptModifierSuffix", () => {
		for (const tier of MEDIUM_TIERS) {
			expect(mediumSkillSuffix(tier.id, 1)).toBe(getMediumTier(tier.id).promptModifierSuffix);
		}
	});

	it('crayon rank 1 is byte-identical to LEVEL_1.promptModifiers', () => {
		expect(mediumSkillSuffix('crayon', 1)).toBe(LEVEL_1.promptModifiers);
	});

	it('pencil rank 7 is the explorer masterful graphite phrase', () => {
		expect(mediumSkillSuffix('pencil', 7)).toContain('masterful graphite pencil drawing');
	});

	it('oil rank 1 uses the Round 5 muddy-amateur phrase, not finger-paint', () => {
		expect(mediumSkillSuffix('oil', 1)).toBe(
			'beginner oil painting, muddy colors, amateur canvas, thick messy paint'
		);
		expect(mediumSkillSuffix('oil', 1)).not.toContain('finger-painted');
	});

	it('unknown medium id falls back to crayon rank 1', () => {
		expect(mediumSkillSuffix('nope', 1)).toBe(mediumSkillSuffix('crayon', 1));
	});

	it('clamps level 0 to rank 1', () => {
		expect(mediumSkillSuffix('pencil', 0)).toBe(mediumSkillSuffix('pencil', 1));
	});

	it('clamps level 99 to rank 7', () => {
		expect(mediumSkillSuffix('pencil', 99)).toBe(mediumSkillSuffix('pencil', 7));
	});
});

describe('mediumSkillBackground', () => {
	it('has exactly 7 Round 7 studio phrases', () => {
		expect(MEDIUM_SKILL_BACKGROUNDS).toHaveLength(7);
	});

	it('rank 1 is unfinished flat white', () => {
		expect(mediumSkillBackground(1)).toBe('centered on a solid plain white background');
	});

	it('rank 7 is three-point lighting with bokeh', () => {
		expect(mediumSkillBackground(7)).toContain('three-point lighting');
		expect(mediumSkillBackground(7)).toContain('soft background bokeh');
	});

	it('clamps like mediumSkillSuffix', () => {
		expect(mediumSkillBackground(0)).toBe(mediumSkillBackground(1));
		expect(mediumSkillBackground(99)).toBe(mediumSkillBackground(7));
	});
});
