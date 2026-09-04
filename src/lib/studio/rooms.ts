import { TILE } from './config';
import type { InteractableId } from './interactables';

export type RoomId = 'home-kitchen' | 'art-room' | 'studio' | 'gallery' | 'mega-museum';

export type RoomZoneId = 'work' | 'gallery' | 'foyer' | 'window';

export interface TileMarker {
	/** Tile coordinates (not pixels). */
	tx: number;
	ty: number;
}

export function markersEqual(a: TileMarker, b: TileMarker): boolean {
	return a.tx === b.tx && a.ty === b.ty;
}

/** Primary plus extras, skipping duplicates. */
export function collectMarkers(primary: TileMarker, extras?: readonly TileMarker[]): TileMarker[] {
	const out: TileMarker[] = [{ tx: primary.tx, ty: primary.ty }];
	for (const extra of extras ?? []) {
		if (!out.some((marker) => markersEqual(marker, extra))) {
			out.push({ tx: extra.tx, ty: extra.ty });
		}
	}
	return out;
}

export function roomDesks(room: Pick<RoomDef, 'desk' | 'desks'>): TileMarker[] {
	return collectMarkers(room.desk, room.desks);
}

export function roomFridgeAnchors(
	room: Pick<RoomDef, 'fridgeAnchor' | 'fridgeAnchors'>
): TileMarker[] {
	return collectMarkers(room.fridgeAnchor, room.fridgeAnchors);
}

export function roomClientWaits(room: Pick<RoomDef, 'clientWait' | 'clientWaits'>): TileMarker[] {
	return collectMarkers(room.clientWait, room.clientWaits);
}

/**
 * Furniture sprites placed after the tile layer.
 * Frames refer to `furniture.png` strip: 0 table, 1 barrel, 2 chest, 3 open chest, 4 block.
 */
export interface FurnitureProp {
	frame: number;
	tx: number;
	ty: number;
	/** Blocks walking when true. */
	solid: boolean;
	/** When set, player may E-interact via interactables registry. */
	interactableId?: InteractableId;
	/** Phaser spritesheet key. Omitted = the classic `furniture` strip. */
	sheet?: string;
}

export interface RoomZone {
	id: RoomZoneId;
	/** Inclusive tile bounds. */
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	label: string;
}

export interface ResidentNpcDef {
	/** Stable id for Phaser registry — use `mum` for Mum. */
	id: string;
	/** Matches ClientBrief.clientName when this NPC is the active client. */
	clientName: string;
	/** Spritesheet key loaded in BootScene (`mum` or `clients`). */
	spriteKey: string;
	/** Base frame index in that sheet. */
	frame: number;
	spawn: TileMarker;
	/** Patrol waypoints (tile coords, must be walkable). Length ≥ 2. */
	patrol: readonly TileMarker[];
}

export interface RoomDef {
	id: RoomId;
	width: number;
	height: number;
	collision: readonly number[];
	ground: readonly number[];
	door: TileMarker;
	clientWait: TileMarker;
	desk: TileMarker;
	playerSpawn: TileMarker;
	fridgeAnchor: TileMarker;
	/** Extra desks beyond `desk`. Door and player-spawn stay unique. */
	desks?: readonly TileMarker[];
	/** Extra fridge / painting anchors beyond `fridgeAnchor`. */
	fridgeAnchors?: readonly TileMarker[];
	/** Extra client standing tiles beyond `clientWait`. */
	clientWaits?: readonly TileMarker[];
	furniture: readonly FurnitureProp[];
	/** Empty for single-room plans; ≥2 for storefront / halls. */
	zones: readonly RoomZone[];
	/** Kitchen has Mum; higher venues may be []. */
	residents: readonly ResidentNpcDef[];
	/**
	 * Optional second tileset tint key for walls — unused if ground already encodes
	 * walls. Kept for docs; implementers MAY ignore and bake walls into `ground`.
	 */
	palette: 'kitchen' | 'garage' | 'storefront' | 'museum';
	/**
	 * Studio-editor atlas id (`home-interior` | `home-indoor` | `tiny-town` |
	 * `tiny-dungeon` | `tiny-battle`). Omitted rooms keep Tiny Dungeon `walls-floors`.
	 */
	tilesetId?: string;
	/**
	 * Per-cell tileset id when a floor or wall uses a pack other than `tilesetId`.
	 * Omitted or `undefined` entries use `tilesetId`.
	 */
	groundSheets?: readonly (string | undefined)[];
}

