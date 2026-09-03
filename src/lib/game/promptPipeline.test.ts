import { mediumSkillBackground, mediumSkillSuffix } from '$lib/data/mediumSkillTiers';
import { getMediumTier } from '$lib/data/mediumTiers';
import { LEVEL_1 } from '$lib/types/contracts';
import { describe, expect, it } from 'vitest';
import {
	buildLevel1Prompt,
	buildPrompt,
	MAX_PROMPT_LENGTH,
	sanitizePlayerPrompt
} from './promptPipeline';

describe('sanitizePlayerPrompt', () => {
	it('collapses whitespace and trims', () => {
		expect(sanitizePlayerPrompt('  a   cat  ')).toBe('a cat');
	});

	it('normalises control characters to spaces', () => {
		expect(sanitizePlayerPrompt('a\tcat\nsleeping')).toBe('a cat sleeping');
	});

	it('returns empty string for whitespace-only input', () => {
		expect(sanitizePlayerPrompt('   ')).toBe('');
	});

	it('caps length at MAX_PROMPT_LENGTH', () => {
		expect(sanitizePlayerPrompt('x'.repeat(600)).length).toBe(MAX_PROMPT_LENGTH);
	});
});

describe('buildLevel1Prompt', () => {
	it('appends Level 1 modifiers and the Novice white-background clause', () => {
		const result = buildLevel1Prompt('a dragon');
		expect(result).toBe(`a dragon, ${LEVEL_1.promptModifiers}, ${mediumSkillBackground(1)}`);
		expect(result).toContain(LEVEL_1.promptModifiers);
		expect(result.endsWith(mediumSkillBackground(1))).toBe(true);
	});

	it('matches buildPrompt with the crayon tier byte-for-byte', () => {
		expect(buildLevel1Prompt('x')).toBe(buildPrompt('x', getMediumTier('crayon')));
	});

	it('throws when input is empty or whitespace', () => {
		expect(() => buildLevel1Prompt('   ')).toThrow(Error);
		expect(() => buildLevel1Prompt('')).toThrow(Error);
	});
});

describe('buildPrompt', () => {
	it('appends the active tier suffix and Novice background', () => {
		const oil = getMediumTier('oil');
		expect(buildPrompt('a dragon', oil)).toBe(
			`a dragon, ${oil.promptModifierSuffix}, ${mediumSkillBackground(1)}`
		);
	});

	it('uses rank 1 pencil suffix at skillLevel 1', () => {
		const pencil = getMediumTier('pencil');
		expect(buildPrompt('an apple', pencil, 1)).toBe(
			`an apple, ${getMediumTier('pencil').promptModifierSuffix}, ${mediumSkillBackground(1)}`
		);
	});

	it('uses the rank 7 pencil suffix and the master presentation background', () => {
		const pencil = getMediumTier('pencil');
		const result = buildPrompt('an apple', pencil, 7);
		expect(result).toBe(`an apple, ${mediumSkillSuffix('pencil', 7)}, ${mediumSkillBackground(7)}`);
		expect(result).toContain('masterful graphite pencil drawing');
		expect(result).toContain('three-point lighting');
	});

	it('defaults crayon skill to the same string as buildLevel1Prompt', () => {
		expect(buildPrompt('x', getMediumTier('crayon'))).toBe(buildLevel1Prompt('x'));
	});
});
