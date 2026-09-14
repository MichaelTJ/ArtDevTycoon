import type { PersonLook, RoomDraft } from '$lib/studio-editor/schema';
import type { PersonSlotId } from '$lib/studio-editor/catalog';
import type { RoomDef, RoomId } from './rooms';

/**
 * Playtest layouts copied from Edge localStorage (`adt.studio-editor.v2`,
 * plus `studio` from v1). `/studio-editor` only writes the browser; GitHub Pages
 * never saw those drafts. These are now the authored defaults.
 */
export const BAKED_ROOM_DRAFTS: Partial<Record<RoomId, RoomDraft>> = {
	'home-kitchen': {
		id: 'home-kitchen',
		tilesetId: 'tiny-dungeon',
		width: 6,
		height: 6,
		collision: [
			1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			0, 0, 1, 0, 0
		],
		ground: [
			40, 40, 148, 40, 40, 40, 40, 40, 148, 40, 40, 40, 386, 148, 148, 148, 148, 169, 412, 148, 148,
			148, 148, 148, 148, 148, 148, 148, 55, 148, 148, 148, 148, 443, 148, 148
		],
		groundSheet: [
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			'home-indoor',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-indoor',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-indoor',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-indoor',
			'home-interior',
			'home-interior'
		],
		door: {
			tx: 2,
			ty: 0
		},
		clientWait: {
			tx: 2,
			ty: 2
		},
		desk: {
			tx: 3,
			ty: 4
		},
		playerSpawn: {
			tx: 1,
			ty: 4
		},
		fridgeAnchor: {
			tx: 1,
			ty: 2
		},
		storageAnchor: {
			tx: 3,
			ty: 5
		},
		fridgeAnchors: [
			{
				tx: 0,
				ty: 2
			},
			{
				tx: 0,
				ty: 3
			}
		],
		furniture: [
			{
				frame: 364,
				tx: 1,
				ty: 2,
				solid: true,
				interactableId: 'fridge',
				sheet: 'home-indoor-props'
			},
			{
				frame: 338,
				tx: 3,
				ty: 2,
				solid: false,
				sheet: 'home-indoor-props'
			},
			{
				frame: 372,
				tx: 4,
				ty: 2,
				solid: false,
				sheet: 'home-indoor-props'
			},
			{
				frame: 56,
				tx: 3,
				ty: 4,
				solid: true,
				sheet: 'home-indoor-props'
			},
			{
				frame: 193,
				tx: 3,
				ty: 5,
				solid: true,
				interactableId: 'storage',
				sheet: 'home-interior-props'
			}
		]
	},
	'art-room': {
		id: 'art-room',
		tilesetId: 'tiny-dungeon',
		width: 12,
		height: 10,
		collision: [
			1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
		],
		ground: [
			40, 40, 40, 40, 40, 153, 40, 40, 40, 357, 40, 40, 40, 40, 40, 40, 40, 153, 40, 40, 40, 40, 40,
			40, 63, 63, 63, 153, 153, 153, 153, 63, 63, 63, 153, 153, 153, 153, 153, 153, 153, 153, 153,
			153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153,
			153, 148, 153, 5, 153, 153, 153, 153, 187, 187, 153, 153, 153, 153, 153, 31, 107, 153, 153,
			153, 153, 153, 153, 153, 153, 153, 153, 57, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153,
			153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153, 153,
			153
		],
		groundSheet: [
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			'home-indoor',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-indoor',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-indoor',
			'home-indoor',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-indoor',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior'
		],
		door: {
			tx: 5,
			ty: 0
		},
		clientWait: {
			tx: 2,
			ty: 3
		},
		desk: {
			tx: 5,
			ty: 6
		},
		playerSpawn: {
			tx: 2,
			ty: 7
		},
		fridgeAnchor: {
			tx: 2,
			ty: 2
		},
		fridgeAnchors: [
			{
				tx: 8,
				ty: 2
			},
			{
				tx: 7,
				ty: 2
			},
			{
				tx: 9,
				ty: 2
			},
			{
				tx: 0,
				ty: 2
			},
			{
				tx: 1,
				ty: 2
			}
		],
		furniture: [
			{
				frame: 338,
				tx: 3,
				ty: 5,
				solid: true,
				interactableId: 'toolkit-shelf',
				sheet: 'home-indoor-props'
			}
		]
	},
	studio: {
		id: 'studio',
		tilesetId: 'home-indoor',
		width: 18,
		height: 12,
		collision: [
			1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
			0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
			0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
			0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0,
			0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
			0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
		],
		ground: [
			152, 164, 164, 164, 452, 164, 164, 164, 164, 164, 164, 164, 164, 164, 164, 164, 164, 431, 164,
			452, 452, 452, 452, 452, 452, 452, 452, 164, 452, 452, 452, 452, 452, 452, 452, 164, 164, 452,
			452, 452, 452, 452, 452, 452, 452, 164, 452, 452, 452, 452, 452, 452, 452, 164, 164, 452, 452,
			452, 452, 452, 452, 452, 452, 164, 452, 452, 452, 452, 452, 452, 452, 164, 164, 452, 452, 452,
			452, 452, 452, 452, 452, 164, 452, 452, 452, 452, 22, 452, 452, 164, 164, 452, 452, 452, 452,
			452, 452, 452, 452, 452, 452, 452, 452, 452, 452, 452, 452, 164, 164, 452, 452, 452, 22, 452,
			452, 452, 452, 164, 452, 452, 452, 452, 452, 452, 452, 164, 164, 452, 452, 452, 452, 452, 452,
			452, 452, 164, 452, 452, 452, 452, 452, 452, 452, 164, 164, 452, 452, 452, 452, 452, 452, 452,
			452, 164, 452, 452, 452, 452, 452, 452, 452, 164, 164, 452, 452, 452, 452, 452, 452, 452, 452,
			164, 452, 452, 452, 452, 452, 452, 452, 164, 164, 452, 452, 452, 452, 452, 452, 452, 452, 164,
			452, 452, 452, 452, 452, 452, 452, 164, 164, 164, 164, 164, 164, 164, 164, 164, 164, 164, 164,
			164, 164, 164, 164, 164, 164, 164
		],
		groundSheet: [
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			null,
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior',
			'home-interior'
		],
		door: {
			tx: 4,
			ty: 0
		},
		clientWait: {
			tx: 4,
			ty: 2
		},
		desk: {
			tx: 5,
			ty: 6
		},
		playerSpawn: {
			tx: 2,
			ty: 9
		},
		fridgeAnchor: {
			tx: 2,
			ty: 2
		},
		furniture: [
			{
				frame: 0,
				tx: 4,
				ty: 6,
				solid: true
			},
			{
				frame: 4,
				tx: 14,
				ty: 4,
				solid: true
			},
			{
				frame: 1,
				tx: 12,
				ty: 8,
				solid: true
			},
			{
				frame: 2,
				tx: 2,
				ty: 3,
				solid: true
			}
		]
	}
};

