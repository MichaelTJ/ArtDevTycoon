/**
 * Per-venue storage object (crate / boxes / stock / archive / vault). Spec 34.
 * Kitchen crate stays at (5, 4) so it does not overlap Spec 33 cabinet tiles.
 */
export interface VenueStorageDef {
	venueId: string;
	/** Panel title / region label. */
	name: string;
	tagline: string;
	/** E-prompt without the `E — ` prefix. */
	promptLabel: string;
	/** Spritesheet frame. Pair with `sheet` — never the 5-wide dungeon `furniture.png` strip. */
	frame: number;
	sheet: 'home-indoor' | 'home-interior';
	tx: number;
	ty: number;
}

export const VENUE_STORAGE: readonly VenueStorageDef[] = [
	{
		venueId: 'fridge',
		name: "Mum's rainy-day box",
		tagline: 'Shoebox under the sink. Magnets were full.',
		promptLabel: 'Open drawers',
		/** home-interior r24c1 — two-drawer dresser (Mum's rainy-day box). */
		frame: 193,
		sheet: 'home-interior',
		tx: 5,
		ty: 4
	},
	{
		venueId: 'garage',
		name: 'Cardboard archive',
		tagline: 'Taped shut. Probably important.',
		promptLabel: 'Open shelves',
		/** home-interior r23c4 — empty shelf cabinet (archive stacks). */
		frame: 188,
		sheet: 'home-interior',
		tx: 10,
		ty: 8
	},
	{
		venueId: 'storefront',
		name: 'Back-room stock',
		tagline: 'Not in the window. Not forgotten.',
		promptLabel: 'Open stock',
		/** home-indoor r12c8 — double-door cupboard. */
		frame: 320,
		sheet: 'home-indoor',
		tx: 1,
		ty: 10
	},
	{
		venueId: 'gallery-hall',
		name: 'Archive closet',
		tagline: 'Climate is a strong word.',
		promptLabel: 'Open archive',
		/** home-interior r23c3 — bookshelf with catalogs. */
		frame: 187,
		sheet: 'home-interior',
		tx: 3,
		ty: 12
	},
	{
		venueId: 'mega-museum',
		name: 'Conservation vault',
		tagline: 'Off display. Still yours.',
		promptLabel: 'Open vault',
		/** home-interior r24c7 — banded chest. */
		frame: 199,
		sheet: 'home-interior',
		tx: 25,
		ty: 14
	}
];

/** Storage furniture for a venue id; unknown ids fall back to the fridge crate. */
export function storageForVenue(venueId: string): VenueStorageDef {
	const found = VENUE_STORAGE.find((s) => s.venueId === venueId);
	if (found) return found;
	const fridge = VENUE_STORAGE.find((s) => s.venueId === 'fridge');
	if (!fridge) {
		throw new Error('VENUE_STORAGE is missing the fridge row');
	}
	return fridge;
}
