import { describe, expect, it } from 'vitest';
import { ROOMS } from '$lib/studio/rooms';
import { INDOOR, INTERIOR, DUNGEON, SHEET } from '$lib/studio/roomTiles';
import {
	applyTileEdit,
	authoredDraft,
	furnitureAt,
	listFloorKinds,
	listFurnitureKinds,
	listWallKinds,
	mergeDraftOntoRoom,
	recolorFloors,
	recolorFurniture,
	recolorWalls,
	roleAt,
	switchTileset
} from './draft';

describe('studio-editor drafts', () => {
	it('paints ground, collision, furniture, and extra desks without moving the first', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		expect(roleAt(kitchen, kitchen.door.tx, kitchen.door.ty)).toBe('door');

		const painted = applyTileEdit(kitchen, 2, 2, {
			ground: INTERIOR.woodFloor,
			groundSheet: SHEET.interior,
			walkable: false,
			furnitureFrame: INDOOR.stool,
			furnitureSheet: SHEET.indoorProps,
			role: 'desk'
		});

		expect(painted.ground[2 * painted.width + 2]).toBe(INTERIOR.woodFloor);
		expect(painted.collision[2 * painted.width + 2]).toBe(1);
		expect(furnitureAt(painted, 2, 2)?.frame).toBe(INDOOR.stool);
		expect(painted.desk).toEqual(kitchen.desk);
		expect(painted.desks).toEqual([{ tx: 2, ty: 2 }]);
		expect(roleAt(painted, 2, 2)).toBe('desk');
		expect(roleAt(painted, kitchen.desk.tx, kitchen.desk.ty)).toBe('desk');
		expect(kitchen.desk).toEqual(ROOMS['home-kitchen'].desk);
	});

	it('adds extra fridges and waits; None removes extras or promotes the next', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const authoredExtras = [
			{ tx: 0, ty: 2 },
			{ tx: 0, ty: 3 }
		];
		expect(kitchen.fridgeAnchors).toEqual(authoredExtras);

		const withFridge = applyTileEdit(kitchen, 4, 4, { role: 'fridge' });
		expect(withFridge.fridgeAnchor).toEqual(kitchen.fridgeAnchor);
		expect(withFridge.fridgeAnchors).toEqual([...authoredExtras, { tx: 4, ty: 4 }]);
		expect(roleAt(withFridge, 4, 4)).toBe('fridge');
		expect(withFridge.collision[4 * withFridge.width + 4]).toBe(1);
		expect(furnitureAt(withFridge, 4, 4)).toMatchObject({
			frame: INDOOR.cabinet,
			sheet: SHEET.indoorProps,
			solid: true,
			interactableId: 'fridge'
		});
		expect(roleAt(withFridge, kitchen.fridgeAnchor.tx, kitchen.fridgeAnchor.ty)).toBe('fridge');

		const clearedExtra = applyTileEdit(withFridge, 4, 4, { role: 'none' });
		expect(clearedExtra.fridgeAnchor).toEqual(kitchen.fridgeAnchor);
		expect(clearedExtra.fridgeAnchors).toEqual(authoredExtras);
		expect(roleAt(clearedExtra, 4, 4)).toBe('none');

		const promoted = applyTileEdit(withFridge, kitchen.fridgeAnchor.tx, kitchen.fridgeAnchor.ty, {
			role: 'none'
		});
		expect(promoted.fridgeAnchor).toEqual({ tx: 0, ty: 2 });
		expect(promoted.fridgeAnchors).toEqual([
			{ tx: 0, ty: 3 },
			{ tx: 4, ty: 4 }
		]);
		expect(roleAt(promoted, 0, 2)).toBe('fridge');
		expect(roleAt(promoted, kitchen.fridgeAnchor.tx, kitchen.fridgeAnchor.ty)).toBe('none');

		const withWait = applyTileEdit(kitchen, 4, 2, { role: 'client-wait' });
		expect(withWait.clientWait).toEqual(kitchen.clientWait);
		expect(withWait.clientWaits).toEqual([{ tx: 4, ty: 2 }]);
		expect(roleAt(withWait, 4, 2)).toBe('client-wait');
	});

	it('still relocates unique door and player-spawn markers', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const moved = applyTileEdit(kitchen, 2, 2, { role: 'door' });
		expect(moved.door).toEqual({ tx: 2, ty: 2 });
		expect(roleAt(moved, kitchen.door.tx, kitchen.door.ty)).toBe('none');
		expect(roleAt(moved, 2, 2)).toBe('door');

		const spawn = applyTileEdit(kitchen, 3, 1, { role: 'player-spawn' });
		expect(spawn.playerSpawn).toEqual({ tx: 3, ty: 1 });
		expect(roleAt(spawn, kitchen.playerSpawn.tx, kitchen.playerSpawn.ty)).toBe('none');
	});

	it('marks authored storage and relocates it uniquely with the venue sprite', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		expect(kitchen.storageAnchor).toEqual({ tx: 3, ty: 5 });
		expect(roleAt(kitchen, 3, 5)).toBe('storage');
		expect(furnitureAt(kitchen, 3, 5)?.interactableId).toBe('storage');

		const moved = applyTileEdit(kitchen, 4, 5, { role: 'storage' });
		expect(moved.storageAnchor).toEqual({ tx: 4, ty: 5 });
		expect(roleAt(moved, 4, 5)).toBe('storage');
		expect(furnitureAt(moved, 4, 5)?.interactableId).toBe('storage');
		expect(roleAt(moved, 3, 5)).toBe('none');
		expect(furnitureAt(moved, 3, 5)?.interactableId).not.toBe('storage');
	});

	it('marks the garage toolkit shelf from its furniture tag', () => {
		const garage = authoredDraft(ROOMS['art-room']);
		expect(roleAt(garage, 3, 5)).toBe('toolkit');
		expect(furnitureAt(garage, 3, 5)?.interactableId).toBe('toolkit-shelf');
	});

	it('clears furniture with null and ignores out-of-bounds edits', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const withBarrel = applyTileEdit(kitchen, 4, 4, { furnitureFrame: 1 });
		expect(furnitureAt(withBarrel, 4, 4)?.frame).toBe(1);
		const cleared = applyTileEdit(withBarrel, 4, 4, { furnitureFrame: null });
		expect(furnitureAt(cleared, 4, 4)).toBeUndefined();
		expect(applyTileEdit(kitchen, 99, 99, { ground: 1 })).toEqual(kitchen);
	});

	it('switches tilesets onto default floor/wall indices', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const town = switchTileset(kitchen, 'tiny-town');
		expect(town.tilesetId).toBe('tiny-town');
		const i = kitchen.door.ty * kitchen.width + kitchen.door.tx;
		expect(town.collision[i]).toBe(0);
		expect(town.ground[i]).toBe(0);
		const wallIndex = 0;
		expect(town.collision[wallIndex]).toBe(1);
		expect(town.ground[wallIndex]).toBe(96);
	});

	it('lists wall kinds separately from furniture solids', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		expect(listWallKinds(kitchen)).toEqual([
			{ ground: DUNGEON.wall, sheet: SHEET.dungeon, count: 10 }
		]);
		expect(listFloorKinds(kitchen).some((kind) => kind.ground === INTERIOR.woodFloor)).toBe(true);
		expect(listFurnitureKinds(kitchen).some((kind) => kind.frame === INDOOR.cabinet)).toBe(true);
		expect(listFurnitureKinds(kitchen)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ frame: INDOOR.counterL, sheet: SHEET.indoorProps }),
				expect.objectContaining({ frame: INDOOR.cabinet, sheet: SHEET.indoorProps, count: 3 }),
				expect.objectContaining({ frame: INDOOR.sink, sheet: SHEET.indoorProps }),
				expect.objectContaining({ frame: 193, sheet: SHEET.interiorProps, count: 1 })
			])
		);
	});

	it('recolors every matching wall without touching furniture cells', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const fridgeGround = kitchen.ground[1 * kitchen.width + 2];
		const painted = recolorWalls(
			kitchen,
			{ ground: DUNGEON.wall, sheet: SHEET.dungeon },
			{ ground: 14, sheet: SHEET.dungeon }
		);
		expect(listWallKinds(painted)).toEqual([{ ground: 14, sheet: SHEET.dungeon, count: 10 }]);
		expect(painted.ground[1 * painted.width + 2]).toBe(fridgeGround);
		expect(kitchen.ground[0]).toBe(DUNGEON.wall);
	});

	it('recolors every matching floor and can pull from another tileset', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const deskGround = kitchen.ground[3 * kitchen.width + 3];
		const painted = recolorFloors(
			kitchen,
			{ ground: INTERIOR.woodFloor, sheet: SHEET.interior },
			{ ground: INTERIOR.carpetBlue, sheet: SHEET.interior }
		);
		expect(listFloorKinds(painted).some((kind) => kind.ground === INTERIOR.carpetBlue)).toBe(true);
		expect(painted.ground[3 * painted.width + 3]).toBe(INTERIOR.carpetBlue);
		expect(deskGround).toBe(INTERIOR.woodFloor);
	});

	it('recolors every matching furniture sprite and keeps interactable ids', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const swapped = recolorFurniture(
			kitchen,
			{ frame: INDOOR.cabinet, sheet: SHEET.indoorProps },
			{ frame: INDOOR.sink, sheet: SHEET.indoorProps }
		);
		expect(furnitureAt(swapped, 1, 2)).toMatchObject({
			frame: INDOOR.sink,
			sheet: SHEET.indoorProps,
			interactableId: 'fridge'
		});
		expect(furnitureAt(swapped, 1, 2)?.frame).toBe(INDOOR.sink);
		expect(furnitureAt(swapped, 1, 2)?.sheet).toBe(SHEET.indoorProps);
	});

	it('restores missing storage furniture when merging an old kitchen draft', () => {
		const authored = ROOMS['home-kitchen'];
		const draft = authoredDraft(authored);
		draft.furniture = draft.furniture.filter((prop) => prop.interactableId !== 'storage');
		delete draft.storageAnchor;
		const merged = mergeDraftOntoRoom(authored, draft);
		expect(merged.furniture.find((prop) => prop.interactableId === 'fridge')).toBeDefined();
		expect(merged.furniture.find((prop) => prop.interactableId === 'storage')).toEqual(
			expect.objectContaining({ tx: 3, ty: 5 })
		);
		expect(merged.storageAnchor).toEqual({ tx: 3, ty: 5 });
	});
});
