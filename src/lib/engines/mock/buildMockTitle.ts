import { STOPWORDS, normalize } from '$lib/game';
import { mulberry32, pick } from '../random';

const TITLE_PREFIXES = [
	'Study of',
	'Impression of',
	'Portrait of',
	'Meditation on',
	'Sketch of',
	'Ode to'
] as const;

/** Meaningful prompt tokens to include after the gallery prefix (mock uses more than protocol's two). */
const MEANINGFUL_WORD_LIMIT = 5;

/**
 * Gallery title for mock critiques — same shape as `buildTitle` but keeps more prompt
 * words so results headings read less abruptly during crayon-mode playtests.
 */
export function buildMockTitle(playerPrompt: string, seed: number): string {
	const meaningful = normalize(playerPrompt).filter((token) => !STOPWORDS.has(token));
	if (meaningful.length === 0) {
		return 'Untitled Study';
	}

	const rng = mulberry32(seed);
	const prefix = pick(TITLE_PREFIXES, rng);
	const words = meaningful.slice(0, MEANINGFUL_WORD_LIMIT).map(titleCase);
	const title = `${prefix} ${words.join(' ')}`;
	return title.length <= 120 ? title : title.slice(0, 120).trim();
}

function titleCase(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}
