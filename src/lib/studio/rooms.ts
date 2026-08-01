import { TILE } from './config';
import type { InteractableId } from './interactables';

export type RoomId = 'home-kitchen' | 'art-room' | 'studio' | 'gallery' | 'mega-museum';

export type RoomZoneId = 'work' | 'gallery' | 'foyer' | 'window';

export interface TileMarker {
	/** Tile coordinates (not pixels). */
	tx: number;
	ty: number;
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
}

function idx(width: number, tx: number, ty: number): number {
	return ty * width + tx;
}

function paintOuterWalls(
	width: number,
	height: number,
	collision: number[],
	ground: number[],
	wallTile: number
): void {
	for (let x = 0; x < width; x++) {
		collision[idx(width, x, 0)] = 1;
		collision[idx(width, x, height - 1)] = 1;
		ground[idx(width, x, 0)] = wallTile;
		ground[idx(width, x, height - 1)] = wallTile;
	}
	for (let y = 0; y < height; y++) {
		collision[idx(width, 0, y)] = 1;
		collision[idx(width, width - 1, y)] = 1;
		ground[idx(width, 0, y)] = wallTile;
		ground[idx(width, width - 1, y)] = wallTile;
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
	const ground = new Array<number>(width * height).fill(TILE.floor);

	paintOuterWalls(width, height, collision, ground, TILE.wall);

	const door = { tx: 2, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.floor);

	// Wood floor under desk/work cells (2..3, 3..4).
	for (let y = 3; y <= 4; y++) {
		for (let x = 2; x <= 3; x++) {
			ground[idx(width, x, y)] = TILE.woodFloor;
		}
	}

	const desk = { tx: 3, ty: 3 };
	const fridgeAnchor = { tx: 1, ty: 1 };
	solidAt(width, collision, 2, 3); // table
	solidAt(width, collision, 1, 1); // fridge

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
			{ frame: 2, tx: 1, ty: 1, solid: true, interactableId: 'fridge' }
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

	paintOuterWalls(width, height, collision, ground, TILE.garageWall);

	const door = { tx: 5, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.concrete);

	// Workbench block (solid) on wood patch.
	for (let x = 3; x <= 5; x++) {
		ground[idx(width, x, 5)] = TILE.woodFloor;
	}
	solidAt(width, collision, 3, 5);
	solidAt(width, collision, 4, 5);

	// Wall easel props along east interior.
	solidAt(width, collision, 10, 3);
	solidAt(width, collision, 10, 6);

	return {
		id: 'art-room',
		width,
		height,
		collision,
		ground,
		door,
		clientWait: { tx: 5, ty: 2 },
		desk: { tx: 5, ty: 5 },
		playerSpawn: { tx: 2, ty: 7 },
		fridgeAnchor: { tx: 2, ty: 2 },
		furniture: [
			{ frame: 0, tx: 3, ty: 5, solid: true, interactableId: 'toolkit-shelf' },
			{ frame: 0, tx: 4, ty: 5, solid: true },
			{ frame: 4, tx: 10, ty: 3, solid: true },
			{ frame: 4, tx: 10, ty: 6, solid: true },
			{ frame: 1, tx: 8, ty: 8, solid: true }
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

	paintOuterWalls(width, height, collision, ground, TILE.wall);

	const door = { tx: 4, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.woodFloor);

	// Internal wall between work (W) and window (E) at tx=9, doorway at ty=5.
	for (let y = 1; y < height - 1; y++) {
		collision[idx(width, 9, y)] = 1;
		ground[idx(width, 9, y)] = TILE.wall;
	}
	openCell(width, collision, ground, 9, 5, TILE.woodFloor);

	// Carpet strip in window display zone.
	for (let y = 2; y <= 9; y++) {
		for (let x = 11; x <= 16; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = TILE.carpet;
			}
		}
	}

	solidAt(width, collision, 4, 6);
	solidAt(width, collision, 14, 4);

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
			{ frame: 4, tx: 14, ty: 4, solid: true },
			{ frame: 1, tx: 12, ty: 8, solid: true },
			{ frame: 2, tx: 2, ty: 3, solid: true }
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

	paintOuterWalls(width, height, collision, ground, TILE.wall);

	const door = { tx: 5, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.museumFloor);

	// Divider between atelier (W) and show gallery (E) at tx=10.
	for (let y = 1; y < height - 1; y++) {
		collision[idx(width, 10, y)] = 1;
		ground[idx(width, 10, y)] = TILE.wall;
	}
	openCell(width, collision, ground, 10, 6, TILE.museumFloor);

	// Wood work patch in atelier.
	for (let y = 5; y <= 8; y++) {
		for (let x = 3; x <= 7; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = TILE.woodFloor;
			}
		}
	}

	solidAt(width, collision, 5, 7);
	solidAt(width, collision, 16, 4);
	solidAt(width, collision, 18, 8);

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
			{ frame: 4, tx: 16, ty: 4, solid: true },
			{ frame: 4, tx: 18, ty: 8, solid: true },
			{ frame: 1, tx: 14, ty: 11, solid: true },
			{ frame: 2, tx: 3, ty: 3, solid: true }
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

	paintOuterWalls(width, height, collision, ground, TILE.wall);

	const door = { tx: 6, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, TILE.museumFloor);

	// Vertical dividers: atelier | gallery | foyer at tx=9 and tx=18.
	for (let y = 1; y < height - 1; y++) {
		collision[idx(width, 9, y)] = 1;
		ground[idx(width, 9, y)] = TILE.wall;
		collision[idx(width, 18, y)] = 1;
		ground[idx(width, 18, y)] = TILE.wall;
	}
	openCell(width, collision, ground, 9, 7, TILE.museumFloor);
	openCell(width, collision, ground, 18, 7, TILE.museumFloor);

	// Atelier wood patch.
	for (let y = 5; y <= 9; y++) {
		for (let x = 3; x <= 7; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = TILE.woodFloor;
			}
		}
	}

	// Foyer carpet mat (flavour).
	for (let y = 12; y <= 14; y++) {
		for (let x = 20; x <= 25; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = TILE.carpet;
			}
		}
	}

	solidAt(width, collision, 5, 7);
	solidAt(width, collision, 13, 4);
	solidAt(width, collision, 15, 9);
	solidAt(width, collision, 22, 5);
	solidAt(width, collision, 24, 10);

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
			{ frame: 4, tx: 13, ty: 4, solid: true },
			{ frame: 4, tx: 15, ty: 9, solid: true },
			{ frame: 4, tx: 22, ty: 5, solid: true },
			{ frame: 4, tx: 24, ty: 10, solid: true },
			{ frame: 1, tx: 12, ty: 13, solid: true },
			{ frame: 2, tx: 3, ty: 3, solid: true },
			{ frame: 1, tx: 21, ty: 3, solid: true }
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
