import { storageForVenue } from '$lib/data/studioStorage';
import { INDOOR, SHEET } from '$lib/studio/roomTiles';
import {
	markersEqual,
	roomClientWaits,
	roomDesks,
	roomFridgeAnchors,
	roomStorageAnchor,
	storagePropSheet,
	venueIdForRoomId,
	type FurnitureProp,
	type RoomDef,
	type TileMarker
} from '$lib/studio/rooms';
import { TILESETS, getTileset, isTilesetId, type TileRole, type TilesetId } from './catalog';
import {
	cloneFurniture,
	cloneMarker,
	cloneMarkerList,
	roomToDraft,
	type RoomDraft
} from './schema';

function idx(width: number, tx: number, ty: number): number {
	return ty * width + tx;
}

function inBounds(draft: RoomDraft, tx: number, ty: number): boolean {
	return tx >= 0 && ty >= 0 && tx < draft.width && ty < draft.height;
}

export function furnitureAt(draft: RoomDraft, tx: number, ty: number): FurnitureProp | undefined {
	return draft.furniture.find((prop) => prop.tx === tx && prop.ty === ty);
}

export function roleAt(draft: RoomDraft, tx: number, ty: number): TileRole {
	const here = { tx, ty };
	if (markersEqual(draft.door, here)) return 'door';
	if (roomDesks(draft).some((marker) => markersEqual(marker, here))) return 'desk';
	if (markersEqual(draft.playerSpawn, here)) return 'player-spawn';
	if (roomFridgeAnchors(draft).some((marker) => markersEqual(marker, here))) return 'fridge';
	const storage = roomStorageAnchor(draft);
	if (storage && markersEqual(storage, here)) return 'storage';
	if (furnitureAt(draft, tx, ty)?.interactableId === 'storage') return 'storage';
	if (furnitureAt(draft, tx, ty)?.interactableId === 'toolkit-shelf') return 'toolkit';
	if (roomClientWaits(draft).some((marker) => markersEqual(marker, here))) return 'client-wait';
	return 'none';
}

export function cloneDraft(draft: RoomDraft): RoomDraft {
	return {
		id: draft.id,
		tilesetId: draft.tilesetId,
		width: draft.width,
		height: draft.height,
		collision: [...draft.collision],
		ground: [...draft.ground],
		...(draft.groundSheet ? { groundSheet: [...draft.groundSheet] } : {}),
		door: cloneMarker(draft.door),
		clientWait: cloneMarker(draft.clientWait),
		desk: cloneMarker(draft.desk),
		playerSpawn: cloneMarker(draft.playerSpawn),
		fridgeAnchor: cloneMarker(draft.fridgeAnchor),
		...(draft.storageAnchor ? { storageAnchor: cloneMarker(draft.storageAnchor) } : {}),
		...(cloneMarkerList(draft.desks) ? { desks: cloneMarkerList(draft.desks) } : {}),
		...(cloneMarkerList(draft.fridgeAnchors)
			? { fridgeAnchors: cloneMarkerList(draft.fridgeAnchors) }
			: {}),
		...(cloneMarkerList(draft.clientWaits)
			? { clientWaits: cloneMarkerList(draft.clientWaits) }
			: {}),
		furniture: cloneFurniture(draft.furniture)
	};
}

export interface TileEdit {
	ground?: number;
	groundSheet?: string;
	walkable?: boolean;
	furnitureFrame?: number | null;
	furnitureSheet?: string;
	role?: TileRole;
}

export interface GroundKind {
	ground: number;
	sheet: string;
	count: number;
}

export type WallKind = GroundKind;
export type FloorKind = GroundKind;

export interface FurnitureKind {
	frame: number;
	sheet: string;
	count: number;
}

function cloneGroundSheet(draft: RoomDraft): (string | null)[] {
	if (draft.groundSheet && draft.groundSheet.length === draft.ground.length) {
		return [...draft.groundSheet];
	}
	return draft.ground.map(() => null);
}

function compactGroundSheet(sheets: (string | null)[]): (string | null)[] | undefined {
	return sheets.some((sheet) => sheet) ? sheets : undefined;
}

export function groundSheetOf(draft: RoomDraft, index: number): string {
	return draft.groundSheet?.[index] ?? draft.tilesetId;
}

export function furnitureSheetOf(prop: FurnitureProp): string {
	return prop.sheet ?? 'furniture';
}

