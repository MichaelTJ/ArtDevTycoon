import { DEFAULT_MEDIUM_TIER_ID, getMediumTier, type MediumTier } from '$lib/data/mediumTiers';
import { mediumSkillBackground, mediumSkillSuffix } from '$lib/data/mediumSkillTiers';

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
 * Append the hidden quality suffix for this medium at `skillLevel` (Spec 27 rank 1–7)
 * plus the matching Round 7 studio-background clause. The player never sees the result —
 * rank names are the only HUD surface.
 *
 * @throws {Error} if the sanitised input is empty
 */
export function buildPrompt(playerInput: string, tier: MediumTier, skillLevel: number = 1): string {
	const clean = sanitizePlayerPrompt(playerInput);
	if (clean === '') {
		throw new Error('Prompt cannot be empty.');
	}
	return `${clean}, ${mediumSkillSuffix(tier.id, skillLevel)}, ${mediumSkillBackground(skillLevel)}`;
}

/**
 * Crayon wrapper kept for existing callers. Rank 1 crayon style is byte-identical to
 * `LEVEL_1.promptModifiers`; the full prompt also includes the Novice white-background clause.
 */
export function buildLevel1Prompt(playerInput: string): string {
	return buildPrompt(playerInput, getMediumTier(DEFAULT_MEDIUM_TIER_ID));
}
