import {
	emptyStudioEditorState,
	parseStudioEditorState,
	STUDIO_EDITOR_STORAGE_KEY,
	type PersonLook,
	type RoomDraft,
	type StudioEditorState
} from './schema';
import type { PersonSlotId, RoomId } from './catalog';

function getStorage(): Storage | null {
	try {
		if (typeof globalThis.localStorage === 'undefined') return null;
		return globalThis.localStorage;
	} catch {
		return null;
	}
}

function readRaw(): string | null {
	const storage = getStorage();
	if (!storage) return null;
	try {
		return storage.getItem(STUDIO_EDITOR_STORAGE_KEY);
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

/** Restores editor drafts. Malformed blobs are ignored, never thrown. */
export function loadStudioEditorState(): StudioEditorState {
	const raw = readRaw();
	if (raw === null) return emptyStudioEditorState();
	try {
		const parsed: unknown = JSON.parse(raw);
		return parseStudioEditorState(parsed) ?? emptyStudioEditorState();
	} catch {
		return emptyStudioEditorState();
	}
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