function isFurnitureCell(draft: RoomDraft, index: number): boolean {
	const tx = index % draft.width;
	const ty = Math.floor(index / draft.width);
	return furnitureAt(draft, tx, ty) !== undefined;
}

function listGroundKinds(draft: RoomDraft, walls: boolean): GroundKind[] {
	const counts = new Map<string, GroundKind>();
	for (let i = 0; i < draft.collision.length; i++) {
		if (walls) {
			if (draft.collision[i] !== 1 || isFurnitureCell(draft, i)) continue;
		} else if (draft.collision[i] !== 0) {
			continue;
		}
		const ground = draft.ground[i] ?? 0;
		const sheet = groundSheetOf(draft, i);
		const key = `${sheet}:${ground}`;
		const existing = counts.get(key);
		if (existing) {
			existing.count += 1;
		} else {
			counts.set(key, { ground, sheet, count: 1 });
		}
	}
	return [...counts.values()].sort((a, b) => a.sheet.localeCompare(b.sheet) || a.ground - b.ground);
}

export function listWallKinds(draft: RoomDraft): GroundKind[] {
	return listGroundKinds(draft, true);
}

export function listFloorKinds(draft: RoomDraft): GroundKind[] {
	return listGroundKinds(draft, false);
}

export function listFurnitureKinds(draft: RoomDraft): FurnitureKind[] {
	const counts = new Map<string, FurnitureKind>();
	for (const prop of draft.furniture) {
		const sheet = furnitureSheetOf(prop);
		const key = `${sheet}:${prop.frame}`;
		const existing = counts.get(key);
		if (existing) {
			existing.count += 1;
		} else {
			counts.set(key, { frame: prop.frame, sheet, count: 1 });
		}
	}
	return [...counts.values()].sort((a, b) => a.sheet.localeCompare(b.sheet) || a.frame - b.frame);
}

/** Replace every wall cell matching `from` with the `to` sprite. */
export function recolorWalls(
	draft: RoomDraft,
	from: { ground: number; sheet: string },
	to: { ground: number; sheet: string }
): RoomDraft {
	return recolorGroundKind(draft, true, from, to);
}

/** Replace every floor cell matching `from` with the `to` sprite. */
export function recolorFloors(
	draft: RoomDraft,
	from: { ground: number; sheet: string },
	to: { ground: number; sheet: string }
): RoomDraft {
	return recolorGroundKind(draft, false, from, to);
}

function recolorGroundKind(
	draft: RoomDraft,
	walls: boolean,
	from: { ground: number; sheet: string },
	to: { ground: number; sheet: string }
): RoomDraft {
	const next = cloneDraft(draft);
	const tileset = getTileset(to.sheet);
	const max = tileset.columns * tileset.rows;
	const target = ((to.ground % max) + max) % max;
	const sheets = cloneGroundSheet(next);
	for (let i = 0; i < next.collision.length; i++) {
		if (walls) {
			if (next.collision[i] !== 1 || isFurnitureCell(next, i)) continue;
		} else if (next.collision[i] !== 0) {
			continue;
		}
		if ((next.ground[i] ?? 0) !== from.ground || groundSheetOf(next, i) !== from.sheet) {
			continue;
		}
		next.ground[i] = target;
		sheets[i] = to.sheet === next.tilesetId ? null : to.sheet;
	}
	next.groundSheet = compactGroundSheet(sheets);
	return next;
}

/** Replace every furniture piece matching `from` with the `to` sprite. */
export function recolorFurniture(
	draft: RoomDraft,
	from: { frame: number; sheet: string },
	to: { frame: number; sheet: string }
): RoomDraft {
	const next = cloneDraft(draft);
	next.furniture = next.furniture.map((prop) => {
		if (prop.frame !== from.frame || furnitureSheetOf(prop) !== from.sheet) return prop;
		const replaced: FurnitureProp = {
			frame: to.frame,
			tx: prop.tx,
			ty: prop.ty,
			solid: prop.solid,
			...(prop.interactableId ? { interactableId: prop.interactableId } : {}),
			...(to.sheet !== 'furniture' ? { sheet: to.sheet } : {})
		};
		return replaced;
	});
	return next;
}

type RepeatableRole = 'desk' | 'fridge' | 'client-wait';

