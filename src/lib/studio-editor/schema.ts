import { z } from 'zod';
import type { FurnitureProp, RoomDef, RoomId, TileMarker } from '$lib/studio/rooms';
import {
	PEOPLE_SHEET_IDS,
	TILESET_IDS,
	isPersonSlotId,
	type PeopleSheetId,
	type PersonSlotId,
	type TilesetId
} from './catalog';

/** v2 drops pre-Pokémon-wall drafts that still boxed the room perimeter. */
export const STUDIO_EDITOR_STORAGE_KEY = 'adt.studio-editor.v2';

const tileMarkerSchema = z.object({
	tx: z.number().int().nonnegative(),
	ty: z.number().int().nonnegative()
});

const furniturePropSchema = z.object({
	frame: z.number().int().min(0),
	tx: z.number().int().nonnegative(),
	ty: z.number().int().nonnegative(),
	solid: z.boolean(),
	interactableId: z.enum(['fridge', 'toolkit-shelf']).optional(),
	sheet: z.string().min(1).optional()
});

const roomIdSchema = z.enum(['home-kitchen', 'art-room', 'studio', 'gallery', 'mega-museum']);

/**
 * Editable slice of a RoomDef. Width/height stay locked to the authored plan so
 * pathfinding, zones, and easel slots remain valid.
 */
export const roomDraftSchema = z.object({
	id: roomIdSchema,
	tilesetId: z.enum(TILESET_IDS),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	collision: z.array(z.number().int().min(0).max(1)),
	ground: z.array(z.number().int().nonnegative()),
	/** Per-cell tileset id; `null` means the room `tilesetId`. */
	groundSheet: z.array(z.string().min(1).nullable()).optional(),
	door: tileMarkerSchema,
	clientWait: tileMarkerSchema,
	desk: tileMarkerSchema,
	playerSpawn: tileMarkerSchema,
	fridgeAnchor: tileMarkerSchema,
	desks: z.array(tileMarkerSchema).optional(),
	fridgeAnchors: z.array(tileMarkerSchema).optional(),
	clientWaits: z.array(tileMarkerSchema).optional(),
	furniture: z.array(furniturePropSchema)
});

export type RoomDraft = z.infer<typeof roomDraftSchema>;

export const personLookSchema = z.object({
	sheetId: z.enum(PEOPLE_SHEET_IDS),
	frame: z.number().int().nonnegative(),
	tint: z.number().int().min(0).max(0xffffff).nullable()
});

export type PersonLook = z.infer<typeof personLookSchema>;

export const studioEditorStateSchema = z.object({
	version: z.literal(1),
	/** String keys so a partial save (one room, one person) stays valid. */
	rooms: z.record(z.string(), roomDraftSchema).default({}),
	people: z.record(z.string(), personLookSchema).default({})
});

export type StudioEditorState = z.infer<typeof studioEditorStateSchema>;

export function emptyStudioEditorState(): StudioEditorState {
	return { version: 1, rooms: {}, people: {} };
}

export function parseStudioEditorState(raw: unknown): StudioEditorState | null {
	const result = studioEditorStateSchema.safeParse(raw);
	if (!result.success) return null;
	const rooms: StudioEditorState['rooms'] = {};
	for (const [id, draft] of Object.entries(result.data.rooms)) {
		if (isRoomId(id) && draft.id === id) {
			rooms[id] = draft;
		}
	}
	const people: StudioEditorState['people'] = {};
	for (const [id, look] of Object.entries(result.data.people)) {
		if (isPersonSlotId(id)) {
			people[id] = look;
		}
	}
	return { version: 1, rooms, people };
}

export function isRoomId(value: string): value is RoomId {
	return roomIdSchema.safeParse(value).success;
}

export function cloneMarker(marker: TileMarker): TileMarker {
	return { tx: marker.tx, ty: marker.ty };
}

export function cloneMarkerList(
	markers: readonly TileMarker[] | undefined
): TileMarker[] | undefined {
	if (!markers?.length) return undefined;
	return markers.map(cloneMarker);
}

export function cloneFurniture(props: readonly FurnitureProp[]): FurnitureProp[] {
	return props.map((prop) => ({
		frame: prop.frame,
		tx: prop.tx,
		ty: prop.ty,
		solid: prop.solid,
		...(prop.interactableId ? { interactableId: prop.interactableId } : {}),
		...(prop.sheet ? { sheet: prop.sheet } : {})
	}));
}

export function roomToDraft(room: RoomDef, tilesetId: TilesetId = 'tiny-dungeon'): RoomDraft {
	return {
		id: room.id,
		tilesetId,
		width: room.width,
		height: room.height,
		collision: [...room.collision],
		ground: [...room.ground],
		...(room.groundSheets ? { groundSheet: room.groundSheets.map((sheet) => sheet ?? null) } : {}),
		door: cloneMarker(room.door),
		clientWait: cloneMarker(room.clientWait),
		desk: cloneMarker(room.desk),
		playerSpawn: cloneMarker(room.playerSpawn),
		fridgeAnchor: cloneMarker(room.fridgeAnchor),
		...(cloneMarkerList(room.desks) ? { desks: cloneMarkerList(room.desks) } : {}),
		...(cloneMarkerList(room.fridgeAnchors)
			? { fridgeAnchors: cloneMarkerList(room.fridgeAnchors) }
			: {}),
		...(cloneMarkerList(room.clientWaits)
			? { clientWaits: cloneMarkerList(room.clientWaits) }
			: {}),
		furniture: cloneFurniture(room.furniture)
	};
}

export type { PeopleSheetId, PersonSlotId, TilesetId };
