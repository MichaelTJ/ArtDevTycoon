/** When false, `+page` / GameScene renders KitchenScene instead of StudioFloor. */
export const STUDIO_FLOOR_ENABLED = true;

export const TILE_SIZE = 16;
export const PLAYER_SPEED = 80;
export const CLIENT_SPEED = 60;
export const INTERACT_RANGE_PX = 28;
/** Keyboard interact. Also accept Space later — not required for v1. */
export const INTERACT_KEYS = ['E', 'e'] as const;

/** Tiny Dungeon `walls-floors.png` is a 12-column grid with spacing 0 (see catalog). */
export const TILESET_SPACING = 0;
export const TILESET_MARGIN = 0;

/** Ground tile indices into `walls-floors.png` (Kenney Tiny Dungeon, 12 cols, spacing 0). */
export const TILE = {
	floor: 0,
	/** r3c4 — plain grey stone brick (not 12, which is brown floor on this sheet) */
	wall: 40,
	woodFloor: 48,
	/** Cool grey concrete for garage. */
	concrete: 1,
	garageWall: 40,
	/** Light stone / marble for museum floors. */
	museumFloor: 2,
	/** Carpet / rug strip for storefront window zone. */
	carpet: 49
} as const;