const REPEATABLE_ROLES: readonly RepeatableRole[] = ['desk', 'fridge', 'client-wait'];

function fallbackBeside(draft: RoomDraft, tx: number, ty: number): TileMarker {
	const fallback = { tx: Math.min(tx + 1, draft.width - 2), ty };
	return fallback.tx === tx && fallback.ty === ty ? { tx: Math.max(tx - 1, 1), ty } : fallback;
}

function extrasOf(draft: RoomDraft, role: RepeatableRole): TileMarker[] {
	if (role === 'desk') return [...(draft.desks ?? [])];
	if (role === 'fridge') return [...(draft.fridgeAnchors ?? [])];
	return [...(draft.clientWaits ?? [])];
}

function setExtras(draft: RoomDraft, role: RepeatableRole, extras: TileMarker[]): void {
	const compact = cloneMarkerList(extras);
	if (role === 'desk') {
		draft.desks = compact;
	} else if (role === 'fridge') {
		draft.fridgeAnchors = compact;
	} else {
		draft.clientWaits = compact;
	}
}

function primaryOf(draft: RoomDraft, role: RepeatableRole): TileMarker {
	if (role === 'desk') return draft.desk;
	if (role === 'fridge') return draft.fridgeAnchor;
	return draft.clientWait;
}

function setPrimary(draft: RoomDraft, role: RepeatableRole, marker: TileMarker): void {
	if (role === 'desk') draft.desk = cloneMarker(marker);
	else if (role === 'fridge') draft.fridgeAnchor = cloneMarker(marker);
	else draft.clientWait = cloneMarker(marker);
}

function hasRepeatableAt(draft: RoomDraft, role: RepeatableRole, cell: TileMarker): boolean {
	return (
		markersEqual(primaryOf(draft, role), cell) ||
		extrasOf(draft, role).some((marker) => markersEqual(marker, cell))
	);
}

function removeRepeatableAt(
	draft: RoomDraft,
	role: RepeatableRole,
	cell: TileMarker,
	fallback: TileMarker
): void {
	if (markersEqual(primaryOf(draft, role), cell)) {
		const extras = extrasOf(draft, role);
		if (extras.length > 0) {
			setPrimary(draft, role, extras[0]!);
			setExtras(draft, role, extras.slice(1));
		} else {
			setPrimary(draft, role, fallback);
		}
		return;
	}
	setExtras(
		draft,
		role,
		extrasOf(draft, role).filter((marker) => !markersEqual(marker, cell))
	);
}

function addRepeatableAt(draft: RoomDraft, role: RepeatableRole, cell: TileMarker): void {
	if (hasRepeatableAt(draft, role, cell)) return;
	setExtras(draft, role, [...extrasOf(draft, role), cloneMarker(cell)]);
}

function displaceIfSame(current: TileMarker, from: TileMarker, fallback: TileMarker): TileMarker {
	if (markersEqual(current, from)) return fallback;
	return current;
}

function tagFurniture(
	draft: RoomDraft,
	tx: number,
	ty: number,
	frame: number,
	sheet: string,
	interactableId: FurnitureProp['interactableId']
): void {
	setFurniture(draft, tx, ty, frame, sheet);
	const prop = furnitureAt(draft, tx, ty);
	if (prop && interactableId) prop.interactableId = interactableId;
	draft.collision[idx(draft.width, tx, ty)] = 1;
}

function withoutInteractable(prop: FurnitureProp): FurnitureProp {
	return {
		frame: prop.frame,
		tx: prop.tx,
		ty: prop.ty,
		solid: prop.solid,
		...(prop.sheet ? { sheet: prop.sheet } : {})
	};
}

function stripInteractable(
	draft: RoomDraft,
	id: NonNullable<FurnitureProp['interactableId']>
): void {
	draft.furniture = draft.furniture.map((prop) =>
		prop.interactableId === id ? withoutInteractable(prop) : prop
	);
}

function stampStorageFurniture(draft: RoomDraft, cell: TileMarker): void {
	const prev = draft.furniture.find((prop) => prop.interactableId === 'storage');
	if (prev && (prev.tx !== cell.tx || prev.ty !== cell.ty)) {
		setFurniture(draft, prev.tx, prev.ty, null);
	}
	stripInteractable(draft, 'storage');
	const def = storageForVenue(venueIdForRoomId(draft.id));
	tagFurniture(draft, cell.tx, cell.ty, def.frame, storagePropSheet(def.sheet), 'storage');
	draft.storageAnchor = cloneMarker(cell);
}

