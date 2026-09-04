/**
 * Frame indices for venue room art — Kenney `home-indoor` and Tilation `home-interior`.
 * Indices match Phaser spritesheet frames (see `studio-editor/catalog.ts`).
 *
 * Every value was checked against the source PNGs:
 * - `home-indoor.png` — 26 cols, spacing 1
 * - `home-interior.png` — 8 cols, spacing 0
 */

/** Kenney Roguelike Indoors (`home-indoor.png`, 26 cols, spacing 1). */
export const INDOOR = {
	/** r0c0 — tan plank floor */
	floor: 0,
	/** r1c0 — darker wood plank floor (garage concrete tone) */
	floorGrey: 26,
	/** r4c12 — cream wall face with brown trim (NOT catalog default 22 = candle) */
	wall: 116,
	/** r4c13 — cream wall face variant */
	wallAlt: 117,
	/** r6c12 — wall top / corner cap */
	wallCorner: 168,
	/** r13c0 — kitchen counter, two doors */
	counterL: 338,
	/** r13c1 — kitchen counter, drawers */
	counterR: 339,
	/** r14c8 — kitchen sink basin */
	sink: 372,
	/** r10c0 — bookshelf left segment */
	bookshelf: 260,
	/** r10c6 — stool with orange seat */
	stool: 266,
	/** r2c6 — round wooden table */
	roundTable: 58,
	/** r4c0 — wooden chair, front view */
	chair: 104,
	/** r16c20 — vertical framed painting, warm tones */
	paintingA: 436,
	/** r16c21 — vertical framed painting, teal tones */
	paintingB: 437,
	/** r14c0 — single-door cabinet (fridge stand-in) */
	cabinet: 364,
	/** r0c16 — tall potted plant */
	plantTall: 16,
	/** r0c17 — medium potted plant */
	plantMed: 17
} as const;

/** Tilation Indoor RPG (`home-interior.png`, 8 cols). */
export const INTERIOR = {
	/** r1c6 — red carpet fill (NOT edge/corner tiles) */
	carpetRed: 14,
	/** r7c4 — blue carpet fill */
	carpetBlue: 60,
	/** r13c2 — purple carpet fill */
	carpetPurple: 106,
	/** r18c4 — horizontal wood plank floor */
	woodFloor: 148,
	/** r19c1 — grey stone floor */
	stoneFloor: 153,
	/** r18c0 — vertical wood panel wall (NOT catalog default 64 = carpet corner) */
	wall: 144,
	/** r20c0 — horizontal wood panel wall (dividers) */
	wallWood: 160,
	/** r20c1 — wall top trim */
	wallTop: 145,
	/** r23c7 — square wooden table */
	table: 191,
	/** r23c6 — wooden chair */
	chair: 190,
	/** r23c5 — round wooden stool */
	stool: 189,
	/** r23c3 — bookshelf with books */
	bookshelf: 187,
	/** r24c1 — wooden dresser */
	dresser: 193,
	/** r25c0 — upholstered armchair */
	armchair: 200,
	/** r24c6 — planter with red bloom */
	plantTall: 198,
	/** r24c5 — planter with pink flowers */
	plantMed: 197,
	/** r24c0 — stove / heater */
	stove: 192
} as const;

export const SHEET = {
	indoor: 'home-indoor',
	interior: 'home-interior',
	indoorProps: 'home-indoor-props',
	interiorProps: 'home-interior-props'
} as const;
