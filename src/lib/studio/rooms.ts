import type { InteractableId } from './interactables';
import { storageForVenue } from '$lib/data/studioStorage';
import { DUNGEON, INDOOR, INTERIOR, SHEET } from './roomTiles';

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

/** One storage object per venue. Missing on pre-spec-34 editor drafts. */
export function roomStorageAnchor(
	room: Pick<RoomDef, 'storageAnchor'> | { storageAnchor?: TileMarker }
): TileMarker | undefined {
	return room.storageAnchor;
}

/** Phaser sheet key for a venue storage sprite (`home-indoor` / `home-interior` packs). */
export function storagePropSheet(sheet: 'home-indoor' | 'home-interior'): string {
	return sheet === 'home-indoor' ? SHEET.indoorProps : SHEET.interiorProps;
}

/**
 * Authored room id → progressive venue id (inverse of `roomIdForVenue`).
 * Kept here so the studio-editor can stamp storage furniture without importing venueRooms
 * (that module loads editor drafts and would cycle).
 */
export function venueIdForRoomId(roomId: string): string {
	switch (roomId) {
		case 'art-room':
			return 'garage';
		case 'studio':
			return 'storefront';
		case 'gallery':
			return 'gallery-hall';
		case 'mega-museum':
			return 'mega-museum';
		case 'home-kitchen':
		default:
			return 'fridge';
	}
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
	/** Unique per venue — practice archive / crate / vault. */
	storageAnchor: TileMarker;
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

function paintNorthWallBand(
	width: number,
	collision: number[],
	ground: number[],
	groundSheets: (string | undefined)[],
	primaryTileset: string,
	bandHeight = 2
): void {
	const sheetTag = SHEET.dungeon !== primaryTileset ? SHEET.dungeon : undefined;
	for (let y = 0; y < bandHeight; y++) {
		for (let x = 0; x < width; x++) {
			const i = idx(width, x, y);
			collision[i] = 1;
			ground[i] = DUNGEON.wall;
			groundSheets[i] = sheetTag;
		}
	}
}

function openNorthDoor(
	width: number,
	collision: number[],
	ground: number[],
	groundSheets: (string | undefined)[] | undefined,
	doorTx: number,
	floorTile: number,
	floorSheet?: string,
	primaryTileset?: string,
	bandHeight = 2
): void {
	for (let y = 0; y < bandHeight; y++) {
		openCell(
			width,
			collision,
			ground,
			groundSheets,
			doorTx,
			y,
			floorTile,
			floorSheet,
			primaryTileset
		);
	}
}

function fillFloor(
	width: number,
	height: number,
	ground: number[],
	groundSheets: (string | undefined)[],
	primaryTileset: string,
	floorTile: number,
	floorSheet: string
): void {
	const sheetTag = floorSheet !== primaryTileset ? floorSheet : undefined;
	for (let i = 0; i < width * height; i++) {
		ground[i] = floorTile;
		groundSheets[i] = sheetTag;
	}
}

function openCell(
	width: number,
	collision: number[],
	ground: number[],
	groundSheets: (string | undefined)[] | undefined,
	tx: number,
	ty: number,
	floorTile: number,
	floorSheet?: string,
	primaryTileset?: string
): void {
	collision[idx(width, tx, ty)] = 0;
	ground[idx(width, tx, ty)] = floorTile;
	if (groundSheets) {
		groundSheets[idx(width, tx, ty)] =
			floorSheet && floorSheet !== primaryTileset ? floorSheet : undefined;
	}
}

function solidAt(width: number, collision: number[], tx: number, ty: number): void {
	collision[idx(width, tx, ty)] = 1;
}

function storageFurniture(venueId: string, width: number, collision: number[]): FurnitureProp {
	const def = storageForVenue(venueId);
	solidAt(width, collision, def.tx, def.ty);
	return {
		frame: def.frame,
		tx: def.tx,
		ty: def.ty,
		solid: true,
		interactableId: 'storage',
		sheet: storagePropSheet(def.sheet)
	};
}

function compactGroundSheets(
	sheets: (string | undefined)[]
): readonly (string | undefined)[] | undefined {
	return sheets.some((sheet) => sheet !== undefined) ? sheets : undefined;
}

function buildKitchen(): RoomDef {
	const width = 6;
	const height = 6;
	const tilesetId = SHEET.dungeon;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INDOOR.floor);
	const groundSheets = new Array<string | undefined>(width * height);

	fillFloor(width, height, ground, groundSheets, tilesetId, INDOOR.floor, SHEET.interior);
	paintNorthWallBand(width, collision, ground, groundSheets, tilesetId);

	const door = { tx: 2, ty: 0 };
	openNorthDoor(
		width,
		collision,
		ground,
		groundSheets,
		door.tx,
		INDOOR.floor,
		SHEET.interior,
		tilesetId
	);

	const desk = { tx: 3, ty: 3 };
	const fridgeAnchor = { tx: 1, ty: 2 };
	const fridgeAnchors = [
		{ tx: 0, ty: 2 },
		{ tx: 0, ty: 3 }
	] as const;
	const storageDef = storageForVenue('fridge');
	const storageAnchor = { tx: storageDef.tx, ty: storageDef.ty };
	solidAt(width, collision, 1, 2);
	solidAt(width, collision, 0, 2);
	solidAt(width, collision, 0, 3);

	const patrol = [
		{ tx: 4, ty: 2 },
		{ tx: 4, ty: 4 },
		{ tx: 1, ty: 4 },
		{ tx: 3, ty: 2 },
		{ tx: 2, ty: 3 }
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
		clientWait: { tx: 2, ty: 2 },
		desk,
		playerSpawn: { tx: 1, ty: 4 },
		fridgeAnchor,
		fridgeAnchors,
		storageAnchor,
		furniture: [
			{
				frame: INDOOR.cabinet,
				tx: 1,
				ty: 2,
				solid: true,
				sheet: SHEET.indoorProps,
				interactableId: 'fridge'
			},
			{
				frame: INDOOR.cabinet,
				tx: 0,
				ty: 2,
				solid: true,
				sheet: SHEET.indoorProps,
				interactableId: 'fridge'
			},
			{
				frame: INDOOR.cabinet,
				tx: 0,
				ty: 3,
				solid: true,
				sheet: SHEET.indoorProps,
				interactableId: 'fridge'
			},
			{ frame: INDOOR.counterL, tx: 3, ty: 2, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.sink, tx: 4, ty: 2, solid: false, sheet: SHEET.indoorProps },
			storageFurniture('fridge', width, collision)
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
	const tilesetId = SHEET.dungeon;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INDOOR.floorGrey);
	const groundSheets = new Array<string | undefined>(width * height);

	fillFloor(width, height, ground, groundSheets, tilesetId, INDOOR.floorGrey, SHEET.interior);
	paintNorthWallBand(width, collision, ground, groundSheets, tilesetId);

	const door = { tx: 5, ty: 0 };
	openNorthDoor(
		width,
		collision,
		ground,
		groundSheets,
		door.tx,
		INDOOR.floorGrey,
		SHEET.interior,
		tilesetId
	);

	// Workbench on wood-toned floor patch.
	for (let x = 3; x <= 4; x++) {
		ground[idx(width, x, 5)] = INDOOR.floor;
	}
	solidAt(width, collision, 3, 5);

	return {
		id: 'art-room',
		width,
		height,
		collision,
		ground,
		groundSheets: compactGroundSheets(groundSheets),
		tilesetId,
		door,
		clientWait: { tx: 5, ty: 2 },
		desk: { tx: 5, ty: 5 },
		playerSpawn: { tx: 2, ty: 7 },
		fridgeAnchor: { tx: 2, ty: 2 },
		storageAnchor: { tx: storageForVenue('garage').tx, ty: storageForVenue('garage').ty },
		furniture: [
			{
				frame: INDOOR.counterL,
				tx: 3,
				ty: 5,
				solid: true,
				sheet: SHEET.indoorProps,
				interactableId: 'toolkit-shelf'
			},
			{ frame: INDOOR.paintingA, tx: 10, ty: 3, solid: false, sheet: SHEET.indoorProps },
			storageFurniture('garage', width, collision)
		],
		zones: [],
		residents: [],
		palette: 'garage'
	};
}

function buildStorefront(): RoomDef {
	const width = 18;
	const height = 12;
	const tilesetId = SHEET.dungeon;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INDOOR.floor);
	const groundSheets = new Array<string | undefined>(width * height);

	fillFloor(width, height, ground, groundSheets, tilesetId, INDOOR.floor, SHEET.interior);
	paintNorthWallBand(width, collision, ground, groundSheets, tilesetId);

	const door = { tx: 4, ty: 0 };
	openNorthDoor(
		width,
		collision,
		ground,
		groundSheets,
		door.tx,
		INDOOR.floor,
		SHEET.interior,
		tilesetId
	);

	// Small blue carpet mat in window display zone.
	for (let y = 7; y <= 9; y++) {
		for (let x = 13; x <= 15; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.carpetBlue;
				groundSheets[idx(width, x, y)] = SHEET.interior;
			}
		}
	}

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
		storageAnchor: { tx: storageForVenue('storefront').tx, ty: storageForVenue('storefront').ty },
		furniture: [
			{ frame: INDOOR.counterL, tx: 14, ty: 8, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingA, tx: 15, ty: 3, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 15, ty: 7, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.plantMed, tx: 12, ty: 3, solid: false, sheet: SHEET.indoorProps },
			storageFurniture('storefront', width, collision)
		],
		zones,
		residents: [],
		palette: 'storefront'
	};
}