function idx(width: number, tx: number, ty: number): number {
	return ty * width + tx;
}

/** Perimeter ring with Kenney autotile corners and edge pieces (not one tile everywhere). */
function paintOuterWalls(
	width: number,
	height: number,
	collision: number[],
	ground: number[]
): void {
	for (let x = 0; x < width; x++) {
		for (const y of [0, height - 1]) {
			collision[idx(width, x, y)] = 1;
			const north = y === 0;
			const south = y === height - 1;
			const west = x === 0;
			const east = x === width - 1;
			if (north && west) ground[idx(width, x, y)] = TILE.wall;
			else if (north && east) ground[idx(width, x, y)] = TILE.wallNE;
			else if (south && west) ground[idx(width, x, y)] = TILE.wallSW;
			else if (south && east) ground[idx(width, x, y)] = TILE.wallSE;
			else if (north || south) ground[idx(width, x, y)] = north ? TILE.wallN : TILE.wallS;
			else ground[idx(width, x, y)] = west ? TILE.wallW : TILE.wallE;
		}
	}
	for (let y = 1; y < height - 1; y++) {
		collision[idx(width, 0, y)] = 1;
		collision[idx(width, width - 1, y)] = 1;
		ground[idx(width, 0, y)] = TILE.wallW;
		ground[idx(width, width - 1, y)] = TILE.wallE;
	}
}

/** Solid interior column with brick fill; `doorYs` are walkable gaps. */
function paintVerticalDivider(
	width: number,
	height: number,
	collision: number[],
	ground: number[],
	tx: number,
	doorYs: readonly number[],
	floorTile: number
): void {
	const doorSet = new Set(doorYs);
	for (let y = 1; y < height - 1; y++) {
		if (doorSet.has(y)) {
			openCell(width, collision, ground, tx, y, floorTile);
		} else {
			collision[idx(width, tx, y)] = 1;
		}
	}
	for (let y = 1; y < height - 1; y++) {
		if (doorSet.has(y)) continue;
		const aboveWall = y === 1 || collision[idx(width, tx, y - 1)] === 1;
		const belowWall = y === height - 2 || collision[idx(width, tx, y + 1)] === 1;
		if (aboveWall && belowWall) {
			ground[idx(width, tx, y)] = TILE.wallFill;
		} else if (aboveWall) {
			ground[idx(width, tx, y)] = TILE.wallS;
		} else if (belowWall) {
			ground[idx(width, tx, y)] = TILE.wallN;
		} else {
			ground[idx(width, tx, y)] = TILE.wallFill;
		}
	}
}

function paintFloorRect(
	width: number,
	collision: number[],
	ground: number[],
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	floorTile: number
): void {
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = floorTile;
			}
		}
	}
}

function openCell(
	width: number,
	collision: number[],
	ground: number[],
	tx: number,
	ty: number,
	floorTile: number
): void {
	collision[idx(width, tx, ty)] = 0;
	ground[idx(width, tx, ty)] = floorTile;
}

function solidAt(width: number, collision: number[], tx: number, ty: number): void {
	collision[idx(width, tx, ty)] = 1;
}

