import type { RoomId } from '$lib/studio/rooms';

/** Packed Kenney / CC0 sheets used by the studio editor and Phaser. */
export interface SheetSpec {
	id: string;
	label: string;
	url: string;
	/** Phaser texture key. Tilesets and people sheets never share a key. */
	phaserKey: string;
	tileSize: number;
	spacing: number;
	margin: number;
	columns: number;
	rows: number;
	imageWidth: number;
	imageHeight: number;
}

export interface TilesetSpec extends SheetSpec {
	defaultFloor: number;
	defaultWall: number;
	/** Spritesheet key for per-cell floor/wall overlays (same PNG as `phaserKey`). */
	framePhaserKey: string;
}

export const TILESET_IDS = [
	'home-interior',
	'home-indoor',
	'tiny-town',
	'tiny-dungeon',
	'tiny-battle'
] as const;
export type TilesetId = (typeof TILESET_IDS)[number];

export const FURNITURE_SHEET_IDS = [
	'furniture',
	'home-interior-props',
	'home-indoor-props'
] as const;
export type FurnitureSheetId = (typeof FURNITURE_SHEET_IDS)[number];

export const PERSON_SLOT_IDS = [
	'player',
	'mum',
	'walk-in',
	'corporate',
	'billionaire',
	'auction-house',
	'apprentice',
	'marketing-director',
	'curator'
] as const;
export type PersonSlotId = (typeof PERSON_SLOT_IDS)[number];

export const PEOPLE_SHEET_IDS = [
	'player',
	'mum',
	'clients',
	'staff',
	'tiny-dungeon-folk',
	'tiny-town-folk',
	'tiny-battle-units',
	'tiny-creatures'
] as const;
export type PeopleSheetId = (typeof PEOPLE_SHEET_IDS)[number];

export const TILE_ROLES = [
	'none',
	'door',
	'desk',
	'player-spawn',
	'fridge',
	'client-wait'
] as const;
export type TileRole = (typeof TILE_ROLES)[number];

export const FURNITURE_CHOICES = [
	{ id: 'none', label: 'None', frame: null },
	{ id: 'table', label: 'Table', frame: 0 },
	{ id: 'barrel', label: 'Barrel', frame: 1 },
	{ id: 'chest', label: 'Chest', frame: 2 },
	{ id: 'open-chest', label: 'Open chest', frame: 3 },
	{ id: 'block', label: 'Block', frame: 4 }
] as const;

export const TINT_PRESETS = [
	{ id: 'none', label: 'No tint', value: null },
	{ id: 'warm', label: 'Warm', value: 0xffc9a8 },
	{ id: 'cool', label: 'Cool', value: 0xa8d4ff },
	{ id: 'gold', label: 'Gold', value: 0xffd4a8 },
	{ id: 'museum', label: 'Museum', value: 0xd4c4a8 },
	{ id: 'corporate', label: 'Corporate', value: 0x7a9cc4 },
	{ id: 'violet', label: 'Violet', value: 0xb48cff },
	{ id: 'auction', label: 'Auction', value: 0xc47878 }
] as const;

