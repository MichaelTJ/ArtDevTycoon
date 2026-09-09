import Phaser from 'phaser';
import type { BarkSpeakerId } from '$lib/data/barks';
import { barkSpeakerLabel } from '$lib/data/barks';
import {
	DEFAULT_BARK_SCHEDULE,
	barksAllowedForPhase,
	eligibleBarkSpeakers,
	nextBarkDelayMs,
	pickBark
} from '../barkPicker';
import {
	BARK_DEPTH,
	BARK_FADE_MS,
	BARK_OFFSET_Y,
	BARK_PROMPT_RETRY_MS,
	barkLifetimeMs,
	shouldShowBark,
	type BarkAnnounceHandler
} from '../barkPresenter';
import type { StudioBridge, StudioInboundCommand, StudioSnapshot } from '../bridge';
import { npcAttention, playerDeskLocked, showAttentionMark } from '../npcAttention';
import { cameraLetterboxBounds, cameraRoomCenter, cameraZoomToFitRoom } from '../cameraFit';
import { clientLookForTier } from '../clientLooks';
import { STUDIO_DOM_EDITABLE_FOCUSED_KEY } from '../domInputFocus';
import { applyDomEditableKeyboardGate } from '../domInputKeyboardGate';
import { CLIENT_SPEED, INTERACT_KEYS, INTERACT_RANGE_PX, PLAYER_SPEED, TILE_SIZE } from '../config';
import { easelStandFrame, slotsForVenue, type EaselSlot } from '../easelLayout';
import {
	FRIDGE,
	fridgeBarkLine,
	nearestInteractable,
	TOOLKIT_SHELF,
	type InteractableId
} from '../interactables';
import { interactPromptLabel, type InteractPromptInput } from '../interactPrompt';
import {
	nextWanderTarget,
	stepToward,
	tileFromPixel,
	withPath,
	type WanderState
} from '../npcWander';
import { findPathInRoom } from '../pathfind';
import type { ResidentNpcDef, RoomDef, RoomZone, TileMarker } from '../rooms';
import { roomDesks } from '../rooms';
import { isSafeStudioImageUrl } from '../safeImageUrl';
import {
	curatorPatrol,
	floorStaffFromHired,
	receptionistAnchor,
	staffAnchorForRole,
	staffLookForRole,
	type FloorStaffRoleId
} from '../staffPresence';
import { getRoomForVenue } from '../venueRooms';
import { getTileset } from '$lib/studio-editor/catalog';
import { resolvePersonLook } from '$lib/studio-editor/apply';
import { buildGroundTilemap } from '../tilemapBuild';
import {
	CASH_BURST_COUNT,
	CASH_BURST_LIFESPAN_MS,
	WORK_PARTICLE_FREQUENCY_MS,
	WORK_PARTICLE_MAX,
	clampCashBurstCount,
	shouldBurstCashConfetti,
	shouldEmitWorkParticles,
	shouldTriggerCashBurst
} from '../vfx';
import { DEFAULT_WORK_ESTIMATE_MS, workBarProgress } from '../workProgress';

const TALK_OR_DELIVER = new Set(['talk', 'deliver']);
const RECEPTION_KIND = new Set(['reception']);
/** Warm tint so Mum reads apart from door visitors when using the clients sheet. */
const MUM_TINT = 0xffc9a8;
const MUM_PAUSE_MS_MIN = 200;
const MUM_PAUSE_MS_MAX = 600;

interface InteractPropView {
	id: InteractableId;
	sprite: Phaser.GameObjects.Image;
	tx: number;
	ty: number;
}

interface EaselView {
	slot: EaselSlot;
	stand: Phaser.GameObjects.Image | null;
	art: Phaser.GameObjects.Image | null;
	entryId: string | null;
}

interface StaffSprite {
	roleId: FloorStaffRoleId;
	sprite: Phaser.Physics.Arcade.Sprite;
	lookFrame: number;
	patrol: readonly TileMarker[] | null;
	wander: WanderState | null;
	pauseUntil: number;
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
	#mumUsesSheet = false;
	/** Spec 24 / P27 — front-desk NPC when channel is receptionist. */
	#receptionist: Phaser.Physics.Arcade.Sprite | null = null;
	/** P27 — letterbox / computer prop at the commission anchor (no NPC). */
	#commissionBoardProp: Phaser.GameObjects.Image | null = null;
	#staff = new Map<FloorStaffRoleId, StaffSprite>();
	#prompt!: Phaser.GameObjects.Image;
	#promptLabel!: Phaser.GameObjects.Text;
	/** Spec 29 — `!` above the commission NPC when a job or critique is waiting. */
	#attentionMark!: Phaser.GameObjects.Text;
	#snapshot: StudioSnapshot | null = null;
	#easels: EaselView[] = [];
	#furnitureGroup!: Phaser.Physics.Arcade.StaticGroup;
	#interactProps: InteractPropView[] = [];
	#fridgeOpen = false;
	#fridgeBarkIndex = 0;
	#fridgeAutoClose: Phaser.Time.TimerEvent | null = null;
	#groundLayer: Phaser.Tilemaps.TilemapLayer | null = null;
	#tilemap: Phaser.Tilemaps.Tilemap | null = null;
	#groundOverlays: Phaser.GameObjects.Group | null = null;
	#touchVector = { x: 0, y: 0 };
	#touchInteract = false;
	#working = false;
	#workBarBg!: Phaser.GameObjects.Rectangle;
	#workBarFill!: Phaser.GameObjects.Rectangle;
	#touchPadBuilt = false;
	/** True while a DOM text control has focus — keyboard walk/interact disabled. */
	#domEditableFocused = false;
	/** Spec 21d — desk pencil-dust emitter (continuous while working). */
	#workEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
	/** Spec 21d — one-shot cash confetti emitter. */
	#cashEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
	#prevPhase: string | null = null;
	/** Spec 21e — ambient bark bubble. */
	#barkText: Phaser.GameObjects.Text | null = null;
	#barkSpeakerSprite: Phaser.GameObjects.Sprite | null = null;
	#barkExpiresAt: number | null = null;
	#nextBarkAt: number | null = null;
	#lastBarkId: string | null = null;
	/** Phaser texture keys for floor thumbnails — unloaded when entries leave display. */
	#artTextureKeys = new Set<string>();
	#artLoadGeneration = 0;

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
		// Spec 21f: contextual verb Text (preferred); prompt-e kept loaded for later polish.
		this.#promptLabel = this.add
			.text(0, 0, '', {
				fontFamily: 'monospace',
				fontSize: '8px',
				color: '#fafaf9',
				stroke: '#1c1917',
				strokeThickness: 3
			})
			.setOrigin(0.5, 1)
			.setDepth(20)
			.setVisible(false);
		this.#attentionMark = this.add
			.text(0, 0, '!', {
				fontFamily: 'monospace',
				fontSize: '14px',
				color: '#f59e0b',
				stroke: '#1c1917',
				strokeThickness: 4
			})
			.setOrigin(0.5, 1)
			.setDepth(21)
			.setVisible(false);
		this.#createWorkBar();
		this.#createVfxEmitters();

