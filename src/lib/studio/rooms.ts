import type { InteractableId } from './interactables';
import { INDOOR, INTERIOR, SHEET } from './roomTiles';

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

function compactGroundSheets(
	sheets: (string | undefined)[]
): readonly (string | undefined)[] | undefined {
	return sheets.some((sheet) => sheet !== undefined) ? sheets : undefined;
}

function paintGroundPatch(
	width: number,
	ground: number[],
	groundSheets: (string | undefined)[],
	primaryTileset: string,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	frame: number,
	sheet?: string
): void {
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			const i = idx(width, x, y);
			ground[i] = frame;
			groundSheets[i] = sheet && sheet !== primaryTileset ? sheet : undefined;
		}
	}
}

function buildKitchen(): RoomDef {
	const width = 6;
	const height = 6;
	const tilesetId = SHEET.indoor;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INDOOR.floor);
	const groundSheets = new Array<string | undefined>(width * height);

	paintOuterWalls(width, height, collision, ground, INDOOR.wall);

	const door = { tx: 2, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, INDOOR.floor);

	// Stone work patch under the prep counter run (walkable — decor only).
	paintGroundPatch(width, ground, groundSheets, tilesetId, 2, 3, 3, 4, INTERIOR.stoneFloor, SHEET.interior);

	const desk = { tx: 3, ty: 3 };
	const fridgeAnchor = { tx: 1, ty: 1 };
	solidAt(width, collision, 2, 3); // table
	solidAt(width, collision, 1, 1); // fridge cabinet

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
		groundSheets: compactGroundSheets(groundSheets),
		tilesetId,
		door,
		clientWait: { tx: 2, ty: 1 },
		desk,
		playerSpawn: { tx: 1, ty: 4 },
		fridgeAnchor,
		furniture: [
			{ frame: INDOOR.roundTable, tx: 2, ty: 3, solid: true, sheet: SHEET.indoorProps },
			{
				frame: INDOOR.cabinet,
				tx: 1,
				ty: 1,
				solid: true,
				sheet: SHEET.indoorProps,
				interactableId: 'fridge'
			},
			{ frame: INDOOR.counterL, tx: 3, ty: 1, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.sink, tx: 4, ty: 1, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.counterR, tx: 4, ty: 2, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.plantTall, tx: 4, ty: 3, solid: false, sheet: SHEET.indoorProps }
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
	const tilesetId = SHEET.indoor;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INDOOR.floorGrey);

	paintOuterWalls(width, height, collision, ground, INDOOR.wall);

	const door = { tx: 5, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, INDOOR.floorGrey);

	// Workbench block (solid) on wood-toned floor patch.
	for (let x = 3; x <= 5; x++) {
		ground[idx(width, x, 5)] = INDOOR.floor;
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
		tilesetId,
		door,
		clientWait: { tx: 5, ty: 2 },
		desk: { tx: 5, ty: 5 },
		playerSpawn: { tx: 2, ty: 7 },
		fridgeAnchor: { tx: 2, ty: 2 },
		furniture: [
			{
				frame: INDOOR.counterL,
				tx: 3,
				ty: 5,
				solid: true,
				sheet: SHEET.indoorProps,
				interactableId: 'toolkit-shelf'
			},
			{ frame: INDOOR.counterR, tx: 4, ty: 5, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingA, tx: 10, ty: 3, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 10, ty: 6, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.stool, tx: 8, ty: 8, solid: true, sheet: SHEET.indoorProps }
		],
		zones: [],
		residents: [],
		palette: 'garage'
	};
}

function buildStorefront(): RoomDef {
	const width = 18;
	const height = 12;
	const tilesetId = SHEET.indoor;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INDOOR.floor);
	const groundSheets = new Array<string | undefined>(width * height);

	paintOuterWalls(width, height, collision, ground, INDOOR.wall);

	const door = { tx: 4, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, INDOOR.floor);

	// Internal wall between work (W) and window (E) at tx=9, doorway at ty=5.
	for (let y = 1; y < height - 1; y++) {
		collision[idx(width, 9, y)] = 1;
		ground[idx(width, 9, y)] = INDOOR.wall;
	}
	openCell(width, collision, ground, 9, 5, INDOOR.floor);

	// Carpet strip in window display zone (Tilation blue carpet).
	for (let y = 2; y <= 9; y++) {
		for (let x = 11; x <= 16; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.carpetBlue;
				groundSheets[idx(width, x, y)] = SHEET.interior;
			}
		}
	}

	solidAt(width, collision, 4, 6);
	solidAt(width, collision, 15, 2);
	solidAt(width, collision, 15, 7);

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
		groundSheets: compactGroundSheets(groundSheets),
		tilesetId,
		door,
		clientWait: { tx: 4, ty: 2 },
		desk: { tx: 5, ty: 6 },
		playerSpawn: { tx: 2, ty: 9 },
		fridgeAnchor: { tx: 2, ty: 2 },
		furniture: [
			{ frame: INDOOR.roundTable, tx: 4, ty: 6, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingA, tx: 15, ty: 2, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 15, ty: 7, solid: true, sheet: SHEET.indoorProps },
			{ frame: INTERIOR.armchair, tx: 12, ty: 8, solid: true, sheet: SHEET.interiorProps },
			{ frame: INDOOR.bookshelf, tx: 2, ty: 3, solid: true, sheet: SHEET.indoorProps }
		],
		zones,
		residents: [],
		palette: 'storefront'
	};
}

