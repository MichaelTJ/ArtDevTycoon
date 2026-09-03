import { afterEach, describe, expect, it } from 'vitest';
import { ROOMS } from '$lib/studio/rooms';
import { authoredDraft } from './draft';
import {
	STUDIO_EDITOR_STORAGE_KEY,
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
});
