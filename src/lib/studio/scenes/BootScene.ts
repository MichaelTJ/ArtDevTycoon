import Phaser from 'phaser';

/** Loads studio atlases then starts StudioScene. */
export class BootScene extends Phaser.Scene {
	#loadFailed = false;

	constructor() {
		super('BootScene');
	}

	preload(): void {
		this.load.on('loaderror', (file: Phaser.Loader.File) => {
			// Optional character sheets may 404 — ignore so Boot still reaches StudioScene.
			if (file.key === 'mum' || file.key === 'staff') {
				return;
			}
			this.#loadFailed = true;
		});

		this.load.image('walls-floors', '/studio/tiles/walls-floors.png');
		this.load.image('tiny-town', '/studio/tiles/tiny-town.png');
		this.load.image('tiny-battle', '/studio/tiles/tiny-battle.png');
		this.load.image('home-interior', '/studio/tiles/home-interior.png');
		this.load.image('home-indoor', '/studio/tiles/home-indoor.png');
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
		this.load.spritesheet('mum', '/studio/characters/mum.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('staff', '/studio/characters/staff.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('tiny-dungeon-folk', '/studio/tiles/walls-floors.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('tiny-town-folk', '/studio/tiles/tiny-town.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('tiny-battle-units', '/studio/tiles/tiny-battle.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('tiny-creatures', '/studio/characters/tiny-creatures.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('home-interior-props', '/studio/tiles/home-interior.png', {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('home-indoor-props', '/studio/tiles/home-indoor.png', {
			frameWidth: 16,
			frameHeight: 16,
			spacing: 1
		});
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
