/**
 * Frame indices for venue room art — Kenney `home-indoor`, Tilation `home-interior`,
 * and Kenney Tiny Dungeon `walls-floors`.
 * Indices match Phaser spritesheet frames (see `studio-editor/catalog.ts`).
 *
 * **Pokémon-style walls:** north band only (y=0..1), Tiny Dungeon frame 40 on the
 * primary `tiny-dungeon` tileset (native colliding bricks). Floors overlay
 * home-interior on empty cells so the room meets letterbox black. Left/right/bottom
 * stay walkable — no cottage "outer box" walls.
 *
 * **Floors:** home-indoor frame 0 is a tabletop — use home-interior plank fills.
 * Furniture props still come from home-indoor / home-interior prop sheets.
 */

/**
 * Tilation Indoor RPG (`home-interior.png`, 8 cols).
 * Verified floor fills from PNG crop — not furniture.
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

/** Kenney Roguelike Indoors (`home-indoor.png`, 26 cols, spacing 1) — props only. */
export const INDOOR = {
	/** home-interior wood plank — NOT home-indoor frame 0 (tabletop) */
	floor: INTERIOR.woodFloor,
	/** home-interior stone — NOT home-indoor frame 26 (table edge) */
	floorGrey: INTERIOR.stoneFloor,
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

/** Kenney Tiny Dungeon (`walls-floors.png`, 12 cols, spacing 0) — north wall band. */
export const DUNGEON = {
	/** r3c4 — plain grey stone brick (verified PNG crop; no faces/doors/decor) */
	wall: 40
} as const;

export const DUNGEON_WALL_FRAMES = new Set<number>([DUNGEON.wall]);

export const SHEET = {
	indoor: 'home-indoor',
	interior: 'home-interior',
	dungeon: 'tiny-dungeon',
	indoorProps: 'home-indoor-props',
	interiorProps: 'home-interior-props'
} as const;

/** Hard max furniture props per authored room (sparse layouts). */
export const FURNITURE_CAP = {
	'home-kitchen': 5,
	'art-room': 3,
	studio: 4,
	gallery: 4,
	'mega-museum': 5
} as const;