export const BAKED_PERSON_LOOKS: Partial<Record<PersonSlotId, PersonLook>> = {
	mum: {
		sheetId: 'tiny-dungeon-folk',
		frame: 99,
		tint: null
	},
	'walk-in': {
		sheetId: 'tiny-dungeon-folk',
		frame: 87,
		tint: null
	},
	corporate: {
		sheetId: 'tiny-dungeon-folk',
		frame: 96,
		tint: 8035524
	},
	billionaire: {
		sheetId: 'tiny-creatures',
		frame: 9,
		tint: 11832575
	},
	'auction-house': {
		sheetId: 'tiny-dungeon-folk',
		frame: 100,
		tint: 12875896
	},
	apprentice: {
		sheetId: 'tiny-dungeon-folk',
		frame: 112,
		tint: 11064575
	},
	'marketing-director': {
		sheetId: 'tiny-dungeon-folk',
		frame: 84,
		tint: 16766120
	},
	curator: {
		sheetId: 'tiny-creatures',
		frame: 37,
		tint: 13943976
	}
};

function compactSheets(
	sheets: readonly (string | null)[] | undefined
): readonly (string | undefined)[] | undefined {
	if (!sheets?.some((sheet) => sheet)) return undefined;
	return sheets.map((sheet) => sheet ?? undefined);
}

/** Overlay a baked editor draft onto an authored room (zones/residents stay). */
export function overlayBakedLayout(authored: RoomDef, draft: RoomDraft): RoomDef {
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
	const storageFurniture = authored.furniture.filter((prop) => prop.interactableId === 'storage');
	const hasStorage = draft.furniture.some((prop) => prop.interactableId === 'storage');
	const furniture = hasStorage ? [...draft.furniture] : [...draft.furniture, ...storageFurniture];
	return {
		...authored,
		tilesetId: draft.tilesetId,
		collision: [...draft.collision],
		ground: [...draft.ground],
		groundSheets: compactSheets(draft.groundSheet),
		door: { ...draft.door },
		clientWait: { ...draft.clientWait },
		desk: { ...draft.desk },
		playerSpawn: { ...draft.playerSpawn },
		fridgeAnchor: { ...draft.fridgeAnchor },
		storageAnchor: draft.storageAnchor ? { ...draft.storageAnchor } : { ...authored.storageAnchor },
		desks: draft.desks?.map((marker) => ({ ...marker })),
		fridgeAnchors: draft.fridgeAnchors?.map((marker) => ({ ...marker })),
		clientWaits: draft.clientWaits?.map((marker) => ({ ...marker })),
		furniture
	};
}

export function bakeAuthoredRoom(authored: RoomDef): RoomDef {
	const draft = BAKED_ROOM_DRAFTS[authored.id];
	return draft ? overlayBakedLayout(authored, draft) : authored;
}
