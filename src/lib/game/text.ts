/**
 * Words carrying no descriptive signal. Removed before measuring how imaginative a
 * prompt is, so "please draw me a cat" is not rewarded over "cat".
 */
export const STOPWORDS: ReadonlySet<string> = new Set([
	'a',
	'an',
	'the',
	'of',
	'on',
	'in',
	'at',
	'with',
	'and',
	'or',
	'to',
	'for',
	'is',
	'are',
	'it',
	'its',
	'this',
	'that',
	'my',
	'me',
	'i',
	'please',
	'draw',
	'paint',
	'make',
	'create',
	'need',
	'want',
	'some',
	'very',
	'really'
]);

/** Lowercase, strip punctuation, split into tokens. Never returns empty strings. */
export function normalize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((token) => token.length > 0);
}

/**
 * Strip one common English suffix so "glowing" and "glow" compare equal. Order
 * matters: longer suffixes are tried first. Tokens of 3 characters or fewer are left
 * alone, and a suffix is only removed if at least 3 characters would remain.
 */
export function stem(token: string): string {
	if (token.length <= 3) return token;
	for (const suffix of ['ing', 'ies', 'es', 'ed', 's']) {
		if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
			return token.slice(0, token.length - suffix.length);
		}
	}
	return token;
}
