import Phaser from 'phaser';
import { publicUrl } from '$lib/publicUrl';

function studioAsset(path: string): string {
	return publicUrl(`/studio/${path}`);
}

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

		this.load.image('walls-floors', studioAsset('tiles/walls-floors.png'));
		this.load.image('tiny-town', studioAsset('tiles/tiny-town.png'));
		this.load.image('tiny-battle', studioAsset('tiles/tiny-battle.png'));
		this.load.image('home-interior', studioAsset('tiles/home-interior.png'));
		this.load.image('home-indoor', studioAsset('tiles/home-indoor.png'));
		this.load.spritesheet('furniture', studioAsset('tiles/furniture.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('player', studioAsset('characters/player.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('clients', studioAsset('characters/clients.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('mum', studioAsset('characters/mum.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('staff', studioAsset('characters/staff.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('tiny-dungeon-folk', studioAsset('tiles/walls-floors.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('tiny-town-folk', studioAsset('tiles/tiny-town.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('tiny-battle-units', studioAsset('tiles/tiny-battle.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('tiny-creatures', studioAsset('characters/tiny-creatures.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('home-interior-props', studioAsset('tiles/home-interior.png'), {
			frameWidth: 16,
			frameHeight: 16
		});
		this.load.spritesheet('home-indoor-props', studioAsset('tiles/home-indoor.png'), {
			frameWidth: 16,
			frameHeight: 16,
			spacing: 1
		});
		this.load.image('prompt-e', studioAsset('ui/prompt-e.png'));
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
