import Phaser from 'phaser';

/** Loads studio atlases then starts StudioScene. */
export class BootScene extends Phaser.Scene {
	#loadFailed = false;

	constructor() {
		super('BootScene');
	}

	preload(): void {
		this.load.on('loaderror', () => {
			this.#loadFailed = true;
		});

		this.load.image('walls-floors', '/studio/tiles/walls-floors.png');
		this.load.spritesheet('furniture', '/studio/tiles/furniture.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('player', '/studio/characters/player.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('clients', '/studio/characters/clients.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		// Optional `mum.png` is not shipped yet — StudioScene tints `clients` frame 0.
		this.load.image('prompt-e', '/studio/ui/prompt-e.png');
	}

	create(): void {
		// On asset failure, flag the registry and skip StudioScene. StudioFloor polls
		// `studioBootFailed` so the error UI appears without a new bridge event type.
		if (this.#loadFailed) {
			this.game.registry.set('studioBootFailed', true);
			return;
		}
		this.scene.start('StudioScene');
	}
}
