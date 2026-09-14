import { BAKED_PERSON_LOOKS } from '$lib/studio/bakedEditorLayouts';
import { stampKitchenFridgeProps, type RoomDef } from '$lib/studio/rooms';
import { getPeopleSheet, sheetTileCount, type PersonSlotId } from './catalog';
import { authoredDraft, ensureStorageOnDraft, mergeDraftOntoRoom } from './draft';
import type { PersonLook } from './schema';
import { loadStudioEditorState } from './storage';

const DEFAULT_LOOKS: Record<PersonSlotId, PersonLook> = {
	player: { sheetId: 'player', frame: 0, tint: null },
	mum: { sheetId: 'mum', frame: 0, tint: null },
	'walk-in': { sheetId: 'clients', frame: 0, tint: null },
	corporate: { sheetId: 'clients', frame: 0, tint: 0x7a9cc4 },
	billionaire: { sheetId: 'clients', frame: 0, tint: 0xb48cff },
	'auction-house': { sheetId: 'clients', frame: 0, tint: 0xc47878 },
	apprentice: { sheetId: 'staff', frame: 1, tint: 0xa8d4ff },
	'marketing-director': { sheetId: 'staff', frame: 1, tint: 0xffd4a8 },
	curator: { sheetId: 'staff', frame: 0, tint: 0xd4c4a8 },
	...BAKED_PERSON_LOOKS
};

const CLIENT_TIER_SLOTS: Record<string, PersonSlotId> = {
	'walk-in': 'walk-in',
	corporate: 'corporate',
	billionaire: 'billionaire',
	'auction-house': 'auction-house'
};

const STAFF_SLOTS: Record<string, PersonSlotId> = {
	apprentice: 'apprentice',
	'marketing-director': 'marketing-director',
	curator: 'curator'
};

export function defaultPersonLook(slotId: PersonSlotId): PersonLook {
	return { ...DEFAULT_LOOKS[slotId] };
}

export function clampPersonLook(look: PersonLook): PersonLook {
	const sheet = getPeopleSheet(look.sheetId);
	const count = sheetTileCount(sheet);
	const frame = look.frame % count;
	return { sheetId: look.sheetId, frame: frame < 0 ? frame + count : frame, tint: look.tint };
}

export function resolvePersonLook(
	slotId: PersonSlotId,
	state = loadStudioEditorState()
): PersonLook {
	const override = state.people[slotId];
	return clampPersonLook(override ?? defaultPersonLook(slotId));
}

export function resolveRoomForPlay(authored: RoomDef, state = loadStudioEditorState()): RoomDef {
	const draft = state.rooms[authored.id];
	const merged = draft ? mergeDraftOntoRoom(authored, draft) : authored;
	return stampKitchenFridgeProps(merged);
}

export function overlayClientLook(
	tier: string,
	_base: { frame: number; tint: number | null; spriteKey?: string },
	state = loadStudioEditorState()
): { frame: number; tint: number | null; spriteKey?: string } {
	const slot = CLIENT_TIER_SLOTS[tier] ?? 'walk-in';
	const look = resolvePersonLook(slot, state);
	return { frame: look.frame, tint: look.tint, spriteKey: look.sheetId };
}

export function overlayStaffLook(
	roleId: string,
	base: { frame: number; tint: number },
	state = loadStudioEditorState()
): { frame: number; tint: number; spriteKey?: string } {
	const slot = STAFF_SLOTS[roleId];
	if (!slot) return base;
	const look = resolvePersonLook(slot, state);
	return {
		frame: look.frame,
		tint: look.tint ?? base.tint,
		spriteKey: look.sheetId
	};
}

/** Convenience for the editor UI — authored room plus any stored draft. */
export function resolveRoomDraft(authored: RoomDef, state = loadStudioEditorState()) {
	const draft = state.rooms[authored.id] ?? authoredDraft(authored);
	return ensureStorageOnDraft(authored, draft);
}
