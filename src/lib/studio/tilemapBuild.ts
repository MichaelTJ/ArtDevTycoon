import { getTileset } from '$lib/studio-editor/catalog';
import type { RoomDef } from './rooms';

/** Phaser 2D-array empty GID when `insertNull` is on — letterbox black, no collision. */
export const TILEMAP_EMPTY = 0;

export interface GroundOverlay {
	x: number;
	y: number;
	key: string;
	frame: number;
}

/**
 * Primary-tileset GIDs plus off-sheet overlays.
 * Walkable overlays use an empty underlay so cottage "outer box" tiles never sit
 * in the colliding layer. Overlay floors (and furniture cells) meet letterbox
 * black; Pokémon north-band bricks stay native on the primary dungeon sheet.
 */
export function buildGroundTilemap(
	room: Pick<RoomDef, 'width' | 'height' | 'ground' | 'collision' | 'groundSheets' | 'tilesetId'>
): { data: number[][]; overlays: GroundOverlay[] } {
	const spec = getTileset(room.tilesetId ?? 'tiny-dungeon');
	const data: number[][] = [];
	const overlays: GroundOverlay[] = [];
	for (let y = 0; y < room.height; y++) {
		const row: number[] = [];
		for (let x = 0; x < room.width; x++) {
			const i = y * room.width + x;
			const sheetId = room.groundSheets?.[i];
			const usesOverlay = !!sheetId && sheetId !== spec.id;
			if (usesOverlay) {
				row.push(TILEMAP_EMPTY);
				const overlaySpec = getTileset(sheetId);
				overlays.push({
					x,
					y,
					key: overlaySpec.framePhaserKey,
					frame: room.ground[i] ?? 0
				});
			} else {
				row.push(room.ground[i] ?? TILEMAP_EMPTY);
			}
		}
		data.push(row);
	}
	return { data, overlays };
}
