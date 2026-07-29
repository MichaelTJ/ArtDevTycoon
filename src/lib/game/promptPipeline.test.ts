import { LEVEL_1 } from '$lib/types/contracts';
import { describe, expect, it } from 'vitest';
import { buildLevel1Prompt, MAX_PROMPT_LENGTH, sanitizePlayerPrompt } from './promptPipeline';

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
	it('appends Level 1 modifiers to a valid prompt', () => {
		const result = buildLevel1Prompt('a dragon');
		expect(result).toBe(
			'a dragon, flat color, simple line art, crayon texture, amateur style, low detail, basic shading'
		);
		expect(result.endsWith(LEVEL_1.promptModifiers)).toBe(true);
	});

	it('throws when input is empty or whitespace', () => {
		expect(() => buildLevel1Prompt('   ')).toThrow(Error);
		expect(() => buildLevel1Prompt('')).toThrow(Error);
	});
});
