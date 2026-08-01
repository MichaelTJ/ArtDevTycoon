/** One toddler-style praise line Mum shows before the player asks for real critique. */
export interface MumPraiseLine {
	/** Stable id for tests and dedupe. */
	id: string;
	text: string;
}

/** Mum commission results default to praise from this pool (playtest P7). */
export const MUM_PRAISE_POOL: readonly MumPraiseLine[] = [
	{ id: 'praise-01', text: 'Wow! I love it so much!' },
	{ id: 'praise-02', text: 'Did you do this all by yourself?!' },
	{ id: 'praise-03', text: "You're the cleverest artist I know!" },
	{ id: 'praise-04', text: 'I am putting this on the fridge immediately!' },
	{ id: 'praise-05', text: 'Look at those colours — so bright and happy!' },
	{ id: 'praise-06', text: 'My favourite person made my favourite picture!' },
	{ id: 'praise-07', text: 'Even the cat would be proud of this one!' },
	{ id: 'praise-08', text: 'Tea tastes better when you show me art like this.' }
];

/**
 * Pick a praise line from {@link MUM_PRAISE_POOL} using a seeded value in `[0, 1)`.
 * Deterministic for tests and replays.
 */
export function pickMumPraise(seed: number): MumPraiseLine {
	const clamped = Math.min(Math.max(seed, 0), 0.999_999);
	const index = Math.min(Math.floor(clamped * MUM_PRAISE_POOL.length), MUM_PRAISE_POOL.length - 1);
	return MUM_PRAISE_POOL[index]!;
}
