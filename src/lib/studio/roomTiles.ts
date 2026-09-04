/**
 * Frame indices for venue room art — Kenney `home-indoor` and Tilation `home-interior`.
 * Indices match Phaser spritesheet frames (see `studio-editor/catalog.ts`).
 */

/** Kenney Roguelike Indoors (`home-indoor.png`, 26 cols, spacing 1). */
export const INDOOR = {
	floor: 0,
	floorGrey: 1,
	wall: 22,
	wallAlt: 23,
	counterL: 272,
	counterR: 273,
	sink: 274,
	bookshelf: 260,
	stool: 338,
	roundTable: 208,
	chair: 234,
	paintingA: 102,
	paintingB: 126,
	cabinet: 364
} as const;

/** Tilation Indoor RPG (`home-interior.png`, 8 cols). */
export const INTERIOR = {
	carpetRed: 0,
	carpetBlue: 24,
	carpetPurple: 48,
	woodFloor: 72,
	wall: 64,
	wallWood: 96,
	table: 154,
	chair: 153,
	stool: 152,
	bookshelf: 136,
	dresser: 146,
	armchair: 162,
	plantTall: 176,
	plantMed: 177,
	stove: 168
} as const;

export const SHEET = {
	indoor: 'home-indoor',
	interior: 'home-interior',
	indoorProps: 'home-indoor-props',
	interiorProps: 'home-interior-props'
} as const;