function buildGalleryHall(): RoomDef {
	const width = 22;
	const height = 14;
	const tilesetId = SHEET.dungeon;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INTERIOR.woodFloor);
	const groundSheets = new Array<string | undefined>(width * height);

	fillFloor(width, height, ground, groundSheets, tilesetId, INTERIOR.woodFloor, SHEET.interior);
	paintNorthWallBand(width, collision, ground, groundSheets, tilesetId);

	const door = { tx: 5, ty: 0 };
	openNorthDoor(
		width,
		collision,
		ground,
		groundSheets,
		door.tx,
		INTERIOR.woodFloor,
		SHEET.interior,
		tilesetId
	);

	// Small purple carpet mat in show gallery.
	for (let y = 5; y <= 8; y++) {
		for (let x = 14; x <= 17; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.carpetPurple;
				groundSheets[idx(width, x, y)] = SHEET.interior;
			}
		}
	}

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
		groundSheets: compactGroundSheets(groundSheets),
		tilesetId,
		door,
		clientWait: { tx: 5, ty: 2 },
		desk: { tx: 6, ty: 7 },
		playerSpawn: { tx: 2, ty: 11 },
		fridgeAnchor: { tx: 2, ty: 2 },
		storageAnchor: {
			tx: storageForVenue('gallery-hall').tx,
			ty: storageForVenue('gallery-hall').ty
		},
		furniture: [
			{ frame: INDOOR.paintingA, tx: 12, ty: 3, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 17, ty: 3, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingA, tx: 19, ty: 5, solid: false, sheet: SHEET.indoorProps },
			{ frame: INTERIOR.plantMed, tx: 16, ty: 3, solid: false, sheet: SHEET.interiorProps },
			storageFurniture('gallery-hall', width, collision)
		],
		zones,
		residents: [],
		palette: 'museum'
	};
}

