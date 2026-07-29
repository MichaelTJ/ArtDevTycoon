import { LEVEL_1 } from '$lib/types/contracts';

/** Longest prompt we accept. Matches `generateRequestSchema` in the contract. */
export const MAX_PROMPT_LENGTH = 500;

function stripControlCharacters(raw: string): string {
	let result = '';
	for (const char of raw) {
		const code = char.charCodeAt(0);
		if (code === 0x09 || code === 0x0a || code === 0x0d) {
			result += char;
			continue;
		}
		if ((code >= 0x00 && code <= 0x1f) || code === 0x7f) {
			continue;
		}
		result += char;
	}
	return result;
}

/**
 * Clean up raw player input: drop control characters, collapse runs of whitespace,
 * trim, and cap the length. Returns `''` for input that is entirely whitespace.
 */
export function sanitizePlayerPrompt(raw: string): string {
	return stripControlCharacters(raw).replace(/\s+/g, ' ').trim().slice(0, MAX_PROMPT_LENGTH).trim();
}

/**
 * Append the hidden Level 1 quality modifiers to the player's prompt.
 *
 * The player never sees the result — the whole joke of Level 1 is that their grand
 * ambitions come back rendered in crayon. Throws on empty input so a blank prompt can
 * never reach the image model.
 *
 * @throws {Error} if the sanitised input is empty
 */
export function buildLevel1Prompt(playerInput: string): string {
	const clean = sanitizePlayerPrompt(playerInput);
	if (clean === '') {
		throw new Error('Prompt cannot be empty.');
	}
	return `${clean}, ${LEVEL_1.promptModifiers}`;
}