		this.#bridge.setCommandHandler((cmd) => this.#onCommand(cmd));
		this.#bridge.emit({ type: 'ready' });

		this.scale.on(Phaser.Scale.Events.RESIZE, this.#applyRoomViewport, this);

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.scale.off(Phaser.Scale.Events.RESIZE, this.#applyRoomViewport, this);
			this.#hideBark(true);
			this.#destroyVfx();
			this.#attentionMark?.destroy();
			this.#bridge.setCommandHandler(null);
		});
	}

	update(_time: number, delta: number): void {
		if (!this.#player?.body) return;

		this.#syncDomInputFocus();

		const phase = this.#snapshot?.phase ?? 'idle';
		this.#working = playerDeskLocked(phase);

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
		this.#updateStaffWander(delta / 1000);
		this.#updateWorkBar();
		this.#syncWorkParticles();
		this.#updateInteractPrompt();
		this.#updateAttentionMark();
		this.#updateBarks();
		if (!this.#working && this.#consumeInteract()) {
			this.#tryInteract();
		}
	}

	#buildFloor(): void {
		this.#applyRoomViewport();
		this.#buildTilemap();
		this.#placeFurniture();
		this.#spawnPlayer();
		this.#spawnResidents();
		this.#rebuildEasels();
	}

	#teardownFloor(keepMum: boolean): void {
		this.#hideBark(true);
		this.#nextBarkAt = null;

		for (const view of this.#easels) {
			view.stand?.destroy();
			view.art?.destroy();
		}
		this.#easels = [];

		if (this.#client) {
			this.#client.destroy();
			this.#client = null;
			this.#clientArrived = false;
		}

		this.#destroyAllStaff();

		if (this.#receptionist) {
			this.#receptionist.destroy();
			this.#receptionist = null;
		}

		if (this.#commissionBoardProp) {
			this.#commissionBoardProp.destroy();
			this.#commissionBoardProp = null;
		}

		if (!keepMum && this.#mum) {
			this.#mum.destroy();
			this.#mum = null;
			this.#mumDef = null;
			this.#mumWander = null;
			this.#mumUsesSheet = false;
		}

		this.#furnitureGroup?.clear(true, true);
		this.#interactProps = [];
		this.#fridgeOpen = false;
		this.#cancelFridgeAutoClose();
		this.#groundOverlays?.destroy(true);
		this.#groundOverlays = null;
		this.#groundLayer?.destroy();
		this.#groundLayer = null;
		this.#tilemap?.destroy();
		this.#tilemap = null;

		this.#destroyVfx();

		if (this.#player) {
			this.#player.destroy();
		}
	}

	#rebuildForVenue(venueId: string): void {
		const next = getRoomForVenue(venueId);
		const keepMum = Boolean(this.#mum) && next.residents.some((r) => r.clientName === 'Mum');
		this.#teardownFloor(keepMum);
		this.#room = next;
		this.#builtVenueId = venueId;
		this.#applyRoomViewport();
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
		this.#syncStaff();
		this.#syncCommissionChannel();
		this.#createVfxEmitters();
		this.#syncWorkParticles();
	}

	#applyRoomViewport(): void {
		const w = this.#room.width * TILE_SIZE;
		const h = this.#room.height * TILE_SIZE;
		this.physics.world.setBounds(0, 0, w, h);
		const cam = this.cameras.main;
		const zoom = cameraZoomToFitRoom(w, h, cam.width, cam.height, TILE_SIZE * 0.5);
		cam.setZoom(zoom);
		const bounds = cameraLetterboxBounds(w, h, cam.width, cam.height, zoom);
		cam.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
		const center = cameraRoomCenter(w, h);
		cam.centerOn(center.x, center.y);
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
		const phase = this.#snapshot?.phase ?? 'idle';
		if (phase !== 'generating' && phase !== 'critiquing') {
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

		// Mum / staff sheets share the clients bob layout; dedicated anim keys avoid
		// Phaser swapping the sprite texture back to `clients` mid-idle.
		if (this.textures.exists('mum') && !this.anims.exists('mum-idle')) {
			this.anims.create({
				key: 'mum-idle',
				frames: [{ key: 'mum', frame: 0 }],
				frameRate: 1
			});
			this.anims.create({
				key: 'mum-walk',
				frames: [
					{ key: 'mum', frame: 0 },
					{ key: 'mum', frame: 1 }
				],
				frameRate: 6,
				repeat: -1
			});
		}
		if (this.textures.exists('staff') && !this.anims.exists('staff-idle')) {
			this.anims.create({
				key: 'staff-idle',
				frames: [{ key: 'staff', frame: 0 }],
				frameRate: 1
			});
			this.anims.create({
				key: 'staff-walk',
				frames: [
					{ key: 'staff', frame: 0 },
					{ key: 'staff', frame: 1 }
				],
				frameRate: 6,
				repeat: -1
			});
		}
	}

	#buildTilemap(): void {
		const { width, height, collision, tilesetId } = this.#room;
		const spec = getTileset(tilesetId ?? 'tiny-dungeon');
		const { data, overlays } = buildGroundTilemap(this.#room);

		const map = this.make.tilemap({
			data,
			tileWidth: TILE_SIZE,
			tileHeight: TILE_SIZE,
			insertNull: true
		});
		const tileset = map.addTilesetImage(
			spec.phaserKey,
			spec.phaserKey,
			TILE_SIZE,
			TILE_SIZE,
			spec.margin,
			spec.spacing
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

		this.#groundOverlays?.destroy(true);
		this.#groundOverlays = this.add.group();
		for (const overlay of overlays) {
			if (!this.textures.exists(overlay.key)) continue;
			const sprite = this.add
				.image(
					overlay.x * TILE_SIZE + TILE_SIZE / 2,
					overlay.y * TILE_SIZE + TILE_SIZE / 2,
					overlay.key,
					overlay.frame
				)
				.setDepth(1);
			this.#groundOverlays.add(sprite);
		}

		this.#tilemap = map;
		this.#groundLayer = layer;
		this.registry.set('groundLayer', layer);
	}

	#placeFurniture(): void {
		this.#furnitureGroup = this.physics.add.staticGroup();
		this.#interactProps = [];
		this.#fridgeOpen = false;
		this.#cancelFridgeAutoClose();
		for (const prop of this.#room.furniture) {
			const sheet = prop.sheet && this.textures.exists(prop.sheet) ? prop.sheet : 'furniture';
			const sprite = this.#furnitureGroup.create(
				prop.tx * TILE_SIZE + TILE_SIZE / 2,
				prop.ty * TILE_SIZE + TILE_SIZE / 2,
				sheet
			) as Phaser.Physics.Arcade.Sprite;
			sprite.setFrame(prop.frame);
			sprite.setDepth(5);
			if (!prop.solid) {
				sprite.disableBody(true, false);
			}
			if (prop.interactableId) {
				this.#interactProps.push({
					id: prop.interactableId,
					sprite,
					tx: prop.tx,
					ty: prop.ty
				});
			}
		}
	}

	#cancelFridgeAutoClose(): void {
		if (this.#fridgeAutoClose) {
			this.#fridgeAutoClose.remove(false);
			this.#fridgeAutoClose = null;
		}
	}

	#setFridgeOpen(open: boolean, emitBark: boolean): void {
		this.#fridgeOpen = open;
		const fridge = this.#interactProps.find((p) => p.id === 'fridge');
		if (fridge && fridge.sprite.texture.key === 'furniture') {
			fridge.sprite.setFrame(open ? FRIDGE.openFrame : FRIDGE.closedFrame);
		}
		this.#cancelFridgeAutoClose();
		if (open) {
			if (emitBark) {
				const text = fridgeBarkLine(FRIDGE.barkLines, this.#fridgeBarkIndex++);
				this.#bridge.emit({ type: 'prop-bark', propId: 'fridge', text });
			}
			this.#fridgeAutoClose = this.time.delayedCall(2000, () => {
				this.#fridgeAutoClose = null;
				this.#setFridgeOpen(false, false);
			});
		}
	}

	#spawnPlayer(): void {
		const { playerSpawn } = this.#room;
		const look = resolvePersonLook('player');
		const key = this.textures.exists(look.sheetId) ? look.sheetId : 'player';
		this.#player = this.physics.add.sprite(
			playerSpawn.tx * TILE_SIZE + TILE_SIZE / 2,
			playerSpawn.ty * TILE_SIZE + TILE_SIZE / 2,
			key,
			look.frame
		);
		this.#player.setDepth(10);
		this.#player.setCollideWorldBounds(true);
		this.#player.body?.setSize(10, 10);
		this.#player.body?.setOffset(3, 4);
		if (look.tint === null) {
			this.#player.clearTint();
		} else {
			this.#player.setTint(look.tint);
		}

		if (this.#groundLayer) {
			this.physics.add.collider(this.#player, this.#groundLayer);
		}
		this.physics.add.collider(this.#player, this.#furnitureGroup);
		this.#applyCameraFollow();
		if (key === 'player' && this.anims.exists('player-idle')) {
			this.#player.anims.play('player-idle');
		}
	}

	/** Soft follow lerp unless `reducedVfx` — then hard follow. */
	#applyCameraFollow(): void {
		if (!this.#player) return;
		const reduced = this.#snapshot?.reducedVfx ?? false;
		const lerp = reduced ? 1 : 0.12;
		this.cameras.main.startFollow(this.#player, true, lerp, lerp);
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
			this.#mumUsesSheet = false;
			return;
		}
		if (this.#mum) return;

		this.#mumDef = mum;
		const look = resolvePersonLook('mum');
		const key = this.textures.exists(look.sheetId)
			? look.sheetId
			: this.textures.exists('mum')
				? 'mum'
				: 'clients';
		this.#mumUsesSheet = key === 'mum';
		this.#mum = this.physics.add.sprite(
			mum.spawn.tx * TILE_SIZE + TILE_SIZE / 2,
			mum.spawn.ty * TILE_SIZE + TILE_SIZE / 2,
			key,
			look.frame
		);
		this.#mum.setDepth(10);
		if (look.tint !== null) {
			this.#mum.setTint(look.tint);
		} else if (key === 'clients') {
			this.#mum.setTint(MUM_TINT);
		}
		this.#mumWander = {
			waypointIndex: 0,
			target: mum.patrol[0]!,
			path: [],
			pathIndex: 0
		};
		this.#mumPauseUntil = 0;
		this.#playMumAnim('idle');
	}

	#mumIsCommissionTarget(): boolean {
		const snap = this.#snapshot;
		if (!this.#mum || !snap) return false;
		if (snap.residentClientArmed && snap.phase === 'idle') return true;
		if (snap.modelLoading && snap.phase === 'idle') return true;
		if (snap.client?.clientName === 'Mum') return true;
		return false;
	}

	#playMumAnim(kind: 'idle' | 'walk'): void {
		if (!this.#mum) return;
		const texture = this.#mum.texture.key;
		if (texture !== 'mum' && texture !== 'clients') {
			this.#mum.anims.stop();
			return;
		}
		const key =
			this.#mumUsesSheet && this.anims.exists(kind === 'idle' ? 'mum-idle' : 'mum-walk')
				? kind === 'idle'
					? 'mum-idle'
					: 'mum-walk'
				: kind === 'idle'
					? 'client-idle'
					: 'client-walk';
		this.#mum.anims.play(key, true);
	}

	#mumPauseDurationMs(): number {
		if (this.#snapshot?.reducedVfx) return MUM_PAUSE_MS_MAX;
		return Phaser.Math.Between(MUM_PAUSE_MS_MIN, MUM_PAUSE_MS_MAX);
	}

	/** Compute BFS path to the current patrol waypoint; skip unreachable goals. */
	#ensureMumPath(): void {
		if (!this.#mum || !this.#mumDef || !this.#mumWander) return;
		if (this.#mumWander.path.length > 0) return;

		const from = tileFromPixel(this.#mum.x, this.#mum.y, TILE_SIZE);
		let attempts = 0;
		while (attempts < this.#mumDef.patrol.length) {
			const path = findPathInRoom(
				this.#room.width,
				this.#room.height,
				this.#room.collision,
				from,
				this.#mumWander.target
			);
			if (path) {
				this.#mumWander = withPath(this.#mumWander, path);
				return;
			}
			this.#mumWander = nextWanderTarget(this.#mumDef.patrol, this.#mumWander.waypointIndex);
			attempts += 1;
		}
		// All waypoints unreachable — idle in place.
		this.#mumWander = withPath(this.#mumWander, [from]);
	}

	#updateMumWander(dtSec: number): void {
		if (!this.#mum || !this.#mumDef || !this.#mumWander) return;

		if (this.#mumIsCommissionTarget()) {
			this.#mum.setVelocity(0, 0);
			this.#playMumAnim('idle');
			return;
		}

		const now = this.time.now;
		if (now < this.#mumPauseUntil) {
			this.#mum.setVelocity(0, 0);
			this.#playMumAnim('idle');
			return;
		}

		this.#ensureMumPath();
		const stepTile = this.#mumWander.path[this.#mumWander.pathIndex];
		if (!stepTile) {
			// Path exhausted → patrol waypoint arrived.
			this.#playMumAnim('idle');
			this.#mumWander = nextWanderTarget(this.#mumDef.patrol, this.#mumWander.waypointIndex);
			this.#mumPauseUntil = now + this.#mumPauseDurationMs();
			return;
		}

		const prevX = this.#mum.x;
		const step = stepToward(prevX, this.#mum.y, stepTile, CLIENT_SPEED, dtSec, TILE_SIZE);
		this.#mum.setPosition(step.x, step.y);
		this.#mum.setVelocity(0, 0);

		if (step.arrived) {
			this.#mumWander = {
				...this.#mumWander,
				pathIndex: this.#mumWander.pathIndex + 1
			};
			if (this.#mumWander.pathIndex >= this.#mumWander.path.length) {
				this.#playMumAnim('idle');
				this.#mumWander = nextWanderTarget(this.#mumDef.patrol, this.#mumWander.waypointIndex);
				this.#mumPauseUntil = now + this.#mumPauseDurationMs();
			} else {
				this.#playMumAnim('walk');
			}
		} else {
			this.#playMumAnim('walk');
			if (step.x < prevX - 0.05) this.#mum.setFlipX(true);
			if (step.x > prevX + 0.05) this.#mum.setFlipX(false);
		}
	}

	#syncCommissionChannel(): void {
		this.#syncReceptionist();
		this.#syncCommissionBoardProp();
	}

	#syncCommissionBoardProp(): void {
		const channel = this.#snapshot?.commissionChannel ?? 'none';
		if (channel !== 'letterbox' && channel !== 'computer') {
			if (this.#commissionBoardProp) {
				this.#commissionBoardProp.destroy();
				this.#commissionBoardProp = null;
			}
			return;
		}

		const anchor = receptionistAnchor(this.#room);
		const x = anchor.tx * TILE_SIZE + TILE_SIZE / 2;
		const y = anchor.ty * TILE_SIZE + TILE_SIZE / 2;
		const frame = channel === 'letterbox' ? 2 : 0;
		const tint = channel === 'letterbox' ? 0xc8a878 : 0x88aacc;

		if (!this.#commissionBoardProp) {
			this.#commissionBoardProp = this.add.image(x, y, 'furniture', frame).setDepth(8);
		}
		this.#commissionBoardProp.setPosition(x, y).setFrame(frame).setTint(tint);
	}

	#syncReceptionist(): void {
		const visible = this.#snapshot?.receptionistVisible ?? false;
		if (!visible) {
			if (this.#receptionist) {
				this.#receptionist.destroy();
				this.#receptionist = null;
			}
			return;
		}
		if (this.#receptionist) return;

		const anchor = receptionistAnchor(this.#room);
		const key = this.#staffTextureKey();
		this.#receptionist = this.physics.add.sprite(
			anchor.tx * TILE_SIZE + TILE_SIZE / 2,
			anchor.ty * TILE_SIZE + TILE_SIZE / 2,
			key,
			0
		);
		this.#receptionist.setDepth(10);
		this.#receptionist.setTint(0xc8ffb8);
		this.#playStaffIdle({
			roleId: 'marketing-director',
			sprite: this.#receptionist,
			lookFrame: 0,
			patrol: null,
			wander: null,
			pauseUntil: 0
		});
	}

	#destroyAllStaff(): void {
		for (const entry of this.#staff.values()) {
			entry.sprite.destroy();
		}
		this.#staff.clear();
	}

	#staffTextureKey(): string {
		return this.textures.exists('staff') ? 'staff' : 'clients';
	}

	#playStaffIdle(entry: StaffSprite): void {
		if (entry.sprite.anims.isPlaying) {
			entry.sprite.anims.stop();
		}
		const current = entry.sprite.texture.key;
		if (current !== 'staff' && current !== 'clients') {
			if (Number(entry.sprite.frame.name) !== entry.lookFrame) {
				entry.sprite.setFrame(entry.lookFrame);
			}
			return;
		}
		const key = this.#staffTextureKey();
		// Keep role frame — shared client-idle always forces frame 0.
		if (entry.sprite.texture.key !== key) {
			entry.sprite.setTexture(key, entry.lookFrame);
			return;
		}
		if (Number(entry.sprite.frame.name) !== entry.lookFrame) {
			entry.sprite.setFrame(entry.lookFrame);
		}
	}

	#playStaffWalk(entry: StaffSprite): void {
		const current = entry.sprite.texture.key;
		if (current !== 'staff' && current !== 'clients') {
			entry.sprite.anims.stop();
			return;
		}
		const useStaff = this.textures.exists('staff') && this.anims.exists('staff-walk');
		entry.sprite.anims.play(useStaff ? 'staff-walk' : 'client-walk', true);
	}

	#syncStaff(): void {
		const desired = floorStaffFromHired(this.#snapshot?.hiredRoleIds ?? []);
		const desiredSet = new Set(desired);

		for (const [roleId, entry] of [...this.#staff.entries()]) {
			if (!desiredSet.has(roleId)) {
				entry.sprite.destroy();
				this.#staff.delete(roleId);
			}
		}

		for (const roleId of desired) {
			if (this.#staff.has(roleId)) continue;
			const anchor = staffAnchorForRole(roleId, this.#room);
			const look = staffLookForRole(roleId);
			const key =
				look.spriteKey && this.textures.exists(look.spriteKey)
					? look.spriteKey
					: this.#staffTextureKey();
			const sprite = this.physics.add.sprite(
				anchor.tx * TILE_SIZE + TILE_SIZE / 2,
				anchor.ty * TILE_SIZE + TILE_SIZE / 2,
				key,
				look.frame
			);
			sprite.setDepth(10);
			sprite.setTint(look.tint);

			const patrol = roleId === 'curator' ? curatorPatrol(this.#room) : null;
			const entry: StaffSprite = {
				roleId,
				sprite,
				lookFrame: look.frame,
				patrol,
				wander: patrol ? { waypointIndex: 0, target: patrol[0]!, path: [], pathIndex: 0 } : null,
				pauseUntil: 0
			};
			this.#playStaffIdle(entry);
			this.#staff.set(roleId, entry);
		}
	}

	#updateStaffWander(dtSec: number): void {
		const now = this.time.now;
		for (const entry of this.#staff.values()) {
			if (entry.roleId !== 'curator' || !entry.patrol || !entry.wander) {
				entry.sprite.setVelocity(0, 0);
				this.#playStaffIdle(entry);
				continue;
			}

			if (now < entry.pauseUntil) {
				entry.sprite.setVelocity(0, 0);
				this.#playStaffIdle(entry);
				continue;
			}

			const prevX = entry.sprite.x;
			const step = stepToward(
				prevX,
				entry.sprite.y,
				entry.wander.target,
				CLIENT_SPEED,
				dtSec,
				TILE_SIZE
			);
			entry.sprite.setPosition(step.x, step.y);
			entry.sprite.setVelocity(0, 0);

			if (step.arrived) {
				this.#playStaffIdle(entry);
				entry.wander = nextWanderTarget(entry.patrol, entry.wander.waypointIndex);
				entry.pauseUntil = now + Phaser.Math.Between(200, 600);
			} else {
				this.#playStaffWalk(entry);
				if (step.x < prevX - 0.05) entry.sprite.setFlipX(true);
				if (step.x > prevX + 0.05) entry.sprite.setFlipX(false);
			}
		}
	}

	#applyClientLook(sprite: Phaser.Physics.Arcade.Sprite): void {
		const look = clientLookForTier(this.#snapshot?.client?.tier ?? 'walk-in');
		const key = look.spriteKey && this.textures.exists(look.spriteKey) ? look.spriteKey : 'clients';
		if (sprite.texture.key !== key) {
			sprite.setTexture(key, look.frame);
		} else {
			sprite.setFrame(look.frame);
		}
		if (look.tint === null) {
			sprite.clearTint();
		} else {
			sprite.setTint(look.tint);
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

	#syncDomInputFocus(): void {
		const focused = this.game.registry.get(STUDIO_DOM_EDITABLE_FOCUSED_KEY) === true;
		if (focused === this.#domEditableFocused) return;
		this.#domEditableFocused = focused;
		applyDomEditableKeyboardGate(this.input.keyboard, focused);
		if (focused) {
			this.#player.setVelocity(0, 0);
		}
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
		if (!this.#domEditableFocused) {
			if (this.#cursors?.left.isDown || this.#wasd?.A.isDown) vx -= 1;
			if (this.#cursors?.right.isDown || this.#wasd?.D.isDown) vx += 1;
			if (this.#cursors?.up.isDown || this.#wasd?.W.isDown) vy -= 1;
			if (this.#cursors?.down.isDown || this.#wasd?.S.isDown) vy += 1;
		}
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
		const desk = this.#deskWorldPos();
		this.#player.setPosition(desk.x, desk.y);
	}

	#deskWorldPos(): { x: number; y: number } {
		const desk = this.#nearestDeskTile();
		return {
			x: desk.tx * TILE_SIZE + TILE_SIZE / 2,
			y: desk.ty * TILE_SIZE + TILE_SIZE / 2
		};
	}

	#nearestDeskTile(): TileMarker {
		const desks = roomDesks(this.#room);
		const player = this.#player;
		if (!player) return desks[0] ?? this.#room.desk;
		let best = desks[0] ?? this.#room.desk;
		let bestDist = Number.POSITIVE_INFINITY;
		for (const desk of desks) {
			const x = desk.tx * TILE_SIZE + TILE_SIZE / 2;
			const y = desk.ty * TILE_SIZE + TILE_SIZE / 2;
			const dist = Phaser.Math.Distance.Between(player.x, player.y, x, y);
			if (dist < bestDist) {
				best = desk;
				bestDist = dist;
			}
		}
		return best;
	}

	#ensureVfxTextures(): void {
		if (this.textures.exists('vfx-dot')) return;
		this.textures.generate('vfx-dot', {
			data: ['1'],
			pixelWidth: 3
		});
	}

	#createVfxEmitters(): void {
		if (this.#workEmitter) return;
		this.#ensureVfxTextures();
		const desk = this.#deskWorldPos();

		this.#workEmitter = this.add.particles(desk.x, desk.y - 6, 'vfx-dot', {
			speed: { min: 8, max: 22 },
			angle: { min: 250, max: 290 },
			scale: { start: 0.45, end: 0.12 },
			alpha: { start: 0.5, end: 0 },
			lifespan: { min: 400, max: 800 },
			frequency: WORK_PARTICLE_FREQUENCY_MS,
			quantity: 1,
			maxAliveParticles: WORK_PARTICLE_MAX,
			tint: [0xf5f0e6, 0xa8a29e],
			emitting: false
		});
		this.#workEmitter.setDepth(22);

		this.#cashEmitter = this.add.particles(desk.x, desk.y, 'vfx-dot', {
			speed: { min: 40, max: 95 },
			angle: { min: 0, max: 360 },
			scale: { start: 0.55, end: 0.1 },
			alpha: { start: 0.9, end: 0 },
			lifespan: CASH_BURST_LIFESPAN_MS,
			gravityY: 140,
			quantity: 0,
			emitting: false,
			tint: [0xf59e0b, 0xfbbf24, 0xf5f0e6]
		});
		this.#cashEmitter.setDepth(23);
	}

	#syncWorkParticles(): void {
		if (!this.#workEmitter) {
			this.#createVfxEmitters();
		}
		const work = this.#workEmitter;
		if (!work) return;
		const phase = this.#snapshot?.phase ?? 'idle';
		const reduced = this.#snapshot?.reducedVfx ?? false;
		if (shouldEmitWorkParticles(phase, reduced)) {
			const desk = this.#deskWorldPos();
			work.setPosition(desk.x, desk.y - 6);
			if (!work.emitting) {
				work.start();
			}
		} else {
			work.stop();
		}
	}

	#tryCashBurst(): void {
		const next = this.#snapshot?.phase ?? 'idle';
		const reduced = this.#snapshot?.reducedVfx ?? false;
		if (!shouldTriggerCashBurst(this.#prevPhase, next) || !shouldBurstCashConfetti(reduced)) {
			return;
		}
		if (!this.#cashEmitter) {
			this.#createVfxEmitters();
		}
		const cash = this.#cashEmitter;
		if (!cash) return;
		const desk = this.#deskWorldPos();
		const x = this.#player?.x ?? desk.x;
		const y = this.#player?.y ?? desk.y;
		cash.explode(clampCashBurstCount(CASH_BURST_COUNT), x, y);
	}

	#destroyVfx(): void {
		this.#workEmitter?.stop();
		this.#workEmitter?.destroy();
		this.#workEmitter = null;
		this.#cashEmitter?.stop();
		this.#cashEmitter?.destroy();
		this.#cashEmitter = null;
	}

	#hasMumResident(): boolean {
		return this.#room.residents.some((r) => r.clientName === 'Mum');
	}

	#onCommand(cmd: StudioInboundCommand): void {
		if (cmd.type === 'sync') {
			const prevVenue = this.#builtVenueId;
			this.#prevPhase = this.#snapshot?.phase ?? null;
			this.#snapshot = cmd.snapshot;
			if (cmd.snapshot.activeVenueId !== prevVenue) {
				this.#rebuildForVenue(cmd.snapshot.activeVenueId);
			} else {
				this.#rebuildEasels();
				this.#syncStaff();
				this.#syncCommissionChannel();
			}
			if (this.#client) {
				this.#applyClientLook(this.#client);
			}
			this.#syncWorkParticles();
			this.#tryCashBurst();
			this.#applyCameraFollow();
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
		const look = clientLookForTier(this.#snapshot?.client?.tier ?? 'walk-in');
		const { door, clientWait } = this.#room;
		this.#client = this.physics.add.sprite(
			door.tx * TILE_SIZE + TILE_SIZE / 2,
			door.ty * TILE_SIZE + TILE_SIZE / 2,
			'clients',
			look.frame
		);
		this.#client.setDepth(10);
		this.#applyClientLook(this.#client);
		this.#clientArrived = false;
		if (!look.spriteKey || look.spriteKey === 'clients') {
			this.#client.anims.play('client-walk', true);
		}

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
				// Face toward room center (spec 17 §6.3).
				const centerX = (this.#room.width * TILE_SIZE) / 2;
				this.#client.setFlipX(this.#client.x > centerX);
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
			view.stand?.destroy();
			view.art?.destroy();
		}
		this.#easels = [];
		this.#artLoadGeneration += 1;
		const loadGeneration = this.#artLoadGeneration;

		const venueId = this.#snapshot?.activeVenueId ?? this.#builtVenueId;
		const entries = this.#snapshot?.displayedEntries ?? [];
		const slots = slotsForVenue(venueId, this.#room);
		const keepKeys = new Set<string>();

		for (let i = 0; i < slots.length; i++) {
			const slot = slots[i]!;
			const x = slot.tx * TILE_SIZE + TILE_SIZE / 2;
			const y = slot.ty * TILE_SIZE + TILE_SIZE / 2;
			const standFrame = easelStandFrame(slot, this.#room);
			const stand =
				standFrame === null ? null : this.add.image(x, y, 'furniture', standFrame).setDepth(6);
			const entry = entries[i] ?? null;
			let art: Phaser.GameObjects.Image | null = null;
			if (entry && isSafeStudioImageUrl(entry.imageUrl)) {
				const key = `art-${entry.id}`;
				keepKeys.add(key);
				if (!this.textures.exists(key)) {
					this.load.image(key, entry.imageUrl);
					this.load.once(Phaser.Loader.Events.COMPLETE, () => {
						if (loadGeneration !== this.#artLoadGeneration) return;
						if (!this.textures.exists(key)) return;
						this.#artTextureKeys.add(key);
						const img = this.add
							.image(x, y - 2, key)
							.setDisplaySize(12, 12)
							.setDepth(7);
						const found = this.#easels.find((e) => e.entryId === entry.id);
						if (found) {
							found.art?.destroy();
							found.art = img;
						} else {
							img.destroy();
						}
					});
					this.load.start();
				} else {
					this.#artTextureKeys.add(key);
					art = this.add
						.image(x, y - 2, key)
						.setDisplaySize(12, 12)
						.setDepth(7);
				}
			}
			this.#easels.push({ slot, stand, art, entryId: entry?.id ?? null });
		}

		for (const key of [...this.#artTextureKeys]) {
			if (keepKeys.has(key)) continue;
			if (this.textures.exists(key)) {
				this.textures.remove(key);
			}
			this.#artTextureKeys.delete(key);
		}
	}

	#commissionNpc(): Phaser.Physics.Arcade.Sprite | null {
		if (this.#mumIsCommissionTarget() && this.#mum) return this.#mum;
		if (this.#client && this.#clientArrived) return this.#client;
		return null;
	}

	#nearestShowZone(): RoomZone | null {
		return this.#room.zones.find((z) => z.id === 'window' || z.id === 'gallery') ?? null;
	}

	#inZone(zone: RoomZone, px: number, py: number): boolean {
		const tx = Math.floor(px / TILE_SIZE);
		const ty = Math.floor(py / TILE_SIZE);
		return tx >= zone.x0 && tx <= zone.x1 && ty >= zone.y0 && ty <= zone.y1;
	}

	#nearestTarget():
		| { kind: 'talk' }
		| { kind: 'deliver' }
		| { kind: 'reception' }
		| { kind: 'desk' }
		| { kind: 'easel'; entryId: string }
		| { kind: 'look'; entryId: string | null; zoneId: RoomZone['id'] }
		| { kind: 'prop'; id: InteractableId }
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
			} else {
				const channel = this.#snapshot?.commissionChannel ?? 'none';
				if (
					channel === 'receptionist' &&
					this.#receptionist &&
					this.#snapshot?.receptionistVisible
				) {
					const d = Phaser.Math.Distance.Between(
						px,
						py,
						this.#receptionist.x,
						this.#receptionist.y
					);
					if (d < INTERACT_RANGE_PX) return { kind: 'reception' };
				} else if (channel === 'letterbox' || channel === 'computer') {
					const anchor = receptionistAnchor(this.#room);
					const ax = anchor.tx * TILE_SIZE + TILE_SIZE / 2;
					const ay = anchor.ty * TILE_SIZE + TILE_SIZE / 2;
					const d = Phaser.Math.Distance.Between(px, py, ax, ay);
					if (d < INTERACT_RANGE_PX) return { kind: 'reception' };
				}
			}
		}

		if (phase === 'critiquing') {
			const npc = this.#commissionNpc();
			if (npc) {
				const d = Phaser.Math.Distance.Between(px, py, npc.x, npc.y);
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

		const desk = this.#nearestDeskTile();
		const deskX = desk.tx * TILE_SIZE + TILE_SIZE / 2;
		const deskY = desk.ty * TILE_SIZE + TILE_SIZE / 2;
		if (
			(phase === 'briefing' || phase === 'idle') &&
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

		const propMarkers = this.#interactProps.map((p) => ({
			interactableId: p.id,
			tx: p.tx,
			ty: p.ty
		}));
		const nearest = nearestInteractable(px, py, propMarkers, TILE_SIZE);
		if (nearest) {
			return { kind: 'prop', id: nearest.interactableId };
		}

		return null;
	}

	#promptClientName(): string | null {
		const snap = this.#snapshot;
		if (!snap) return null;
		if (snap.residentClientArmed) return 'Mum';
		return snap.client?.clientName ?? null;
	}

	#interactPromptKind(target: {
		kind: 'talk' | 'deliver' | 'reception' | 'desk' | 'easel' | 'look' | 'prop';
		id?: InteractableId;
	}): InteractPromptInput {
		if (target.kind === 'prop') {
			if (target.id === 'fridge') {
				return {
					kind: 'fridge',
					registryLabel: this.#fridgeOpen ? FRIDGE.promptLabelOpen : FRIDGE.promptLabelClosed
				};
			}
			if (target.id === 'toolkit-shelf') {
				return { kind: 'toolkit', registryLabel: TOOLKIT_SHELF.promptLabel };
			}
			return { kind: 'prop' };
		}
		if (target.kind === 'talk' || target.kind === 'deliver') {
			return { kind: target.kind, clientName: this.#promptClientName() };
		}
		if (target.kind === 'reception') {
			const channel = this.#snapshot?.commissionChannel ?? 'none';
			if (channel === 'letterbox') {
				return { kind: 'mail', registryLabel: 'Check letterbox' };
			}
			if (channel === 'computer') {
				return { kind: 'prop', registryLabel: 'Open inbox' };
			}
			return { kind: 'reception' };
		}
		if (target.kind === 'desk') {
			return { kind: 'desk', deskIsPractice: this.#snapshot?.phase === 'idle' };
		}
		return { kind: target.kind };
	}

	#updateInteractPrompt(): void {
		const target = this.#nearestTarget();
		if (!target) {
			this.#prompt.setVisible(false);
			this.#promptLabel.setVisible(false);
			return;
		}
		let x = this.#player.x;
		let y = this.#player.y - 18;
		const npc = this.#commissionNpc();
		if ((target.kind === 'talk' || target.kind === 'deliver') && npc) {
			x = npc.x;
			y = npc.y - 18;
		}
		if (target.kind === 'reception') {
			if (this.#receptionist && this.#snapshot?.receptionistVisible) {
				x = this.#receptionist.x;
				y = this.#receptionist.y - 18;
			} else {
				const anchor = receptionistAnchor(this.#room);
				x = anchor.tx * TILE_SIZE + TILE_SIZE / 2;
				y = anchor.ty * TILE_SIZE + TILE_SIZE / 2 - 18;
			}
		}
		if (target.kind === 'prop') {
			const prop = this.#interactProps.find((p) => p.id === target.id);
			if (prop) {
				x = prop.sprite.x;
				y = prop.sprite.y - 12;
			}
		}
		const label = interactPromptLabel(this.#interactPromptKind(target));
		this.#prompt.setVisible(false);
		this.#promptLabel.setText(label).setPosition(x, y).setVisible(true);
	}

	#readyForCommission(): boolean {
		const snap = this.#snapshot;
		return Boolean(snap?.residentClientArmed) || Boolean(this.#client && this.#clientArrived);
	}

	#promptOnKinds(kinds: ReadonlySet<string>): boolean {
		if (!this.#promptLabel?.visible) return false;
		const target = this.#nearestTarget();
		return target != null && kinds.has(target.kind);
	}

	/** World position for the spec-29 `!` mark, or null when there is no host sprite. */
	#attentionHost(): { x: number; y: number; promptOnNpc: boolean } | null {
		const snap = this.#snapshot;
		if (!snap) return null;
		if (this.#mumIsCommissionTarget() && this.#mum) {
			return {
				x: this.#mum.x,
				y: this.#mum.y,
				promptOnNpc: this.#promptOnKinds(TALK_OR_DELIVER)
			};
		}
		if (this.#client && this.#clientArrived) {
			return {
				x: this.#client.x,
				y: this.#client.y,
				promptOnNpc: this.#promptOnKinds(TALK_OR_DELIVER)
			};
		}
		if (this.#receptionist && snap.receptionistVisible) {
			return {
				x: this.#receptionist.x,
				y: this.#receptionist.y,
				promptOnNpc: this.#promptOnKinds(RECEPTION_KIND)
			};
		}
		const channel = snap.commissionChannel ?? 'none';
		if ((channel === 'letterbox' || channel === 'computer') && this.#readyForCommission()) {
			const anchor = receptionistAnchor(this.#room);
			return {
				x: anchor.tx * TILE_SIZE + TILE_SIZE / 2,
				y: anchor.ty * TILE_SIZE + TILE_SIZE / 2,
				promptOnNpc: this.#promptOnKinds(RECEPTION_KIND)
			};
		}
		return null;
	}

	#updateAttentionMark(): void {
		if (!this.#attentionMark) return;
		const snap = this.#snapshot;
		const attention = npcAttention({
			phase: snap?.phase ?? 'idle',
			modelLoading: snap?.modelLoading === true,
			readyForCommission: this.#readyForCommission()
		});
		const host = this.#attentionHost();
		const show = host != null && showAttentionMark(attention, host.promptOnNpc);
		if (!show || !host) {
			this.#attentionMark.setVisible(false);
			return;
		}
		this.#attentionMark.setPosition(host.x, host.y - 22).setVisible(true);
	}

	#consumeInteract(): boolean {
		const just =
			!this.#domEditableFocused && this.#interactKey
				? Phaser.Input.Keyboard.JustDown(this.#interactKey)
				: false;
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
		if (target.kind === 'reception') {
			this.#bridge.emit({ type: 'open-reception' });
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
		if (target.kind === 'prop') {
			if (target.id === 'fridge') {
				this.#setFridgeOpen(!this.#fridgeOpen, !this.#fridgeOpen);
				return;
			}
			if (target.id === 'toolkit-shelf') {
				this.#bridge.emit({ type: 'open-shop', shop: 'toolkit' });
				return;
			}
			return;
		}
		this.#bridge.emit({ type: 'open-gallery-entry', entryId: target.entryId });
	}

	/** Spec 21e — registry callback set by StudioFloor after createPhaserGame. */
	#barkAnnounceHandler(): BarkAnnounceHandler | null {
		return (this.game.registry.get('onBark') as BarkAnnounceHandler | undefined) ?? null;
	}

	#spriteForSpeaker(speaker: BarkSpeakerId): Phaser.GameObjects.Sprite | null {
		if (speaker === 'mum') return this.#mum;
		if (speaker === 'visitor') return null;
		return this.#staff.get(speaker)?.sprite ?? null;
	}

	#promptVisibleOnSpeaker(speaker: BarkSpeakerId): boolean {
		if (!this.#promptLabel?.visible) return false;
		const target = this.#nearestTarget();
		if (!target || (target.kind !== 'talk' && target.kind !== 'deliver')) return false;
		const npc = this.#commissionNpc();
		if (!npc) return false;
		const sprite = this.#spriteForSpeaker(speaker);
		return sprite != null && sprite === npc;
	}

	#updateBarks(): void {
		const phase = this.#snapshot?.phase ?? 'idle';
		if (!barksAllowedForPhase(phase)) {
			this.#hideBark(true);
			this.#nextBarkAt = null;
			return;
		}

		if (this.#barkText?.visible && this.#barkSpeakerSprite) {
			this.#barkText.setPosition(
				this.#barkSpeakerSprite.x,
				this.#barkSpeakerSprite.y - BARK_OFFSET_Y
			);
			// Hide-while-prompt: never cover the E interact label on that NPC.
			for (const speaker of ['mum', 'apprentice', 'curator', 'marketing-director'] as const) {
				if (
					this.#spriteForSpeaker(speaker) === this.#barkSpeakerSprite &&
					this.#promptVisibleOnSpeaker(speaker)
				) {
					this.#hideBark(true);
					break;
				}
			}
		}

		const now = this.time.now;
		if (this.#barkExpiresAt != null && now >= this.#barkExpiresAt) {
			this.#hideBark(true);
		}

		if (this.#nextBarkAt == null) {
			this.#nextBarkAt = now + nextBarkDelayMs(DEFAULT_BARK_SCHEDULE);
		}

		if (this.#barkText?.visible) return;
		if (now < this.#nextBarkAt) return;

		this.#tryShowBark();
	}

	#tryShowBark(): void {
		const phase = this.#snapshot?.phase ?? 'idle';
		const presentStaffIds = [...this.#staff.keys()];
		const eligible = eligibleBarkSpeakers({
			hasMum: this.#mum != null,
			hiredRoleIds: this.#snapshot?.hiredRoleIds ?? [],
			presentStaffIds
		});
		const pick = pickBark({
			eligibleSpeakers: eligible,
			lastBarkId: this.#lastBarkId
		});
		if (!pick) {
			this.#nextBarkAt = this.time.now + nextBarkDelayMs(DEFAULT_BARK_SCHEDULE);
			return;
		}

		const sprite = this.#spriteForSpeaker(pick.speaker);
		if (!sprite) {
			this.#nextBarkAt = this.time.now + nextBarkDelayMs(DEFAULT_BARK_SCHEDULE);
			return;
		}

		const promptVisible = this.#promptVisibleOnSpeaker(pick.speaker);
		if (!shouldShowBark({ phase, promptVisible })) {
			this.#nextBarkAt = this.time.now + BARK_PROMPT_RETRY_MS;
			return;
		}

		this.#showBark(pick.speaker, pick.line.text, sprite, pick.line.cueId);
		this.#lastBarkId = pick.line.id;
		this.#nextBarkAt = this.time.now + nextBarkDelayMs(DEFAULT_BARK_SCHEDULE);
	}

	#showBark(
		speaker: BarkSpeakerId,
		text: string,
		sprite: Phaser.GameObjects.Sprite,
		cueId?: string
	): void {
		this.#hideBark(false);
		const reduced = this.#snapshot?.reducedVfx ?? false;
		const label = barkSpeakerLabel(speaker);

		if (!this.#barkText) {
			this.#barkText = this.add
				.text(0, 0, '', {
					fontFamily: 'monospace',
					fontSize: '8px',
					color: '#1c1917',
					backgroundColor: '#fafaf9',
					padding: { x: 3, y: 2 },
					align: 'center'
				})
				.setOrigin(0.5, 1)
				.setDepth(BARK_DEPTH)
				.setVisible(false);
		}

		this.#barkSpeakerSprite = sprite;
		this.#barkText
			.setText(text)
			.setPosition(sprite.x, sprite.y - BARK_OFFSET_Y)
			.setVisible(true);

		if (reduced) {
			this.#barkText.setAlpha(1);
		} else {
			this.#barkText.setAlpha(0);
			this.tweens.add({
				targets: this.#barkText,
				alpha: 1,
				duration: BARK_FADE_MS
			});
		}

		this.#barkExpiresAt = this.time.now + barkLifetimeMs(reduced);

		this.#barkAnnounceHandler()?.({
			speakerId: speaker,
			speakerLabel: label,
			text,
			...(cueId ? { cueId } : {})
		});
	}

	#hideBark(clearLive: boolean): void {
		if (this.#barkText) {
			this.tweens.killTweensOf(this.#barkText);
			this.#barkText.setVisible(false).setAlpha(1).setText('');
		}
		this.#barkSpeakerSprite = null;
		this.#barkExpiresAt = null;
		if (clearLive) {
			this.#barkAnnounceHandler()?.(null);
		}
	}
}