function buildKitchen(): RoomDef {
	const width = 6;
	const height = 6;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(TILE.kitchenFloor);

	paintOuterWalls(width, height, collision, ground);

	const door = { tx: 2, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.kitchenFloor);

	// Eating nook — wood planks under table and desk.
	paintFloorRect(width, collision, ground, 2, 3, 3, 4, TILE.woodFloor);
	// Entry mat by the door.
	paintFloorRect(width, collision, ground, 1, 1, 3, 1, TILE.carpet);

	const desk = { tx: 3, ty: 3 };
	const fridgeAnchor = { tx: 1, ty: 1 };
	solidAt(width, collision, 2, 3); // table
	solidAt(width, collision, 1, 1); // fridge
	solidAt(width, collision, 4, 1); // pantry shelf

	const patrol = [
		{ tx: 4, ty: 2 },
		{ tx: 4, ty: 4 },
		{ tx: 1, ty: 4 },
		{ tx: 1, ty: 2 },
		{ tx: 3, ty: 1 }
	] as const;

	return {
		id: 'home-kitchen',
		width,
		height,
		collision,
		ground,
		door,
		clientWait: { tx: 2, ty: 1 },
		desk,
		playerSpawn: { tx: 1, ty: 4 },
		fridgeAnchor,
		furniture: [
			{ frame: 0, tx: 2, ty: 3, solid: true },
			{ frame: 2, tx: 1, ty: 1, solid: true, interactableId: 'fridge' },
			{ frame: 4, tx: 4, ty: 1, solid: true },
			{ frame: 1, tx: 3, ty: 4, solid: true }
		],
		zones: [],
		residents: [
			{
				id: 'mum',
				clientName: 'Mum',
				spriteKey: 'mum',
				frame: 0,
				spawn: { tx: 4, ty: 2 },
				patrol
			}
		],
		palette: 'kitchen'
	};
}

function buildGarage(): RoomDef {
	const width = 12;
	const height = 10;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(TILE.concrete);

	paintOuterWalls(width, height, collision, ground);

	const door = { tx: 5, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.concrete);

	// Central workbench island on wood.
	paintFloorRect(width, collision, ground, 2, 4, 6, 6, TILE.woodFloor);
	// Paint-stained corner near easels.
	paintFloorRect(width, collision, ground, 8, 2, 10, 7, TILE.woodFloor);

	solidAt(width, collision, 3, 5);
	solidAt(width, collision, 4, 5);
	solidAt(width, collision, 2, 5);
	solidAt(width, collision, 6, 5);
	solidAt(width, collision, 1, 2);
	solidAt(width, collision, 1, 7);
	solidAt(width, collision, 10, 3);
	solidAt(width, collision, 10, 6);
	solidAt(width, collision, 8, 8);
	solidAt(width, collision, 3, 2);

	return {
		id: 'art-room',
		width,
		height,
		collision,
		ground,
		door,
		clientWait: { tx: 5, ty: 2 },
		desk: { tx: 5, ty: 5 },
		playerSpawn: { tx: 2, ty: 8 },
		fridgeAnchor: { tx: 2, ty: 2 },
		furniture: [
			{ frame: 0, tx: 3, ty: 5, solid: true, interactableId: 'toolkit-shelf' },
			{ frame: 0, tx: 4, ty: 5, solid: true },
			{ frame: 0, tx: 2, ty: 5, solid: true },
			{ frame: 4, tx: 6, ty: 5, solid: true },
			{ frame: 2, tx: 1, ty: 2, solid: true },
			{ frame: 1, tx: 1, ty: 7, solid: true },
			{ frame: 4, tx: 10, ty: 3, solid: true },
			{ frame: 4, tx: 10, ty: 6, solid: true },
			{ frame: 1, tx: 8, ty: 8, solid: true },
			{ frame: 2, tx: 3, ty: 2, solid: true }
		],
		zones: [],
		residents: [],
		palette: 'garage'
	};
}

function buildStorefront(): RoomDef {
	const width = 18;
	const height = 12;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(TILE.woodFloor);

	paintOuterWalls(width, height, collision, ground);

	const door = { tx: 4, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.woodFloor);

	paintVerticalDivider(width, height, collision, ground, 9, [5], TILE.woodFloor);

	// Work-room work mat behind the desk.
	paintFloorRect(width, collision, ground, 3, 5, 7, 8, TILE.carpet);
	// Window display — plush carpet and spotlight strip.
	paintFloorRect(width, collision, ground, 10, 2, 16, 9, TILE.carpet);
	paintFloorRect(width, collision, ground, 11, 1, 16, 1, TILE.museumFloor);

	// Reception counter, display plinths, back-room storage.
	solidAt(width, collision, 4, 6);
	solidAt(width, collision, 2, 3);
	solidAt(width, collision, 2, 8);
	solidAt(width, collision, 7, 3);
	solidAt(width, collision, 12, 3);
	solidAt(width, collision, 14, 4);
	solidAt(width, collision, 15, 7);
	solidAt(width, collision, 13, 8);
	solidAt(width, collision, 16, 6);

	const zones: RoomZone[] = [
		{ id: 'work', x0: 1, y0: 1, x1: 8, y1: 10, label: 'Work room' },
		{ id: 'window', x0: 10, y0: 1, x1: 16, y1: 10, label: 'Window display' }
	];

	return {
		id: 'studio',
		width,
		height,
		collision,
		ground,
		door,
		clientWait: { tx: 4, ty: 2 },
		desk: { tx: 5, ty: 6 },
		playerSpawn: { tx: 2, ty: 9 },
		fridgeAnchor: { tx: 2, ty: 2 },
		furniture: [
			{ frame: 0, tx: 4, ty: 6, solid: true },
			{ frame: 2, tx: 2, ty: 3, solid: true },
			{ frame: 1, tx: 2, ty: 8, solid: true },
			{ frame: 4, tx: 7, ty: 3, solid: true },
			{ frame: 4, tx: 12, ty: 3, solid: true },
			{ frame: 4, tx: 14, ty: 4, solid: true },
			{ frame: 0, tx: 15, ty: 7, solid: true },
			{ frame: 1, tx: 13, ty: 8, solid: true },
			{ frame: 2, tx: 16, ty: 6, solid: true }
		],
		zones,
		residents: [],
		palette: 'storefront'
	};
}

