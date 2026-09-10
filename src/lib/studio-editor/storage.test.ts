import { afterEach, describe, expect, it } from 'vitest';
import { ROOMS } from '$lib/studio/rooms';
import { authoredDraft } from './draft';
import {
	STUDIO_EDITOR_STORAGE_KEY,
	STUDIO_EDITOR_V1_STORAGE_KEY,
	emptyStudioEditorState,
	parseStudioEditorState
} from './schema';
import {
	clearStudioEditorState,
	loadStudioEditorState,
	resetPersonLook,
	savePersonLook,
	saveRoomDraft
} from './storage';

function memoryStorage() {
	const data = new Map<string, string>();
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		}
	};
}

describe('studio-editor storage', () => {
	afterEach(() => {
		clearStudioEditorState();
	});

	it('round-trips a room draft and a person look', () => {
		const storage = memoryStorage();
		Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

		const draft = authoredDraft(ROOMS['home-kitchen']);
		draft.ground[8] = 48;
		saveRoomDraft('home-kitchen', draft);
		savePersonLook('player', { sheetId: 'tiny-creatures', frame: 3, tint: 0xffc9a8 });

		const loaded = loadStudioEditorState();
		expect(loaded.rooms['home-kitchen']?.ground[8]).toBe(48);
		expect(loaded.people.player).toEqual({
			sheetId: 'tiny-creatures',
			frame: 3,
			tint: 0xffc9a8
		});

		resetPersonLook('player');
		expect(loadStudioEditorState().people.player).toBeUndefined();
		expect(storage.getItem(STUDIO_EDITOR_STORAGE_KEY)).toContain('home-kitchen');
	});

	it('ignores malformed JSON instead of throwing', () => {
		const storage = memoryStorage();
		storage.setItem(STUDIO_EDITOR_STORAGE_KEY, '{not json');
		Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
		expect(loadStudioEditorState()).toEqual(emptyStudioEditorState());
		expect(parseStudioEditorState({ version: 2 })).toBeNull();
		expect(parseStudioEditorState({ version: 1, rooms: { nope: {} } })).toBeNull();
	});

	it('prefers a non-empty v2 blob over a different v1 look', () => {
		const storage = memoryStorage();
		Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
		storage.setItem(
			STUDIO_EDITOR_V1_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				rooms: {},
				people: { player: { sheetId: 'mum', frame: 3, tint: null } }
			})
		);
		storage.setItem(
			STUDIO_EDITOR_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				rooms: {},
				people: { player: { sheetId: 'mum', frame: 7, tint: null } }
			})
		);
		expect(loadStudioEditorState().people.player?.frame).toBe(7);
	});

	it('copies a v1 people look into v2 when v2 is missing', () => {
		const storage = memoryStorage();
		Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
		storage.setItem(
			STUDIO_EDITOR_V1_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				rooms: {},
				people: { player: { sheetId: 'mum', frame: 3, tint: null } }
			})
		);
		const loaded = loadStudioEditorState();
		expect(loaded.people.player?.frame).toBe(3);
		expect(storage.getItem(STUDIO_EDITOR_STORAGE_KEY)).toContain('"frame":3');
		expect(storage.getItem(STUDIO_EDITOR_V1_STORAGE_KEY)).not.toBeNull();
	});

	it('restores a v1 room when v2 is an empty object', () => {
		const storage = memoryStorage();
		Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
		const draft = authoredDraft(ROOMS['home-kitchen']);
		draft.ground[8] = 48;
		storage.setItem(
			STUDIO_EDITOR_STORAGE_KEY,
			JSON.stringify({ version: 1, rooms: {}, people: {} })
		);
		storage.setItem(
			STUDIO_EDITOR_V1_STORAGE_KEY,
			JSON.stringify({ version: 1, rooms: { 'home-kitchen': draft }, people: {} })
		);
		const loaded = loadStudioEditorState();
		expect(loaded.rooms['home-kitchen']?.ground[8]).toBe(48);
		expect(storage.getItem(STUDIO_EDITOR_STORAGE_KEY)).toContain('home-kitchen');
	});

	it('returns empty state when v1 is malformed', () => {
		const storage = memoryStorage();
		Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
		storage.setItem(STUDIO_EDITOR_V1_STORAGE_KEY, 'nope');
		expect(loadStudioEditorState()).toEqual(emptyStudioEditorState());
	});
});
