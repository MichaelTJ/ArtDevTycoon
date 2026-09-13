import { describe, expect, it } from 'vitest';
import { ROOMS } from '$lib/studio/rooms';
import {
	defaultPersonLook,
	overlayClientLook,
	overlayStaffLook,
	resolvePersonLook,
	resolveRoomForPlay
} from './apply';
import { authoredDraft } from './draft';
import { emptyStudioEditorState, type StudioEditorState } from './schema';

describe('studio-editor apply', () => {
	it('leaves authored rooms and looks untouched without drafts', () => {
		const kitchen = ROOMS['home-kitchen'];
		expect(resolveRoomForPlay(kitchen, emptyStudioEditorState())).toBe(kitchen);
		expect(resolvePersonLook('player', emptyStudioEditorState())).toEqual(
			defaultPersonLook('player')
		);
		expect(
			overlayClientLook('corporate', { frame: 0, tint: 0x7a9cc4 }, emptyStudioEditorState())
		).toEqual({ frame: 0, tint: 0x7a9cc4 });
		expect(
			overlayStaffLook('apprentice', { frame: 1, tint: 0xa8d4ff }, emptyStudioEditorState())
		).toEqual({ frame: 1, tint: 0xa8d4ff });
	});

	it('merges a stored room draft and clamps people frames', () => {
		const authored = ROOMS['art-room'];
		const draft = authoredDraft(authored);
		draft.tilesetId = 'tiny-town';
		draft.ground[20] = 4;
		const state: StudioEditorState = {
			version: 1,
			rooms: { 'art-room': draft },
			people: {
				player: { sheetId: 'player', frame: 99, tint: null },
				corporate: { sheetId: 'tiny-creatures', frame: 2, tint: 0xb48cff }
			}
		};

		const merged = resolveRoomForPlay(authored, state);
		expect(merged).not.toBe(authored);
		expect(merged.tilesetId).toBe('tiny-town');
		expect(merged.ground[20]).toBe(4);
		expect(merged.zones).toEqual(authored.zones);

		expect(resolvePersonLook('player', state).frame).toBe(99 % 9);
		expect(overlayClientLook('corporate', { frame: 0, tint: 0x7a9cc4 }, state)).toEqual({
			frame: 2,
			tint: 0xb48cff,
			spriteKey: 'tiny-creatures'
		});
	});

	it('stamps interactable cabinets onto kitchen fridge markers missing furniture', () => {
		const authored = ROOMS['home-kitchen'];
		const draft = authoredDraft(authored);
		draft.furniture = draft.furniture.filter(
			(prop) => !(prop.tx === 0 && (prop.ty === 2 || prop.ty === 3))
		);
		const state: StudioEditorState = {
			version: 1,
			rooms: { 'home-kitchen': draft },
			people: {}
		};
		const merged = resolveRoomForPlay(authored, state);
		const fridges = merged.furniture.filter((prop) => prop.interactableId === 'fridge');
		expect(fridges).toHaveLength(3);
		expect(fridges.some((prop) => prop.tx === 0 && prop.ty === 2)).toBe(true);
		expect(fridges.some((prop) => prop.tx === 0 && prop.ty === 3)).toBe(true);
	});

	it('injects authored storage into a pre-spec-34 kitchen draft', () => {
		const authored = ROOMS['home-kitchen'];
		const draft = authoredDraft(authored);
		draft.furniture = draft.furniture.filter((prop) => prop.interactableId !== 'storage');
		delete draft.storageAnchor;
		const merged = resolveRoomForPlay(authored, {
			version: 1,
			rooms: { 'home-kitchen': draft },
			people: {}
		});
		expect(merged.furniture.find((prop) => prop.interactableId === 'storage')).toEqual(
			expect.objectContaining({ tx: 5, ty: 4, interactableId: 'storage' })
		);
		expect(merged.storageAnchor).toEqual({ tx: 5, ty: 4 });
		expect(merged.collision[4 * merged.width + 5]).toBe(1);
	});
});