export const TILESETS: Record<TilesetId, TilesetSpec> = {
	'home-interior': {
		id: 'home-interior',
		label: 'Home interior',
		url: '/studio/tiles/home-interior.png',
		phaserKey: 'home-interior',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 8,
		rows: 27,
		imageWidth: 128,
		imageHeight: 432,
		defaultFloor: 0,
		defaultWall: 64,
		framePhaserKey: 'home-interior-props'
	},
	'home-indoor': {
		id: 'home-indoor',
		label: 'Cottage indoor',
		url: '/studio/tiles/home-indoor.png',
		phaserKey: 'home-indoor',
		tileSize: 16,
		spacing: 1,
		margin: 0,
		columns: 26,
		rows: 18,
		imageWidth: 457,
		imageHeight: 305,
		defaultFloor: 0,
		defaultWall: 22,
		framePhaserKey: 'home-indoor-props'
	},
	'tiny-dungeon': {
		id: 'tiny-dungeon',
		label: 'Tiny Dungeon',
		url: '/studio/tiles/walls-floors.png',
		phaserKey: 'walls-floors',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 12,
		rows: 11,
		imageWidth: 192,
		imageHeight: 176,
		defaultFloor: 0,
		defaultWall: 12,
		framePhaserKey: 'tiny-dungeon-folk'
	},
	'tiny-town': {
		id: 'tiny-town',
		label: 'Tiny Town',
		url: '/studio/tiles/tiny-town.png',
		phaserKey: 'tiny-town',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 12,
		rows: 11,
		imageWidth: 192,
		imageHeight: 176,
		defaultFloor: 0,
		defaultWall: 96,
		framePhaserKey: 'tiny-town-folk'
	},
	'tiny-battle': {
		id: 'tiny-battle',
		label: 'Tiny Battle',
		url: '/studio/tiles/tiny-battle.png',
		phaserKey: 'tiny-battle',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 18,
		rows: 11,
		imageWidth: 288,
		imageHeight: 176,
		defaultFloor: 0,
		defaultWall: 72,
		framePhaserKey: 'tiny-battle-units'
	}
};

export const PEOPLE_SHEETS: Record<PeopleSheetId, SheetSpec> = {
	player: {
		id: 'player',
		label: 'Player',
		url: '/studio/characters/player.png',
		phaserKey: 'player',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 9,
		rows: 1,
		imageWidth: 144,
		imageHeight: 16
	},
	mum: {
		id: 'mum',
		label: 'Mum',
		url: '/studio/characters/mum.png',
		phaserKey: 'mum',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 6,
		rows: 1,
		imageWidth: 96,
		imageHeight: 16
	},
	clients: {
		id: 'clients',
		label: 'Clients',
		url: '/studio/characters/clients.png',
		phaserKey: 'clients',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 6,
		rows: 1,
		imageWidth: 96,
		imageHeight: 16
	},
	staff: {
		id: 'staff',
		label: 'Staff',
		url: '/studio/characters/staff.png',
		phaserKey: 'staff',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 6,
		rows: 1,
		imageWidth: 96,
		imageHeight: 16
	},
	'tiny-dungeon-folk': {
		id: 'tiny-dungeon-folk',
		label: 'Tiny Dungeon folk',
		url: '/studio/tiles/walls-floors.png',
		phaserKey: 'tiny-dungeon-folk',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 12,
		rows: 11,
		imageWidth: 192,
		imageHeight: 176
	},
	'tiny-town-folk': {
		id: 'tiny-town-folk',
		label: 'Tiny Town props',
		url: '/studio/tiles/tiny-town.png',
		phaserKey: 'tiny-town-folk',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 12,
		rows: 11,
		imageWidth: 192,
		imageHeight: 176
	},
	'tiny-battle-units': {
		id: 'tiny-battle-units',
		label: 'Tiny Battle units',
		url: '/studio/tiles/tiny-battle.png',
		phaserKey: 'tiny-battle-units',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 18,
		rows: 11,
		imageWidth: 288,
		imageHeight: 176
	},
	'tiny-creatures': {
		id: 'tiny-creatures',
		label: 'Tiny Creatures',
		url: '/studio/characters/tiny-creatures.png',
		phaserKey: 'tiny-creatures',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 10,
		rows: 18,
		imageWidth: 160,
		imageHeight: 288
	}
};

export const FURNITURE_SHEET: SheetSpec = {
	id: 'furniture',
	label: 'Studio props',
	url: '/studio/tiles/furniture.png',
	phaserKey: 'furniture',
	tileSize: 16,
	spacing: 0,
	margin: 0,
	columns: 5,
	rows: 1,
	imageWidth: 80,
	imageHeight: 16
};