export function buildMegaMuseum(): RoomDef {
	const width = 28;
	const height = 16;
	const tilesetId = SHEET.dungeon;
	const collision = new Array<number>(width * height).fill(0);
	const ground = new Array<number>(width * height).fill(INTERIOR.woodFloor);
	const groundSheets = new Array<string | undefined>(width * height);

	fillFloor(width, height, ground, groundSheets, tilesetId, INTERIOR.woodFloor, SHEET.interior);
	paintNorthWallBand(width, collision, ground, groundSheets, tilesetId);

	const door = { tx: 6, ty: 0 };
	openNorthDoor(
		width,
		collision,
		ground,
		groundSheets,
		door.tx,
		INTERIOR.woodFloor,
		SHEET.interior,
		tilesetId
	);

	// Small gallery carpet mat.
	for (let y = 6; y <= 9; y++) {
		for (let x = 12; x <= 15; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.carpetBlue;
				groundSheets[idx(width, x, y)] = SHEET.interior;
			}
		}
	}

	// Small foyer carpet mat.
	for (let y = 12; y <= 13; y++) {
		for (let x = 22; x <= 24; x++) {
			if (collision[idx(width, x, y)] === 0) {
				ground[idx(width, x, y)] = INTERIOR.carpetRed;
				groundSheets[idx(width, x, y)] = SHEET.interior;
			}
		}
	}

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
		groundSheets: compactGroundSheets(groundSheets),
		tilesetId,
		door,
		clientWait: { tx: 6, ty: 2 },
		desk: { tx: 6, ty: 7 },
		playerSpawn: { tx: 2, ty: 13 },
		fridgeAnchor: { tx: 2, ty: 2 },
		storageAnchor: { tx: storageForVenue('mega-museum').tx, ty: storageForVenue('mega-museum').ty },
		furniture: [
			{ frame: INDOOR.paintingA, tx: 13, ty: 4, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 15, ty: 4, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingA, tx: 22, ty: 5, solid: false, sheet: SHEET.indoorProps },
			{ frame: INDOOR.paintingB, tx: 24, ty: 10, solid: false, sheet: SHEET.indoorProps },
			{ frame: INTERIOR.plantTall, tx: 21, ty: 3, solid: false, sheet: SHEET.interiorProps },
			storageFurniture('mega-museum', width, collision)
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

/**
 * Kitchen fridge markers always get a solid E-interactable cabinet.
 * Editor drafts that tagged Fridge + Wall often stored collision without
 * furniture, so extras blocked walking but did nothing on E.
 */
export function stampKitchenFridgeProps(room: RoomDef): RoomDef {
	if (room.id !== 'home-kitchen') return room;
	let collision: number[] | undefined;
	let furniture: FurnitureProp[] | undefined;
	let changed = false;
	for (const origin of roomFridgeAnchors(room)) {
		if (origin.tx < 0 || origin.ty < 0 || origin.tx >= room.width || origin.ty >= room.height) {
			continue;
		}
		const i = origin.ty * room.width + origin.tx;
		if (room.collision[i] !== 1) {
			collision ??= [...room.collision];
			collision[i] = 1;
			changed = true;
		}
		const existing = (furniture ?? room.furniture).find(
			(prop) => prop.tx === origin.tx && prop.ty === origin.ty
		);
		if (!existing) {
			furniture ??= [...room.furniture];
			furniture.push({
				frame: INDOOR.cabinet,
				tx: origin.tx,
				ty: origin.ty,
				solid: true,
				sheet: SHEET.indoorProps,
				interactableId: 'fridge'
			});
			changed = true;
			continue;
		}
		if (existing.interactableId === 'fridge' && existing.solid) continue;
		furniture = (furniture ?? [...room.furniture]).map((prop) =>
			prop.tx === origin.tx && prop.ty === origin.ty
				? { ...prop, solid: true, interactableId: 'fridge' as const }
				: prop
		);
		changed = true;
	}
	if (!changed) return room;
	return {
		...room,
		collision: collision ?? room.collision,
		furniture: furniture ?? room.furniture
	};
}

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
