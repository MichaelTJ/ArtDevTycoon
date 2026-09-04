/**
 * Frame indices for venue room art — Kenney `home-indoor` and Tilation `home-interior`.
 * Indices match Phaser spritesheet frames (see `studio-editor/catalog.ts`).
 *
 * **Important:** `home-indoor.png` is a furniture/prop pack only (tables, beds,
 * counters, candles, paintings). It has NO structural wall tiles — perimeter
 * walls for every venue must come from `home-interior` via `groundSheets`.
 *
 * Structural walls live in `home-interior` from index 144 (= `walls_floor_doors` 0+).
 * Do NOT use 168–170 (cabinets/dressers) as walls.
 */

/** Kenney Roguelike Indoors (`home-indoor.png`, 26 cols, spacing 1) — floors + props only. */
export const INDOOR = {
	/** r0c0 — tan plank floor */
	floor: 0,
	/** r1c0 — darker wood plank floor (garage tone) */
	floorGrey: 26,
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

/**
 * Tilation Indoor RPG (`home-interior.png`, 8 cols).
 * Walls/floors block starts at 144 (see `walls_floor_doors.png`).
 */
export const INTERIOR = {
	/** r2c4 — red carpet center fill (no orange border) */
	carpetRed: 20,
	/** r8c4 — blue carpet center fill */
	carpetBlue: 68,
	/** r14c4 — purple carpet center fill */
	carpetPurple: 116,
	/** r18c4 — horizontal wood plank floor */
	woodFloor: 148,
	/** r19c1 — grey stone floor */
	stoneFloor: 153,
	/** r18c0 — vertical wood panel face (wfd 0); dividers */
	wall: 144,
	/** r19c5 — wall-top lip for top-down perimeter (wfd 13); NOT 168 (cabinet) */
	wallPerimeter: 157,
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

/** Hard max furniture props per authored room (sparse layouts). */
export const FURNITURE_CAP = {
	'home-kitchen': 3,
	'art-room': 3,
	studio: 4,
	gallery: 4,
	'mega-museum': 5
} as const;
