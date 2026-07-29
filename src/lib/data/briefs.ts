import { clientBriefSchema, type ClientBrief } from '$lib/types/contracts';
import { z } from 'zod';

/** Six Level 1 client briefs — enough variety for a five-commission run without repeats. */
export const LEVEL_1_BRIEFS: readonly ClientBrief[] = [
	{
		id: 'c1',
		clientName: 'Local Cafe Owner',
		avatarUrl: '/avatars/c1.svg',
		requestText:
			'I need a painting of a cozy coffee cup sitting on a wooden table. Something warm for the back wall.',
		budget: 100,
		preferredKeywords: ['coffee', 'cup', 'cozy', 'table']
	},
	{
		id: 'c2',
		clientName: 'Fantasy Novelist',
		avatarUrl: '/avatars/c2.svg',
		requestText:
			'Draw me a glowing magical sword stuck in a stone. It is for the cover of my next book.',
		budget: 150,
		preferredKeywords: ['sword', 'glowing', 'magic', 'stone']
	},
	{
		id: 'c3',
		clientName: 'Cat Enthusiast',
		avatarUrl: '/avatars/c3.svg',
		requestText: 'A majestic fluffy cat wearing a tiny golden crown. Make him look regal.',
		budget: 120,
		preferredKeywords: ['cat', 'fluffy', 'crown', 'gold']
	},
	{
		id: 'c4',
		clientName: 'Retired Sailor',
		avatarUrl: '/avatars/c4.svg',
		requestText:
			'A little wooden sailboat on rough ocean waves at sunset. Reminds me of the old days.',
		budget: 130,
		preferredKeywords: ['sailboat', 'ocean', 'waves', 'sunset']
	},
	{
		id: 'c5',
		clientName: 'Indie Band Manager',
		avatarUrl: '/avatars/c5.svg',
		requestText: 'We need album art: a lonely astronaut floating above a neon city. Moody, please.',
		budget: 170,
		preferredKeywords: ['astronaut', 'floating', 'neon', 'city']
	},
	{
		id: 'c6',
		clientName: 'Botanical Gardener',
		avatarUrl: '/avatars/c6.svg',
		requestText: 'Could you paint a greenhouse full of blooming tropical flowers in morning light?',
		budget: 110,
		preferredKeywords: ['greenhouse', 'flowers', 'tropical', 'light']
	}
];

// Throws at import time if any brief is malformed.
z.array(clientBriefSchema).parse(LEVEL_1_BRIEFS);

/**
 * Choose the next client. `random` is injected so tests and replays are deterministic;
 * production passes nothing and gets `Math.random`.
 *
 * When every brief has already been used the pool resets rather than returning null,
 * so a long run never runs out of clients.
 */
export function pickBrief(options?: {
	excludeIds?: readonly string[];
	random?: () => number;
}): ClientBrief {
	const random = options?.random ?? Math.random;
	let pool = LEVEL_1_BRIEFS.filter((b) => !(options?.excludeIds ?? []).includes(b.id));
	if (pool.length === 0) {
		pool = [...LEVEL_1_BRIEFS];
	}
	const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
	return pool[index];
}
