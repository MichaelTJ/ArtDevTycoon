/** FNV-1a 32-bit. Stable across runs and platforms; not for security. */
export function hashString(input: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h >>> 0;
}

/** Small seeded PRNG. Returns a function producing values in [0, 1). */
export function mulberry32(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t = (t + 0x6d2b79f5) >>> 0;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

/** Pick a random element; clamps index so `random()` of exactly 1 cannot overflow. */
export function pick<T>(items: readonly T[], random: () => number): T {
	if (items.length === 0) {
		throw new Error('Cannot pick from an empty array');
	}
	const index = Math.min(Math.floor(random() * items.length), items.length - 1);
	return items[index];
}