function buildGalleryHall(): RoomDef {
	const width = 22;
	const height = 14;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(TILE.museumFloor);

	paintOuterWalls(width, height, collision, ground);

	const door = { tx: 5, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.museumFloor);

	paintVerticalDivider(width, height, collision, ground, 10, [6], TILE.museumFloor);

	// Atelier work island.
	paintFloorRect(width, collision, ground, 3, 5, 7, 9, TILE.woodFloor);
	// Gallery aisle runner.
	paintFloorRect(width, collision, ground, 12, 3, 19, 11, TILE.carpet);
	// Entry foyer strip inside the door.
	paintFloorRect(width, collision, ground, 3, 1, 8, 2, TILE.woodFloor);

	solidAt(width, collision, 5, 7);
	solidAt(width, collision, 3, 3);
	solidAt(width, collision, 7, 4);
	solidAt(width, collision, 2, 9);
	solidAt(width, collision, 14, 4);
	solidAt(width, collision, 16, 4);
	solidAt(width, collision, 18, 8);
	solidAt(width, collision, 17, 10);
	solidAt(width, collision, 13, 11);
	solidAt(width, collision, 19, 5);

	const zones: RoomZone[] = [
		{ id: 'work', x0: 1, y0: 1, x1: 9, y1: 12, label: 'Atelier' },
		{ id: 'gallery', x0: 11, y0: 1, x1: 20, y1: 12, label: 'Show gallery' }
	];

	return {
		id: 'gallery',
		width,
		height,
		collision,
		ground,
		door,
		clientWait: { tx: 5, ty: 2 },
		desk: { tx: 6, ty: 7 },
		playerSpawn: { tx: 2, ty: 11 },
		fridgeAnchor: { tx: 2, ty: 2 },
		furniture: [
			{ frame: 0, tx: 5, ty: 7, solid: true },
			{ frame: 2, tx: 3, ty: 3, solid: true },
			{ frame: 4, tx: 7, ty: 4, solid: true },
			{ frame: 1, tx: 2, ty: 9, solid: true },
			{ frame: 4, tx: 14, ty: 4, solid: true },
			{ frame: 4, tx: 16, ty: 4, solid: true },
			{ frame: 4, tx: 18, ty: 8, solid: true },
			{ frame: 0, tx: 17, ty: 10, solid: true },
			{ frame: 1, tx: 13, ty: 11, solid: true },
			{ frame: 2, tx: 19, ty: 5, solid: true }
		],
		zones,
		residents: [],
		palette: 'museum'
	};
}