export const FURNITURE_SHEETS: Record<FurnitureSheetId, SheetSpec> = {
	furniture: FURNITURE_SHEET,
	'home-interior-props': {
		id: 'home-interior-props',
		label: 'Home furniture',
		url: '/studio/tiles/home-interior.png',
		phaserKey: 'home-interior-props',
		tileSize: 16,
		spacing: 0,
		margin: 0,
		columns: 8,
		rows: 27,
		imageWidth: 128,
		imageHeight: 432
	},
	'home-indoor-props': {
		id: 'home-indoor-props',
		label: 'Cottage furniture',
		url: '/studio/tiles/home-indoor.png',
		phaserKey: 'home-indoor-props',
		tileSize: 16,
		spacing: 1,
		margin: 0,
		columns: 26,
		rows: 18,
		imageWidth: 457,
		imageHeight: 305
	}
};

export const ROOM_LABELS: Record<RoomId, string> = {
	'home-kitchen': "Mum's kitchen",
	'art-room': 'Garage studio',
	studio: 'Storefront',
	gallery: 'Gallery hall',
	'mega-museum': 'Mega-museum'
};

export const PERSON_SLOT_LABELS: Record<PersonSlotId, string> = {
	player: 'Player',
	mum: 'Mum',
	'walk-in': 'Walk-in client',
	corporate: 'Corporate client',
	billionaire: 'Billionaire client',
	'auction-house': 'Auction-house client',
	apprentice: 'Apprentice',
	'marketing-director': 'Marketing director',
	curator: 'Curator'
};

export const TILE_ROLE_LABELS: Record<TileRole, string> = {
	none: 'None',
	door: 'Door',
	desk: 'Desk',
	'player-spawn': 'Player spawn',
	fridge: 'Fridge',
	'client-wait': 'Client wait'
};

export function isTilesetId(value: string | undefined): value is TilesetId {
	return !!value && (TILESET_IDS as readonly string[]).includes(value);
}

export function isPeopleSheetId(value: string): value is PeopleSheetId {
	return (PEOPLE_SHEET_IDS as readonly string[]).includes(value);
}

export function isPersonSlotId(value: string): value is PersonSlotId {
	return (PERSON_SLOT_IDS as readonly string[]).includes(value);
}

export function sheetTileCount(sheet: SheetSpec): number {
	return sheet.columns * sheet.rows;
}

/**
 * CSS background-position for one cell in a packed sheet.
 * Scale is a CSS zoom of the 16px art, not a change to atlas math.
 */
export function tileBackgroundStyle(
	sheet: SheetSpec,
	index: number,
	scale = 2
): Record<string, string> {
	const count = sheetTileCount(sheet);
	const safeIndex = ((index % count) + count) % count;
	const col = safeIndex % sheet.columns;
	const row = Math.floor(safeIndex / sheet.columns);
	const step = sheet.tileSize + sheet.spacing;
	const x = -(sheet.margin + col * step) * scale;
	const y = -(sheet.margin + row * step) * scale;
	return {
		width: `${sheet.tileSize * scale}px`,
		height: `${sheet.tileSize * scale}px`,
		'background-image': `url(${sheet.url})`,
		'background-repeat': 'no-repeat',
		'background-position': `${x}px ${y}px`,
		'background-size': `${sheet.imageWidth * scale}px ${sheet.imageHeight * scale}px`,
		'image-rendering': 'pixelated'
	};
}

export function styleMapToString(style: Record<string, string>): string {
	return Object.entries(style)
		.map(([key, value]) => `${key}:${value}`)
		.join(';');
}

export function getTileset(id: string): TilesetSpec {
	if (isTilesetId(id)) return TILESETS[id];
	return TILESETS['tiny-dungeon'];
}

export function getPeopleSheet(id: string): SheetSpec {
	if (isPeopleSheetId(id)) return PEOPLE_SHEETS[id];
	return PEOPLE_SHEETS.player;
}

export function isFurnitureSheetId(value: string | undefined): value is FurnitureSheetId {
	return !!value && (FURNITURE_SHEET_IDS as readonly string[]).includes(value);
}

export function getFurnitureSheet(id: string | undefined): SheetSpec {
	if (isFurnitureSheetId(id)) return FURNITURE_SHEETS[id];
	return FURNITURE_SHEET;
}
