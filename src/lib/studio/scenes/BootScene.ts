import Phaser from 'phaser';

/** Loads studio atlases then starts StudioScene. */
export class BootScene extends Phaser.Scene {
	constructor() {
		super('BootScene');
	}

	preload(): void {
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
		this.scene.start('StudioScene');
	}
}