function stampToolkitFurniture(draft: RoomDraft, cell: TileMarker): void {
	stripInteractable(draft, 'toolkit-shelf');
	const existing = furnitureAt(draft, cell.tx, cell.ty);
	tagFurniture(
		draft,
		cell.tx,
		cell.ty,
		existing?.frame ?? INDOOR.counterL,
		existing?.sheet ?? SHEET.indoorProps,
		'toolkit-shelf'
	);
}

function clearCellMarkers(
	draft: RoomDraft,
	cell: TileMarker,
	fallback: TileMarker,
	keepStorage = false
): void {
	draft.door = displaceIfSame(draft.door, cell, fallback);
	draft.playerSpawn = displaceIfSame(draft.playerSpawn, cell, fallback);
	if (!keepStorage && draft.storageAnchor && markersEqual(draft.storageAnchor, cell)) {
		stampStorageFurniture(draft, displaceIfSame(draft.storageAnchor, cell, fallback));
	}
	for (const role of REPEATABLE_ROLES) {
		if (hasRepeatableAt(draft, role, cell)) {
			removeRepeatableAt(draft, role, cell, fallback);
		}
	}
	const furniture = furnitureAt(draft, cell.tx, cell.ty);
	if (furniture?.interactableId === 'toolkit-shelf') {
		draft.furniture = draft.furniture.map((prop) =>
			prop.tx === cell.tx && prop.ty === cell.ty ? withoutInteractable(prop) : prop
		);
	}
}

/**
 * Door, player-spawn, storage, and toolkit stay unique. Desk, fridge, and
 * client-wait can occupy many tiles.
 */
function assignRole(draft: RoomDraft, tx: number, ty: number, role: TileRole): void {
	const here = { tx, ty };
	const fallback = fallbackBeside(draft, tx, ty);
	if (role === 'none') {
		clearCellMarkers(draft, here, fallback);
		return;
	}
	if (role === 'door' || role === 'player-spawn') {
		clearCellMarkers(draft, here, fallback);
		if (role === 'door') draft.door = here;
		else draft.playerSpawn = here;
		return;
	}
	if (role === 'storage') {
		clearCellMarkers(draft, here, fallback, true);
		stampStorageFurniture(draft, here);
		return;
	}
	if (role === 'toolkit') {
		clearCellMarkers(draft, here, fallback);
		stampToolkitFurniture(draft, here);
		return;
	}
	if (hasRepeatableAt(draft, role, here)) return;
	clearCellMarkers(draft, here, fallback);
	addRepeatableAt(draft, role, here);
}

function setFurniture(
	draft: RoomDraft,
	tx: number,
	ty: number,
	frame: number | null,
	sheet?: string,
	interactableId?: FurnitureProp['interactableId']
): void {
	const existing = furnitureAt(draft, tx, ty);
	const rest = draft.furniture.filter((prop) => !(prop.tx === tx && prop.ty === ty));
	if (frame === null) {
		draft.furniture = rest;
		return;
	}
	const nextId = interactableId ?? existing?.interactableId;
	const next: FurnitureProp = {
		frame,
		tx,
		ty,
		solid: true,
		...(nextId ? { interactableId: nextId } : {}),
		...(sheet && sheet !== 'furniture' ? { sheet } : {})
	};
	draft.furniture = [...rest, next];
}

/** Returns a new draft. Unknown coordinates are a no-op. */
export function applyTileEdit(draft: RoomDraft, tx: number, ty: number, edit: TileEdit): RoomDraft {
	if (!inBounds(draft, tx, ty)) return cloneDraft(draft);
	const next = cloneDraft(draft);
	const i = idx(next.width, tx, ty);
	if (edit.ground !== undefined) {
		const sheetId =
			edit.groundSheet && isTilesetId(edit.groundSheet) ? edit.groundSheet : next.tilesetId;
		const tileset = getTileset(sheetId);
		const max = tileset.columns * tileset.rows;
		next.ground[i] = ((edit.ground % max) + max) % max;
		const sheets = cloneGroundSheet(next);
		sheets[i] = sheetId === next.tilesetId ? null : sheetId;
		next.groundSheet = compactGroundSheet(sheets);
	}
	if (edit.walkable !== undefined) {
		next.collision[i] = edit.walkable ? 0 : 1;
		if (edit.ground === undefined) {
			const tileset = getTileset(next.tilesetId);
			next.ground[i] = edit.walkable ? tileset.defaultFloor : tileset.defaultWall;
			const sheets = cloneGroundSheet(next);
			sheets[i] = null;
			next.groundSheet = compactGroundSheet(sheets);
		}
	}
	if (edit.furnitureFrame !== undefined) {
		setFurniture(next, tx, ty, edit.furnitureFrame, edit.furnitureSheet);
	}
	if (edit.role !== undefined) {
		assignRole(next, tx, ty, edit.role);
		if (edit.role === 'fridge') {
			next.collision[i] = 1;
			setFurniture(next, tx, ty, INDOOR.cabinet, SHEET.indoorProps, 'fridge');
		}
	}
	return next;
}

