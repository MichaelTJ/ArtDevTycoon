import { STOPWORDS, normalize } from '$lib/game';
import { pick, mulberry32 } from './random';

const TITLE_PREFIXES = [
	'Study of',
	'Impression of',
	'Portrait of',
	'Meditation on',
	'Sketch of',
	'Ode to'
] as const;

/** Turn a brief keyword into a yes/no vision question for the critic model. */
export function buildKeywordQuestion(keyword: string): string {
	return `Does this picture clearly show ${keyword}? Answer only yes or no.`;
}

/** Instruction for the critic to write one or two sentences of in-character review prose. */
export function buildReviewPrompt(briefRequest: string): string {
	return `You are a witty art critic reviewing an amateur painting against this client brief: "${briefRequest}". Write one or two sentences of criticism in character.`;
}

/**
 * Parse a model's yes/no answer. Only accepts clear affirmative responses; under-scoring
 * beats handing out money for an unparseable answer.
 */
export function parseYesNo(answer: string): boolean {
	const normalized = answer.toLowerCase().trim();
	if (normalized.length === 0) {
		return false;
	}
	if (/^yes\b/.test(normalized)) {
		return true;
	}
	return /\byes\b/.test(normalized);
}

/**
 * Map keyword hit rate to a 1–10 accuracy score. Must match the domain layer ladder
 * exactly so switching engines does not change difficulty.
 */
export function accuracyFromHits(hits: number, total: number): number {
	if (total === 0) {
		return 1;
	}
	return clamp(Math.round(1 + (hits / total) * 9), 1, 10);
}

/**
 * Invent a gallery title from the player's prompt and a seed. Deterministic per seed.
 */
export function buildTitle(playerPrompt: string, seed: number): string {
	const meaningful = normalize(playerPrompt).filter((token) => !STOPWORDS.has(token));
	if (meaningful.length === 0) {
		return 'Untitled Study';
	}

	const rng = mulberry32(seed);
	const prefix = pick(TITLE_PREFIXES, rng);
	const words = meaningful.slice(0, 2).map(titleCase);
	const title = `${prefix} ${words.join(' ')}`;
	return title.length <= 120 ? title : title.slice(0, 120).trim();
}

/**
 * Sanitize raw critic prose: trim, collapse whitespace, strip prompt echoes, truncate.
 */
export function cleanReview(raw: string, fallback: string): string {
	let text = raw.trim().replace(/\s+/g, ' ');
	if (text.length === 0) {
		return fallback;
	}

	const instructionEcho = buildReviewPrompt('');
	text = text.replace(instructionEcho, '').trim();
	if (text.length === 0) {
		return fallback;
	}

	if (text.length <= 600) {
		return text;
	}

	const truncated = text.slice(0, 600);
	const lastSpace = truncated.lastIndexOf(' ');
	return lastSpace > 0 ? truncated.slice(0, lastSpace).trim() : truncated.trim();
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function titleCase(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}