export function buildMegaMuseum(): RoomDef {
	const width = 28;
	const height = 16;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(TILE.museumFloor);

	paintOuterWalls(width, height, collision, ground);

	const door = { tx: 6, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.museumFloor);

	paintVerticalDivider(width, height, collision, ground, 9, [7], TILE.museumFloor);
	paintVerticalDivider(width, height, collision, ground, 18, [7], TILE.museumFloor);

	// Atelier bench zone.
	paintFloorRect(width, collision, ground, 3, 5, 7, 10, TILE.woodFloor);
	// Gallery runner between plinths.
	paintFloorRect(width, collision, ground, 11, 3, 16, 12, TILE.carpet);
	// Foyer welcome mat and reception carpet.
	paintFloorRect(width, collision, ground, 19, 10, 26, 14, TILE.carpet);
	paintFloorRect(width, collision, ground, 20, 2, 25, 4, TILE.woodFloor);

	solidAt(width, collision, 5, 7);
	solidAt(width, collision, 3, 3);
	solidAt(width, collision, 7, 5);
	solidAt(width, collision, 2, 12);
	solidAt(width, collision, 12, 4);
	solidAt(width, collision, 14, 4);
	solidAt(width, collision, 15, 9);
	solidAt(width, collision, 13, 12);
	solidAt(width, collision, 22, 5);
	solidAt(width, collision, 24, 10);
	solidAt(width, collision, 21, 3);
	solidAt(width, collision, 25, 8);
	solidAt(width, collision, 23, 12);

	const zones: RoomZone[] = [
		{ id: 'work', x0: 1, y0: 1, x1: 8, y1: 14, label: 'Atelier' },
		{ id: 'gallery', x0: 10, y0: 1, x1: 17, y1: 14, label: 'Show gallery' },
		{ id: 'foyer', x0: 19, y0: 1, x1: 26, y1: 14, label: 'Foyer' }
	];

	return {
		id: 'mega-museum',
		width,
		height,
		collision,
		ground,
		door,
		clientWait: { tx: 6, ty: 2 },
		desk: { tx: 6, ty: 7 },
		playerSpawn: { tx: 2, ty: 13 },
		fridgeAnchor: { tx: 2, ty: 2 },
		furniture: [
			{ frame: 0, tx: 5, ty: 7, solid: true },
			{ frame: 2, tx: 3, ty: 3, solid: true },
			{ frame: 4, tx: 7, ty: 5, solid: true },
			{ frame: 1, tx: 2, ty: 12, solid: true },
			{ frame: 4, tx: 12, ty: 4, solid: true },
			{ frame: 4, tx: 14, ty: 4, solid: true },
			{ frame: 4, tx: 15, ty: 9, solid: true },
			{ frame: 0, tx: 13, ty: 12, solid: true },
			{ frame: 4, tx: 22, ty: 5, solid: true },
			{ frame: 4, tx: 24, ty: 10, solid: true },
			{ frame: 2, tx: 21, ty: 3, solid: true },
			{ frame: 1, tx: 25, ty: 8, solid: true },
			{ frame: 1, tx: 23, ty: 12, solid: true }
		],
		zones,
		residents: [],
		palette: 'museum'
	};
}

const kitchen = buildKitchen();
const garage = buildGarage();
const storefront = buildStorefront();
const galleryHall = buildGalleryHall();
const megaMuseum = buildMegaMuseum();

export const ROOMS: Record<RoomId, RoomDef> = {
	'home-kitchen': kitchen,
	'art-room': garage,
	studio: storefront,
	gallery: galleryHall,
	'mega-museum': megaMuseum
};

export function getRoomForEnvironment(environmentId: string): RoomDef {
	if (environmentId in ROOMS) {
		return ROOMS[environmentId as RoomId];
	}
	return ROOMS['home-kitchen'];
}

export function markerWalkable(room: RoomDef, marker: TileMarker): boolean {
	if (marker.tx < 0 || marker.ty < 0 || marker.tx >= room.width || marker.ty >= room.height) {
		return false;
	}
	return room.collision[marker.ty * room.width + marker.tx] === 0;
}

/** True when the perimeter uses distinct corner / edge autotiles (not one index on every border cell). */
export function roomUsesWallAutotiles(room: RoomDef): boolean {
	const corners = [
		{ tx: 0, ty: 0 },
		{ tx: room.width - 1, ty: 0 },
		{ tx: 0, ty: room.height - 1 },
		{ tx: room.width - 1, ty: room.height - 1 }
	];
	const cornerTiles = new Set(corners.map((c) => room.ground[c.ty * room.width + c.tx]));
	if (cornerTiles.size < 4) return false;

	const northEdge = room.ground[1]; // (1, 0)
	const westEdge = room.ground[room.width]; // (0, 1)
	return northEdge !== westEdge;
}