/** Swap the atlas and remap every cell to that pack's default floor/wall. */
export function switchTileset(draft: RoomDraft, tilesetId: TilesetId): RoomDraft {
	const next = cloneDraft(draft);
	next.tilesetId = tilesetId;
	const tileset = TILESETS[tilesetId];
	for (let i = 0; i < next.ground.length; i++) {
		next.ground[i] = next.collision[i] === 1 ? tileset.defaultWall : tileset.defaultFloor;
	}
	delete next.groundSheet;
	return next;
}

/**
 * Old studio-editor saves replace the whole furniture list. Storage was added after
 * those drafts, so inject the authored crate/archive/vault (and its marker) when missing.
 */
export function ensureStorageOnDraft(authored: RoomDef, draft: RoomDraft): RoomDraft {
	const next = cloneDraft(draft);
	const hasStorage = next.furniture.some((prop) => prop.interactableId === 'storage');
	if (!hasStorage) {
		const authoredStorage = authored.furniture.filter((prop) => prop.interactableId === 'storage');
		if (authoredStorage.length > 0) {
			const occupied = new Set(authoredStorage.map((prop) => `${prop.tx},${prop.ty}`));
			next.furniture = [
				...next.furniture.filter((prop) => !occupied.has(`${prop.tx},${prop.ty}`)),
				...cloneFurniture(authoredStorage)
			];
			for (const prop of authoredStorage) {
				next.collision[idx(next.width, prop.tx, prop.ty)] = 1;
			}
		}
	}
	if (!next.storageAnchor) {
		const tagged = next.furniture.find((prop) => prop.interactableId === 'storage');
		next.storageAnchor = cloneMarker(
			tagged ? { tx: tagged.tx, ty: tagged.ty } : authored.storageAnchor
		);
	}
	return next;
}

export function mergeDraftOntoRoom(authored: RoomDef, draft: RoomDraft): RoomDef {
	if (
		draft.id !== authored.id ||
		draft.width !== authored.width ||
		draft.height !== authored.height
	) {
		return authored;
	}
	if (
		draft.ground.length !== authored.ground.length ||
		draft.collision.length !== authored.collision.length
	) {
		return authored;
	}
	const withStorage = ensureStorageOnDraft(authored, draft);
	return {
		...authored,
		tilesetId: withStorage.tilesetId,
		collision: [...withStorage.collision],
		ground: [...withStorage.ground],
		...(withStorage.groundSheet?.some((sheet) => sheet)
			? {
					groundSheets: withStorage.groundSheet.map((sheet) => sheet ?? undefined)
				}
			: {}),
		door: cloneMarker(withStorage.door),
		clientWait: cloneMarker(withStorage.clientWait),
		desk: cloneMarker(withStorage.desk),
		playerSpawn: cloneMarker(withStorage.playerSpawn),
		fridgeAnchor: cloneMarker(withStorage.fridgeAnchor),
		storageAnchor: cloneMarker(withStorage.storageAnchor ?? authored.storageAnchor),
		desks: cloneMarkerList(withStorage.desks),
		fridgeAnchors: cloneMarkerList(withStorage.fridgeAnchors),
		clientWaits: cloneMarkerList(withStorage.clientWaits),
		furniture: cloneFurniture(withStorage.furniture)
	};
}

export function authoredDraft(room: RoomDef): RoomDraft {
	return roomToDraft(room, isTilesetId(room.tilesetId) ? room.tilesetId : 'tiny-dungeon');
}
