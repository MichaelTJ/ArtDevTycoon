import { describe, expect, it } from 'vitest';
import { ROOMS } from '$lib/studio/rooms';
import { INDOOR, INTERIOR, SHEET } from '$lib/studio/roomTiles';
import {
	applyTileEdit,
	authoredDraft,
	furnitureAt,
	listFloorKinds,
	listFurnitureKinds,
	listWallKinds,
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
		const withFridge = applyTileEdit(kitchen, 4, 4, { role: 'fridge' });
		expect(withFridge.fridgeAnchor).toEqual(kitchen.fridgeAnchor);
		expect(withFridge.fridgeAnchors).toEqual([{ tx: 4, ty: 4 }]);
		expect(roleAt(withFridge, 4, 4)).toBe('fridge');
		expect(roleAt(withFridge, kitchen.fridgeAnchor.tx, kitchen.fridgeAnchor.ty)).toBe('fridge');

		const clearedExtra = applyTileEdit(withFridge, 4, 4, { role: 'none' });
		expect(clearedExtra.fridgeAnchor).toEqual(kitchen.fridgeAnchor);
		expect(clearedExtra.fridgeAnchors).toBeUndefined();
		expect(roleAt(clearedExtra, 4, 4)).toBe('none');

		const promoted = applyTileEdit(withFridge, kitchen.fridgeAnchor.tx, kitchen.fridgeAnchor.ty, {
			role: 'none'
		});
		expect(promoted.fridgeAnchor).toEqual({ tx: 4, ty: 4 });
		expect(promoted.fridgeAnchors).toBeUndefined();
		expect(roleAt(promoted, 4, 4)).toBe('fridge');
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
			{ ground: INTERIOR.wallPerimeter, sheet: SHEET.interior, count: 19 }
		]);
		expect(listFloorKinds(kitchen)).toEqual([
			{ ground: INDOOR.floor, sheet: SHEET.indoor, count: 16 }
		]);
		expect(listFurnitureKinds(kitchen)).toEqual([
			{ frame: INDOOR.counterL, sheet: SHEET.indoorProps, count: 1 },
			{ frame: INDOOR.cabinet, sheet: SHEET.indoorProps, count: 1 },
			{ frame: INDOOR.sink, sheet: SHEET.indoorProps, count: 1 }
		]);
	});

	it('recolors every matching wall without touching furniture cells', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const fridgeGround = kitchen.ground[1 * kitchen.width + 1];
		const painted = recolorWalls(
			kitchen,
			{ ground: INTERIOR.wallPerimeter, sheet: SHEET.interior },
			{ ground: INTERIOR.wall, sheet: SHEET.interior }
		);
		expect(listWallKinds(painted)).toEqual([
			{ ground: INTERIOR.wall, sheet: SHEET.interior, count: 19 }
		]);
		expect(painted.ground[1 * painted.width + 1]).toBe(fridgeGround);
		expect(kitchen.ground[0]).toBe(INTERIOR.wallPerimeter);
	});

	it('recolors every matching floor and can pull from another tileset', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const deskGround = kitchen.ground[3 * kitchen.width + 3];
		const painted = recolorFloors(
			kitchen,
			{ ground: INDOOR.floor, sheet: SHEET.indoor },
			{ ground: INTERIOR.carpetBlue, sheet: SHEET.interior }
		);
		expect(listFloorKinds(painted)).toEqual([
			{ ground: INTERIOR.carpetBlue, sheet: SHEET.interior, count: 16 }
		]);
		expect(painted.ground[3 * painted.width + 3]).toBe(INTERIOR.carpetBlue);
		expect(deskGround).toBe(INDOOR.floor);
	});

	it('recolors every matching furniture sprite and keeps interactable ids', () => {
		const kitchen = authoredDraft(ROOMS['home-kitchen']);
		const swapped = recolorFurniture(
			kitchen,
			{ frame: INDOOR.cabinet, sheet: SHEET.indoorProps },
			{ frame: INDOOR.sink, sheet: SHEET.indoorProps }
		);
		expect(furnitureAt(swapped, 1, 1)).toMatchObject({
			frame: INDOOR.sink,
			sheet: SHEET.indoorProps,
			interactableId: 'fridge'
		});
		expect(furnitureAt(swapped, 1, 1)?.frame).toBe(INDOOR.sink);
		expect(furnitureAt(swapped, 1, 1)?.sheet).toBe(SHEET.indoorProps);
	});
});
