/** When false, `+page` / GameScene renders KitchenScene instead of StudioFloor. */
export const STUDIO_FLOOR_ENABLED = true;

export const TILE_SIZE = 16;
export const PLAYER_SPEED = 80;
export const CLIENT_SPEED = 60;
export const INTERACT_RANGE_PX = 28;
/** Keyboard interact. Also accept Space later — not required for v1. */
export const INTERACT_KEYS = ['E', 'e'] as const;

/** Tiny Dungeon packed sheet uses 1px gaps between 16×16 tiles. */
export const TILESET_SPACING = 1;
export const TILESET_MARGIN = 0;

/** Ground tile indices into `walls-floors.png` (Kenney Tiny Dungeon packed sheet). */
export const TILE = {
	floor: 0,
	wall: 12,
	woodFloor: 48,
	/** Cool grey concrete for garage. */
	concrete: 1,
	/** Darker wall variant if the packed sheet has one; else reuse `wall`. */
	garageWall: 12,
	/** Light stone / marble for museum floors. */
	museumFloor: 2,
	/** Carpet / rug strip for storefront window zone. */
	carpet: 49
} as const;
