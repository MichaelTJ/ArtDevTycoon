import Phaser from 'phaser';
import type { StudioBridge, StudioInboundCommand, StudioSnapshot } from '../bridge';
import {
	CLIENT_SPEED,
	INTERACT_KEYS,
	INTERACT_RANGE_PX,
	PLAYER_SPEED,
	TILE_SIZE,
	TILESET_MARGIN,
	TILESET_SPACING
} from '../config';
import { slotsForVenue, type EaselSlot } from '../easelLayout';
import { nextWanderTarget, stepToward, type WanderState } from '../npcWander';
import type { ResidentNpcDef, RoomDef, RoomZone } from '../rooms';
import { getRoomForVenue } from '../venueRooms';
import { DEFAULT_WORK_ESTIMATE_MS, workBarProgress } from '../workProgress';

/** Warm tint so Mum reads apart from door visitors when using the clients sheet. */
const MUM_TINT = 0xffc9a8;

interface EaselView {
	slot: EaselSlot;
	stand: Phaser.GameObjects.Image;
	art: Phaser.GameObjects.Image | null;
	entryId: string | null;
}

/**
 * Walkable studio floor. Reads GameStore only through StudioBridge snapshots/commands.
 */
export class StudioScene extends Phaser.Scene {
	#bridge!: StudioBridge;
	#room!: RoomDef;
	#builtVenueId = 'fridge';
	#player!: Phaser.Physics.Arcade.Sprite;
	#cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	#wasd!: {
		W: Phaser.Input.Keyboard.Key;
		A: Phaser.Input.Keyboard.Key;
		S: Phaser.Input.Keyboard.Key;
		D: Phaser.Input.Keyboard.Key;
	};
	#interactKey!: Phaser.Input.Keyboard.Key;
	/** Door visitor only — never Mum. */
	#client: Phaser.Physics.Arcade.Sprite | null = null;
	#clientArrived = false;
	#mum: Phaser.Physics.Arcade.Sprite | null = null;
	#mumDef: ResidentNpcDef | null = null;
	#mumWander: WanderState | null = null;
	#mumPauseUntil = 0;
	#prompt!: Phaser.GameObjects.Image;
	#snapshot: StudioSnapshot | null = null;
	#easels: EaselView[] = [];
	#furnitureGroup!: Phaser.Physics.Arcade.StaticGroup;
	#groundLayer: Phaser.Tilemaps.TilemapLayer | null = null;
	#tilemap: Phaser.Tilemaps.Tilemap | null = null;
	#touchVector = { x: 0, y: 0 };
	#touchInteract = false;
	#working = false;
	#workBarBg!: Phaser.GameObjects.Rectangle;
	#workBarFill!: Phaser.GameObjects.Rectangle;
	#touchPadBuilt = false;

	constructor() {
		super('StudioScene');
	}

	create(): void {
		this.#bridge = this.game.registry.get('bridge') as StudioBridge;
		const initialVenueId =
			(this.game.registry.get('initialVenueId') as string | undefined) ?? 'fridge';
		this.#builtVenueId = initialVenueId;
		this.#room = getRoomForVenue(initialVenueId);

		this.#createAnimations();
		this.#buildFloor();
		this.#setupInput();
		this.#setupTouchPad();
		this.#prompt = this.add.image(0, 0, 'prompt-e').setDepth(20).setVisible(false);
		this.#createWorkBar();

		this.#bridge.setCommandHandler((cmd) => this.#onCommand(cmd));
		this.#bridge.emit({ type: 'ready' });

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.#bridge.setCommandHandler(null);
		});
	}

	update(_time: number, delta: number): void {
		if (!this.#player?.body) return;

		const phase = this.#snapshot?.phase ?? 'idle';
		this.#working = phase === 'generating' || phase === 'critiquing';

		if (this.#working) {
			this.#snapPlayerToDesk();
			this.#player.setVelocity(0, 0);
			if (this.#player.anims.currentAnim?.key !== 'player-work') {
				this.#player.anims.play('player-work', true);
			}
		} else {
			this.#drivePlayer();
		}

		this.#updateMumWander(delta / 1000);
		this.#updateWorkBar();
		this.#updateInteractPrompt();
		if (!this.#working && this.#consumeInteract()) {
			this.#tryInteract();
		}
	}

	#buildFloor(): void {
		this.#resizeToRoom();
		this.#buildTilemap();
		this.#placeFurniture();
		this.#spawnPlayer();
		this.#spawnResidents();
		this.#rebuildEasels();
	}

	#teardownFloor(keepMum: boolean): void {
		for (const view of this.#easels) {
			view.stand.destroy();
			view.art?.destroy();
		}
		this.#easels = [];

		if (this.#client) {
			this.#client.destroy();
			this.#client = null;
			this.#clientArrived = false;
		}

		if (!keepMum && this.#mum) {
			this.#mum.destroy();
			this.#mum = null;
			this.#mumDef = null;
			this.#mumWander = null;
		}

		this.#furnitureGroup?.clear(true, true);
		this.#groundLayer?.destroy();
		this.#groundLayer = null;
		this.#tilemap?.destroy();
		this.#tilemap = null;

		if (this.#player) {
			this.#player.destroy();
		}
	}

	#rebuildForVenue(venueId: string): void {
		const next = getRoomForVenue(venueId);
		const keepMum =
			Boolean(this.#mum) && next.residents.some((r) => r.clientName === 'Mum');
		this.#teardownFloor(keepMum);
		this.#room = next;
		this.#builtVenueId = venueId;
		this.#resizeToRoom();
		this.#buildTilemap();
		this.#placeFurniture();
		this.#spawnPlayer();
		if (keepMum && this.#mum && this.#mumDef) {
			const spawn = this.#mumDef.spawn;
			this.#mum.setPosition(
				spawn.tx * TILE_SIZE + TILE_SIZE / 2,
				spawn.ty * TILE_SIZE + TILE_SIZE / 2
			);
		} else {
			this.#spawnResidents();
		}
		this.#rebuildEasels();
	}

	#resizeToRoom(): void {
		const w = this.#room.width * TILE_SIZE;
		const h = this.#room.height * TILE_SIZE;
		this.scale.resize(w, h);
		this.physics.world.setBounds(0, 0, w, h);
		this.cameras.main.setBounds(0, 0, w, h);
	}

	#createWorkBar(): void {
		const width = 20;
		const height = 3;
		this.#workBarBg = this.add
			.rectangle(0, 0, width, height, 0x1c1917, 0.85)
			.setDepth(25)
			.setVisible(false);
		this.#workBarFill = this.add
			.rectangle(0, 0, width, height, 0xf59e0b, 1)
			.setOrigin(0, 0.5)
			.setDepth(26)
			.setVisible(false);
	}

	#updateWorkBar(): void {
		if (!this.#working) {
			this.#workBarBg.setVisible(false);
			this.#workBarFill.setVisible(false);
			return;
		}

		const started = this.#snapshot?.workStartedAt;
		const estimate = this.#snapshot?.estimatedWorkMs ?? DEFAULT_WORK_ESTIMATE_MS;
		const elapsed = started != null ? Date.now() - started : 0;
		const fill = workBarProgress(elapsed, estimate, false);
		const barW = 20;
		const x = this.#player.x;
		const y = this.#player.y - 14;

		this.#workBarBg.setPosition(x, y).setVisible(true);
		this.#workBarFill
			.setPosition(x - barW / 2, y)
			.setDisplaySize(Math.max(1, barW * fill), 3)
			.setVisible(true);
	}

	#createAnimations(): void {
		if (this.anims.exists('player-idle')) return;

		this.anims.create({
			key: 'player-idle',
			frames: [{ key: 'player', frame: 0 }],
			frameRate: 1
		});
		this.anims.create({
			key: 'player-walk',
			frames: this.anims.generateFrameNumbers('player', { start: 1, end: 4 }),
			frameRate: 8,
			repeat: -1
		});
		this.anims.create({
			key: 'player-work',
			frames: this.anims.generateFrameNumbers('player', { start: 5, end: 8 }),
			frameRate: 6,
			repeat: -1
		});
		this.anims.create({
			key: 'client-idle',
			frames: [{ key: 'clients', frame: 0 }],
			frameRate: 1
		});
		this.anims.create({
			key: 'client-walk',
			frames: [
				{ key: 'clients', frame: 0 },
				{ key: 'clients', frame: 1 }
			],
			frameRate: 6,
			repeat: -1
		});
	}

	#buildTilemap(): void {
		const { width, height, ground, collision } = this.#room;
		const data: number[][] = [];
		for (let y = 0; y < height; y++) {
			const row: number[] = [];
			for (let x = 0; x < width; x++) {
				row.push(ground[y * width + x] ?? 0);
			}
			data.push(row);
		}

		const map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
		const tileset = map.addTilesetImage(
			'walls-floors',
			'walls-floors',
			TILE_SIZE,
			TILE_SIZE,
			TILESET_MARGIN,
			TILESET_SPACING
		);
		if (!tileset) return;

		const layer = map.createLayer(0, tileset, 0, 0);
		if (!layer) return;

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				if (collision[y * width + x] === 1) {
					layer.getTileAt(x, y)?.setCollision(true);
				}
			}
		}

		this.#tilemap = map;
		this.#groundLayer = layer;
		this.cameras.main.setZoom(2);
		this.registry.set('groundLayer', layer);
	}

	#placeFurniture(): void {
		this.#furnitureGroup = this.physics.add.staticGroup();
		for (const prop of this.#room.furniture) {
			const sprite = this.#furnitureGroup.create(
				prop.tx * TILE_SIZE + TILE_SIZE / 2,
				prop.ty * TILE_SIZE + TILE_SIZE / 2,
				'furniture',
				prop.frame
			) as Phaser.Physics.Arcade.Sprite;
			sprite.setDepth(5);
			if (!prop.solid) {
				sprite.disableBody(true, false);
			}
		}
	}

	#spawnPlayer(): void {
		const { playerSpawn } = this.#room;
		this.#player = this.physics.add.sprite(
			playerSpawn.tx * TILE_SIZE + TILE_SIZE / 2,
			playerSpawn.ty * TILE_SIZE + TILE_SIZE / 2,
			'player',
			0
		);
		this.#player.setDepth(10);
		this.#player.setCollideWorldBounds(true);
		this.#player.body?.setSize(10, 10);
		this.#player.body?.setOffset(3, 4);

		if (this.#groundLayer) {
			this.physics.add.collider(this.#player, this.#groundLayer);
		}
		this.physics.add.collider(this.#player, this.#furnitureGroup);
		this.cameras.main.startFollow(this.#player, true, 0.12, 0.12);
		this.#player.anims.play('player-idle');
	}

	#spawnResidents(): void {
		const mum = this.#room.residents.find((r) => r.clientName === 'Mum');
		if (!mum) {
			if (this.#mum) {
				this.#mum.destroy();
				this.#mum = null;
			}
			this.#mumDef = null;
			this.#mumWander = null;
			return;
		}
		if (this.#mum) return;

		this.#mumDef = mum;
		const useMumSheet = this.textures.exists('mum');
		const key = useMumSheet ? 'mum' : 'clients';
		this.#mum = this.physics.add.sprite(
			mum.spawn.tx * TILE_SIZE + TILE_SIZE / 2,
			mum.spawn.ty * TILE_SIZE + TILE_SIZE / 2,
			key,
			mum.frame
		);
		this.#mum.setDepth(10);
		if (!useMumSheet) {
			this.#mum.setTint(MUM_TINT);
		}
		this.#mumWander = { waypointIndex: 0, target: mum.patrol[0]! };
		this.#mumPauseUntil = 0;
		this.#mum.anims.play('client-idle', true);
	}

	#mumIsCommissionTarget(): boolean {
		const snap = this.#snapshot;
		if (!this.#mum || !snap) return false;
		if (snap.residentClientArmed && snap.phase === 'idle') return true;
		if (snap.client?.clientName === 'Mum') return true;
		return false;
	}

	#updateMumWander(dtSec: number): void {
		if (!this.#mum || !this.#mumDef || !this.#mumWander) return;

		if (this.#mumIsCommissionTarget()) {
			this.#mum.setVelocity(0, 0);
			this.#mum.anims.play('client-idle', true);
			return;
		}

		const now = this.time.now;
		if (now < this.#mumPauseUntil) {
			this.#mum.setVelocity(0, 0);
			this.#mum.anims.play('client-idle', true);
			return;
		}

		const prevX = this.#mum.x;
		const step = stepToward(
			prevX,
			this.#mum.y,
			this.#mumWander.target,
			CLIENT_SPEED,
			dtSec,
			TILE_SIZE
		);
		this.#mum.setPosition(step.x, step.y);
		this.#mum.setVelocity(0, 0);

		if (step.arrived) {
			this.#mum.anims.play('client-idle', true);
			this.#mumWander = nextWanderTarget(this.#mumDef.patrol, this.#mumWander.waypointIndex);
			this.#mumPauseUntil = now + Phaser.Math.Between(200, 600);
		} else {
			this.#mum.anims.play('client-walk', true);
			if (step.x < prevX - 0.05) this.#mum.setFlipX(true);
			if (step.x > prevX + 0.05) this.#mum.setFlipX(false);
		}
	}

	#setupInput(): void {
		if (!this.input.keyboard) return;
		this.#cursors = this.input.keyboard.createCursorKeys();
		this.#wasd = this.input.keyboard.addKeys('W,A,S,D') as {
			W: Phaser.Input.Keyboard.Key;
			A: Phaser.Input.Keyboard.Key;
			S: Phaser.Input.Keyboard.Key;
			D: Phaser.Input.Keyboard.Key;
		};
		this.#interactKey = this.input.keyboard.addKey(INTERACT_KEYS[0]);
	}

	#setupTouchPad(): void {
		if (this.#touchPadBuilt) return;
		const coarse =
			typeof window !== 'undefined' &&
			(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640);
		if (!coarse) return;
		this.#touchPadBuilt = true;

		const cam = this.cameras.main;
		const baseX = 48;
		const baseY = cam.height - 48;
		const mk = (x: number, y: number, dx: number, dy: number, label: string) => {
			const circle = this.add
				.circle(x, y, 18, 0x1c1917, 0.55)
				.setScrollFactor(0)
				.setDepth(50)
				.setInteractive();
			this.add
				.text(x, y, label, { fontSize: '12px', color: '#fafaf9' })
				.setOrigin(0.5)
				.setScrollFactor(0)
				.setDepth(51);
			circle.on('pointerdown', () => {
				this.#touchVector.x = dx;
				this.#touchVector.y = dy;
			});
			circle.on('pointerup', () => {
				this.#touchVector.x = 0;
				this.#touchVector.y = 0;
			});
			circle.on('pointerout', () => {
				this.#touchVector.x = 0;
				this.#touchVector.y = 0;
			});
		};
		mk(baseX, baseY - 28, 0, -1, '▲');
		mk(baseX, baseY + 28, 0, 1, '▼');
		mk(baseX - 28, baseY, -1, 0, '◀');
		mk(baseX + 28, baseY, 1, 0, '▶');

		const interact = this.add
			.circle(cam.width - 48, cam.height - 48, 22, 0xb45309, 0.7)
			.setScrollFactor(0)
			.setDepth(50)
			.setInteractive();
		this.add
			.text(cam.width - 48, cam.height - 48, 'E', {
				fontSize: '14px',
				color: '#fffbeb',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(51);
		interact.on('pointerdown', () => {
			this.#touchInteract = true;
		});
	}

	#drivePlayer(): void {
		let vx = 0;
		let vy = 0;
		if (this.#cursors?.left.isDown || this.#wasd?.A.isDown) vx -= 1;
		if (this.#cursors?.right.isDown || this.#wasd?.D.isDown) vx += 1;
		if (this.#cursors?.up.isDown || this.#wasd?.W.isDown) vy -= 1;
		if (this.#cursors?.down.isDown || this.#wasd?.S.isDown) vy += 1;
		vx += this.#touchVector.x;
		vy += this.#touchVector.y;

		if (vx !== 0 && vy !== 0) {
			const inv = Math.SQRT1_2;
			vx *= inv;
			vy *= inv;
		}

		this.#player.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);
		if (vx !== 0 || vy !== 0) {
			this.#player.anims.play('player-walk', true);
			if (vx < 0) this.#player.setFlipX(true);
			if (vx > 0) this.#player.setFlipX(false);
		} else {
			this.#player.anims.play('player-idle', true);
		}
	}

	#snapPlayerToDesk(): void {
		const { desk } = this.#room;
		this.#player.setPosition(
			desk.tx * TILE_SIZE + TILE_SIZE / 2,
			desk.ty * TILE_SIZE + TILE_SIZE / 2
		);
	}

	#hasMumResident(): boolean {
		return this.#room.residents.some((r) => r.clientName === 'Mum');
	}

	#onCommand(cmd: StudioInboundCommand): void {
		if (cmd.type === 'sync') {
			const prevVenue = this.#builtVenueId;
			this.#snapshot = cmd.snapshot;
			if (cmd.snapshot.activeVenueId !== prevVenue) {
				this.#rebuildForVenue(cmd.snapshot.activeVenueId);
			} else {
				this.#rebuildEasels();
			}
			return;
		}
		if (cmd.type === 'summon-client') {
			this.#summonClient();
			return;
		}
		if (cmd.type === 'spawn-visitor') {
			this.#spawnDoorVisitor();
			return;
		}
		if (cmd.type === 'dismiss-client') {
			this.#dismissClient();
		}
	}

	#summonClient(): void {
		// Kitchen with Mum: arm via snapshot only — never door-enter.
		if (this.#hasMumResident()) {
			return;
		}
		this.#spawnDoorVisitor();
	}

	#spawnDoorVisitor(): void {
		if (this.#client) return;
		const variant = Math.floor(Math.random() * 3) * 2;
		const { door, clientWait } = this.#room;
		this.#client = this.physics.add.sprite(
			door.tx * TILE_SIZE + TILE_SIZE / 2,
			door.ty * TILE_SIZE + TILE_SIZE / 2,
			'clients',
			variant
		);
		this.#client.setDepth(10);
		this.#client.clearTint();
		this.#clientArrived = false;
		this.#client.anims.play('client-walk', true);

		const targetX = clientWait.tx * TILE_SIZE + TILE_SIZE / 2;
		const targetY = clientWait.ty * TILE_SIZE + TILE_SIZE / 2;
		const dist = Phaser.Math.Distance.Between(this.#client.x, this.#client.y, targetX, targetY);
		const duration = Math.max(200, (dist / CLIENT_SPEED) * 1000);

		this.tweens.add({
			targets: this.#client,
			x: targetX,
			y: targetY,
			duration,
			onComplete: () => {
				if (!this.#client) return;
				this.#clientArrived = true;
				this.#client.anims.play('client-idle', true);
			}
		});
	}

	#dismissClient(): void {
		// Mum never leaves through the door.
		if (!this.#client) return;
		const sprite = this.#client;
		this.#client = null;
		this.#clientArrived = false;
		const { door } = this.#room;
		const targetX = door.tx * TILE_SIZE + TILE_SIZE / 2;
		const targetY = door.ty * TILE_SIZE + TILE_SIZE / 2;
		this.tweens.add({
			targets: sprite,
			x: targetX,
			y: targetY,
			duration: 600,
			onComplete: () => {
				sprite.destroy();
			}
		});
	}

	#rebuildEasels(): void {
		for (const view of this.#easels) {
			view.stand.destroy();
			view.art?.destroy();
		}
		this.#easels = [];

		const venueId = this.#snapshot?.activeVenueId ?? this.#builtVenueId;
		const entries = this.#snapshot?.displayedEntries ?? [];
		const slots = slotsForVenue(venueId, this.#room);

		for (let i = 0; i < slots.length; i++) {
			const slot = slots[i]!;
			const x = slot.tx * TILE_SIZE + TILE_SIZE / 2;
			const y = slot.ty * TILE_SIZE + TILE_SIZE / 2;
			const frame = slot.kind === 'magnet' ? 2 : 4;
			const stand = this.add.image(x, y, 'furniture', frame).setDepth(6);
			const entry = entries[i] ?? null;
			let art: Phaser.GameObjects.Image | null = null;
			if (entry) {
				const key = `art-${entry.id}`;
				if (!this.textures.exists(key)) {
					this.load.image(key, entry.imageUrl);
					this.load.once(Phaser.Loader.Events.COMPLETE, () => {
						if (!this.textures.exists(key)) return;
						const img = this.add
							.image(x, y - 2, key)
							.setDisplaySize(12, 12)
							.setDepth(7);
						const found = this.#easels.find((e) => e.entryId === entry.id);
						if (found) found.art = img;
					});
					this.load.start();
				} else {
					art = this.add
						.image(x, y - 2, key)
						.setDisplaySize(12, 12)
						.setDepth(7);
				}
			}
			this.#easels.push({ slot, stand, art, entryId: entry?.id ?? null });
		}
	}

	#commissionNpc(): Phaser.Physics.Arcade.Sprite | null {
		if (this.#mumIsCommissionTarget() && this.#mum) return this.#mum;
		if (this.#client && this.#clientArrived) return this.#client;
		return null;
	}

	#nearestShowZone(): RoomZone | null {
		return (
			this.#room.zones.find((z) => z.id === 'window' || z.id === 'gallery') ?? null
		);
	}

	#inZone(zone: RoomZone, px: number, py: number): boolean {
		const tx = Math.floor(px / TILE_SIZE);
		const ty = Math.floor(py / TILE_SIZE);
		return tx >= zone.x0 && tx <= zone.x1 && ty >= zone.y0 && ty <= zone.y1;
	}

	#nearestTarget():
		| { kind: 'talk' }
		| { kind: 'deliver' }
		| { kind: 'desk' }
		| { kind: 'easel'; entryId: string }
		| { kind: 'look'; entryId: string | null; zoneId: RoomZone['id'] }
		| null {
		const px = this.#player.x;
		const py = this.#player.y;
		const phase = this.#snapshot?.phase ?? 'idle';

		if (phase === 'idle') {
			if (this.#mumIsCommissionTarget() && this.#mum) {
				const d = Phaser.Math.Distance.Between(px, py, this.#mum.x, this.#mum.y);
				if (d < INTERACT_RANGE_PX) return { kind: 'talk' };
			} else if (this.#client && this.#clientArrived) {
				const d = Phaser.Math.Distance.Between(px, py, this.#client.x, this.#client.y);
				if (d < INTERACT_RANGE_PX) return { kind: 'talk' };
			}
		}

		if (phase === 'results') {
			const npc = this.#commissionNpc();
			if (npc) {
				const d = Phaser.Math.Distance.Between(px, py, npc.x, npc.y);
				if (d < INTERACT_RANGE_PX) return { kind: 'deliver' };
			}
		}

		const deskX = this.#room.desk.tx * TILE_SIZE + TILE_SIZE / 2;
		const deskY = this.#room.desk.ty * TILE_SIZE + TILE_SIZE / 2;
		if (
			phase === 'briefing' &&
			Phaser.Math.Distance.Between(px, py, deskX, deskY) < INTERACT_RANGE_PX
		) {
			return { kind: 'desk' };
		}

		for (const easel of this.#easels) {
			if (!easel.entryId) continue;
			const ex = easel.slot.tx * TILE_SIZE + TILE_SIZE / 2;
			const ey = easel.slot.ty * TILE_SIZE + TILE_SIZE / 2;
			if (Phaser.Math.Distance.Between(px, py, ex, ey) < INTERACT_RANGE_PX) {
				return { kind: 'easel', entryId: easel.entryId };
			}
		}

		const showZone = this.#nearestShowZone();
		if (showZone && this.#inZone(showZone, px, py)) {
			const first = this.#snapshot?.displayedEntries[0] ?? null;
			return { kind: 'look', entryId: first?.id ?? null, zoneId: showZone.id };
		}

		return null;
	}

	#updateInteractPrompt(): void {
		const target = this.#nearestTarget();
		if (!target) {
			this.#prompt.setVisible(false);
			return;
		}
		let x = this.#player.x;
		let y = this.#player.y - 18;
		const npc = this.#commissionNpc();
		if ((target.kind === 'talk' || target.kind === 'deliver') && npc) {
			x = npc.x;
			y = npc.y - 18;
		}
		this.#prompt.setPosition(x, y).setVisible(true);
	}

	#consumeInteract(): boolean {
		const just = this.#interactKey ? Phaser.Input.Keyboard.JustDown(this.#interactKey) : false;
		const touch = this.#touchInteract;
		this.#touchInteract = false;
		return just || touch;
	}

	#tryInteract(): void {
		const target = this.#nearestTarget();
		if (!target) return;
		if (target.kind === 'talk') {
			this.#bridge.emit({ type: 'talk-to-client' });
			return;
		}
		if (target.kind === 'deliver') {
			this.#bridge.emit({ type: 'deliver-to-client' });
			return;
		}
		if (target.kind === 'desk') {
			this.#bridge.emit({ type: 'interact-desk' });
			return;
		}
		if (target.kind === 'look') {
			if (target.entryId) {
				this.#bridge.emit({ type: 'open-gallery-entry', entryId: target.entryId });
			} else {
				this.#bridge.emit({ type: 'inspect-zone', zoneId: target.zoneId });
			}
			return;
		}
		this.#bridge.emit({ type: 'open-gallery-entry', entryId: target.entryId });
	}
}