function buildGalleryHall(): RoomDef {
	const width = 22;
	const height = 14;
	const tilesetId = SHEET.interior;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INTERIOR.woodFloor);

	paintOuterWalls(width, height, collision, ground, INTERIOR.wall);

	const door = { tx: 5, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, INTERIOR.woodFloor);

	// Divider between atelier (W) and show gallery (E) at tx=10.
	for (let y = 1; y < height - 1; y++) {
		collision[idx(width, 10, y)] = 1;
		ground[idx(width, 10, y)] = INTERIOR.wallWood;
	}
	openCell(width, collision, ground, 10, 6, INTERIOR.woodFloor);

	// Wood work patch in atelier.
	for (let y = 5; y <= 8; y++) {
		for (let x = 3; x <= 7; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.woodFloor;
			}
		}
	}

	// Show gallery carpet.
	for (let y = 2; y <= 11; y++) {
		for (let x = 12; x <= 19; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.carpetPurple;
			}
		}
	}

	solidAt(width, collision, 5, 7);
	solidAt(width, collision, 12, 2);
	solidAt(width, collision, 17, 2);
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
		tilesetId,
		door,
		clientWait: { tx: 5, ty: 2 },
		desk: { tx: 6, ty: 7 },
		playerSpawn: { tx: 2, ty: 11 },
		fridgeAnchor: { tx: 2, ty: 2 },
		furniture: [
			{ frame: INTERIOR.table, tx: 5, ty: 7, solid: true, sheet: SHEET.interiorProps },
			{ frame: INDOOR.paintingA, tx: 12, ty: 2, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 17, ty: 2, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingA, tx: 16, ty: 4, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 18, ty: 8, solid: true, sheet: SHEET.indoorProps },
			{ frame: INTERIOR.armchair, tx: 14, ty: 11, solid: true, sheet: SHEET.interiorProps },
			{ frame: INTERIOR.bookshelf, tx: 3, ty: 3, solid: true, sheet: SHEET.interiorProps },
			{ frame: INTERIOR.plantMed, tx: 17, ty: 3, solid: false, sheet: SHEET.interiorProps }
		],
		zones,
		residents: [],
		palette: 'museum'
	};
}

export function buildMegaMuseum(): RoomDef {
	const width = 28;
	const height = 16;
	const tilesetId = SHEET.interior;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INTERIOR.woodFloor);

	paintOuterWalls(width, height, collision, ground, INTERIOR.wall);

	const door = { tx: 6, ty: 0 };
	openCell(width, collision, ground, door.tx, door.ty, INTERIOR.woodFloor);

	// Vertical dividers: atelier | gallery | foyer at tx=9 and tx=18.
	for (let y = 1; y < height - 1; y++) {
		collision[idx(width, 9, y)] = 1;
		ground[idx(width, 9, y)] = INTERIOR.wallWood;
		collision[idx(width, 18, y)] = 1;
		ground[idx(width, 18, y)] = INTERIOR.wallWood;
	}
	openCell(width, collision, ground, 9, 7, INTERIOR.woodFloor);
	openCell(width, collision, ground, 18, 7, INTERIOR.woodFloor);

	// Atelier wood patch.
	for (let y = 5; y <= 9; y++) {
		for (let x = 3; x <= 7; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.woodFloor;
			}
		}
	}

	// Gallery carpet.
	for (let y = 2; y <= 13; y++) {
		for (let x = 11; x <= 16; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.carpetBlue;
			}
		}
	}

	// Foyer carpet mat.
	for (let y = 12; y <= 14; y++) {
		for (let x = 20; x <= 25; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.carpetRed;
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
		tilesetId,
		door,
		clientWait: { tx: 6, ty: 2 },
		desk: { tx: 6, ty: 7 },
		playerSpawn: { tx: 2, ty: 13 },
		fridgeAnchor: { tx: 2, ty: 2 },
		furniture: [
			{ frame: INTERIOR.table, tx: 5, ty: 7, solid: true, sheet: SHEET.interiorProps },
			{ frame: INDOOR.paintingA, tx: 13, ty: 4, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 15, ty: 9, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingA, tx: 22, ty: 5, solid: true, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 24, ty: 10, solid: true, sheet: SHEET.indoorProps },
			{ frame: INTERIOR.armchair, tx: 12, ty: 13, solid: true, sheet: SHEET.interiorProps },
			{ frame: INTERIOR.bookshelf, tx: 3, ty: 3, solid: true, sheet: SHEET.interiorProps },
			{ frame: INTERIOR.plantTall, tx: 21, ty: 3, solid: false, sheet: SHEET.interiorProps }
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
