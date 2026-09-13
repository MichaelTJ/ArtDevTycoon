import type { GalleryEntry } from '$lib/types/contracts';

/** Stroke time treated as a finished practice piece for fair-value effort. */
export const PRACTICE_FULL_EFFORT_MS = 90_000;
/** Minimum drawing time before a practice piece may be listed for sale. */
export const PRACTICE_MIN_LIST_STROKE_MS = 8_000;
/** Minimum paint coverage before a practice piece may be listed for sale. */
export const PRACTICE_MIN_LIST_COVERAGE = 0.02;
/** Idle interval between visitor sale rolls. No offline catch-up. */
export const PRACTICE_SALE_TICK_MS = 20_000;
export const PRACTICE_ASK_MIN = 1;
export const PRACTICE_ASK_MAX = 9999;
/** Keep is refused below this coverage (blank-equivalent doodle). */
export const PRACTICE_KEEP_MIN_COVERAGE = 0.005;

export const PRACTICE_SALE_BASE: Record<string, number> = {
	crayon: 8,
	pencil: 10,
	ink: 12,
	watercolor: 16,
	acrylic: 22,
	oil: 30
};

/** Who walks the floor. Fridge neighbours ≠ museum collectors. */
export const PRACTICE_VENUE_PRESTIGE: Record<string, number> = {
	fridge: 1,
	garage: 1.2,
	storefront: 2,
	'gallery-hall': 3.2,
	'mega-museum': 4
};

/**
 * Highest unlocked client tier, using Spec 15 reputation gates (12 / 30 / 50).
 * Walk-in = 1. Corporate ≈ Mum×4. Billionaire ≈ Mum×10. Auction-era collectors ×12.
 */
export function practiceClientMarket(reputation: number): number {
	if (reputation >= 50) return 12;
	if (reputation >= 30) return 10;
	if (reputation >= 12) return 4;
	return 1;
}

export function canListPracticeForSale(input: { strokeMs: number; coverage01: number }): boolean {
	return (
		input.strokeMs >= PRACTICE_MIN_LIST_STROKE_MS && input.coverage01 >= PRACTICE_MIN_LIST_COVERAGE
	);
}

/**
 * Recommended asking price for a practice listing. Junk floors at $1.
 * Scales with venue prestige and Spec 15 client-tier reputation gates.
 */
export function practiceFairValue(input: {
	mediumTierId: string;
	strokeMs: number;
	coverage01: number;
	skillLevel: number;
	venueId: string;
	reputation: number;
}): number {
	const base = PRACTICE_SALE_BASE[input.mediumTierId] ?? 8;
	const effort01 = Math.min(1, Math.max(0, input.strokeMs / PRACTICE_FULL_EFFORT_MS));
	const coverage01 = Math.min(1, Math.max(0, input.coverage01));
	const rank01 = Math.min(1, Math.max(0, (input.skillLevel - 1) / 6));
	const prestige = PRACTICE_VENUE_PRESTIGE[input.venueId] ?? 1;
	const market = practiceClientMarket(input.reputation);
	const raw =
		base *
		(0.2 + 0.8 * effort01) *
		(0.15 + 0.85 * coverage01) *
		(0.55 + 0.45 * rank01) *
		prestige *
		market;
	return Math.max(1, Math.round(raw));
}

/** Probability a visitor buys this listing on one tick. */
export function practiceBuyChance(ask: number, fairValue: number): number {
	if (ask < 1 || fairValue < 1) return 0;
	const ratio = ask / fairValue;
	let chance = 0;
	if (ratio <= 0.5) chance = 0.5;
	else if (ratio <= 1) chance = 0.28;
	else if (ratio <= 1.25) chance = 0.12;
	else if (ratio <= 1.75) chance = 0.04;
	else if (ratio <= 2.5) chance = 0.01;
	if (fairValue <= 2) chance *= 0.25;
	return chance;
}

export function clampAskingPrice(n: number): number {
	if (!Number.isFinite(n)) return PRACTICE_ASK_MIN;
	return Math.min(PRACTICE_ASK_MAX, Math.max(PRACTICE_ASK_MIN, Math.round(n)));
}

/** Player-kept practice sketch. Not a commission — never uses calculatePayout. */
export interface PracticeArtwork {
	id: string;
	imageUrl: string;
	title: string;
	mediumTierId: string;
	strokeMs: number;
	coverage01: number;
	skillLevel: number;
	askingPrice: number | null;
	location: 'gallery' | 'storage';
	createdAt: number;
}

/**
 * One idle sale roll. Callers inject `random` in [0, 1). Picks one listed piece,
 * then rolls buy chance from current venue + reputation fair value.
 */
export function tickPracticeSales(input: {
	artworks: readonly PracticeArtwork[];
	venueId: string;
	reputation: number;
	random: () => number; // [0, 1)
}): { soldId: string | null } {
	const listed = input.artworks.filter((p) => p.location === 'gallery' && p.askingPrice != null);
	if (listed.length === 0) return { soldId: null };
	const rPick = input.random();
	const index = Math.min(listed.length - 1, Math.floor(rPick * listed.length));
	const piece = listed[index];
	if (!piece || piece.askingPrice == null) return { soldId: null };
	const fair = practiceFairValue({
		mediumTierId: piece.mediumTierId,
		strokeMs: piece.strokeMs,
		coverage01: piece.coverage01,
		skillLevel: piece.skillLevel,
		venueId: input.venueId,
		reputation: input.reputation
	});
	const chance = practiceBuyChance(piece.askingPrice, fair);
	if (input.random() >= chance) return { soldId: null };
	return { soldId: piece.id };
}

/** Named visitor on the sale toast. Unknown venues read as a neighbour. */
export function practiceBuyerLabel(venueId: string): string {
	if (venueId === 'mega-museum') return 'A collector';
	if (venueId === 'gallery-hall') return 'A visitor';
	if (venueId === 'storefront') return 'A passer-by';
	return 'A neighbour';
}

/**
 * Hung practice as a GalleryEntry so FridgeGallery / easels can show it.
 * `inviteClient` exclude-ids stay on galleryHistory only — never these briefIds.
 */
export function practiceAsGalleryEntry(piece: PracticeArtwork): GalleryEntry {
	return {
		id: piece.id,
		imageUrl: piece.imageUrl,
		title: piece.title,
		payout: piece.askingPrice ?? 0,
		score: 1,
		clientName: 'Practice',
		briefId: `practice:${piece.id}`,
		completedAt: piece.createdAt
	};
}
