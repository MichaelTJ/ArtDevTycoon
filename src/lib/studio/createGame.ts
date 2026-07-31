import Phaser from 'phaser';
import type { StudioBridge } from './bridge';
import { TILE_SIZE } from './config';
import { BootScene } from './scenes/BootScene';
import { StudioScene } from './scenes/StudioScene';
import { getRoomForVenue } from './venueRooms';

export interface CreatePhaserGameOptions {
	initialVenueId?: string;
}

/**
 * Boots a Phaser game into `parent`. Caller must destroy it on Svelte teardown.
 */
export function createPhaserGame(
	parent: HTMLElement,
	bridge: StudioBridge,
	options: CreatePhaserGameOptions = {}
): Phaser.Game {
	const initialVenueId = options.initialVenueId ?? 'fridge';
	const room = getRoomForVenue(initialVenueId);
	const width = room.width * TILE_SIZE;
	const height = room.height * TILE_SIZE;

	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent,
		width,
		height,
		backgroundColor: '#1c1917',
		pixelArt: true,
		physics: {
			default: 'arcade',
			arcade: {
				gravity: { x: 0, y: 0 },
				debug: false
			}
		},
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH
		},
		scene: [BootScene, StudioScene],
		callbacks: {
			preBoot: (g) => {
				g.registry.set('bridge', bridge);
				g.registry.set('initialVenueId', initialVenueId);
			}
		}
	});

	return game;
}
