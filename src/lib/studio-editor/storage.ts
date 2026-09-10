import {
	emptyStudioEditorState,
	parseStudioEditorState,
	STUDIO_EDITOR_STORAGE_KEY,
	STUDIO_EDITOR_V1_STORAGE_KEY,
	type PersonLook,
	type RoomDraft,
	type StudioEditorState
} from './schema';
import type { PersonSlotId } from './catalog';
import type { RoomId } from '$lib/studio/rooms';

function getStorage(): Storage | null {
	try {
		if (typeof globalThis.localStorage === 'undefined') return null;
		return globalThis.localStorage;
	} catch {
		return null;
	}
}

function readRaw(key: string): string | null {
	const storage = getStorage();
	if (!storage) return null;
	try {
		return storage.getItem(key);
	} catch {
		return null;
	}
}

function writeRaw(value: string): void {
	const storage = getStorage();
	if (!storage) return;
	try {
		storage.setItem(STUDIO_EDITOR_STORAGE_KEY, value);
	} catch {
		// Quota / private mode — same swallow as save.ts.
	}
}

function parseStored(raw: string | null): StudioEditorState | null {
	if (raw === null) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		return parseStudioEditorState(parsed);
	} catch {
		return null;
	}
}

function hasAnyDrafts(state: StudioEditorState): boolean {
	return Object.keys(state.rooms).length > 0 || Object.keys(state.people).length > 0;
}

/**
 * Restores editor drafts. Prefers a non-empty v2 blob; otherwise copies a
 * non-empty v1 blob into v2. Malformed blobs are ignored, never thrown.
 * v1 is left in place.
 */
export function loadStudioEditorState(): StudioEditorState {
	const v2 = parseStored(readRaw(STUDIO_EDITOR_STORAGE_KEY));
	if (v2 && hasAnyDrafts(v2)) return v2;

	const v1 = parseStored(readRaw(STUDIO_EDITOR_V1_STORAGE_KEY));
	if (v1 && hasAnyDrafts(v1)) {
		persistStudioEditorState(v1);
		return v1;
	}

	return emptyStudioEditorState();
}

export function persistStudioEditorState(state: StudioEditorState): void {
	writeRaw(JSON.stringify(state));
}

export function clearStudioEditorState(): void {
	const storage = getStorage();
	if (!storage) return;
	try {
		storage.removeItem(STUDIO_EDITOR_STORAGE_KEY);
	} catch {
		// ignore
	}
}

export function saveRoomDraft(roomId: RoomId, draft: RoomDraft): StudioEditorState {
	const state = loadStudioEditorState();
	const next: StudioEditorState = {
		...state,
		rooms: { ...state.rooms, [roomId]: draft }
	};
	persistStudioEditorState(next);
	return next;
}

export function savePersonLook(slotId: PersonSlotId, look: PersonLook): StudioEditorState {
	const state = loadStudioEditorState();
	const next: StudioEditorState = {
		...state,
		people: { ...state.people, [slotId]: look }
	};
	persistStudioEditorState(next);
	return next;
}

export function resetRoomDraft(roomId: RoomId): StudioEditorState {
	const state = loadStudioEditorState();
	const rooms = { ...state.rooms };
	delete rooms[roomId];
	const next: StudioEditorState = { ...state, rooms };
	persistStudioEditorState(next);
	return next;
}

export function resetPersonLook(slotId: PersonSlotId): StudioEditorState {
	const state = loadStudioEditorState();
	const people = { ...state.people };
	delete people[slotId];
	const next: StudioEditorState = { ...state, people };
	persistStudioEditorState(next);
	return next;
}
