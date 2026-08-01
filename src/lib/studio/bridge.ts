import type { ClientBrief, GalleryEntry, GamePhase } from '$lib/types/contracts';
import type { InteractableId, StudioShopId } from './interactables';
import type { RoomZoneId } from './rooms';

export type { StudioShopId };

export type StudioOutboundEvent =
	| { type: 'ready' }
	| { type: 'talk-to-client' }
	/** Player hands over the finished piece in the `results` phase. */
	| { type: 'deliver-to-client' }
	| { type: 'open-gallery-entry'; entryId: string }
	| { type: 'interact-desk' }
	| { type: 'inspect-zone'; zoneId: RoomZoneId }
	/** Spec 21b — Svelte opens the matching shop modal. */
	| { type: 'open-shop'; shop: StudioShopId }
	/**
	 * Spec 21b — short flavour line (fridge, later props).
	 * +page MAY show a toast; MAY no-op if Phaser already drew a bark.
	 */
	| { type: 'prop-bark'; propId: InteractableId; text: string };

export type StudioInboundCommand =
	| { type: 'sync'; snapshot: StudioSnapshot }
	| { type: 'summon-client' }
	| { type: 'dismiss-client' }
	/** Door visitor for non-Mum briefs while Mum remains in the kitchen. */
	| { type: 'spawn-visitor' };

export interface StudioSnapshot {
	phase: GamePhase;
	/**
	 * Active brief target. `tier` is required when client is non-null so door
	 * visitors can pick a look (A3). Use 'walk-in' when the store brief omits it.
	 */
	client:
		| (Pick<ClientBrief, 'id' | 'clientName' | 'avatarUrl'> & {
				tier: string;
		  })
		| null;
	/** Pieces currently on display (same list as FridgeGallery). */
	displayedEntries: GalleryEntry[];
	activeVenueId: string;
	/** True when Marketing Director (or future staff) will auto-summon. */
	autoInviteArmed: boolean;
	/**
	 * Expected generate+critique duration for the desk progress bar — usually the
	 * previous commission's wall time (or a default on the first job).
	 */
	estimatedWorkMs: number;
	/** Wall-clock start of the current generate+critique; null when not working. */
	workStartedAt: number | null;
	/**
	 * When true, the next talk target is the resident whose clientName will match
	 * the brief (Mum). Set by +page when arming a kitchen commission without a
	 * door visitor. Phaser shows “E — Talk” on Mum.
	 */
	residentClientArmed: boolean;
	/**
	 * Hired staff role ids from GameStore.hiredStaffIds (spec 16).
	 * Phaser shows floor NPCs for a subset (§5). Default [].
	 */
	hiredRoleIds: readonly string[];
}

export type StudioListener = (event: StudioOutboundEvent) => void;

/**
 * Typed seam between Svelte (`+page`) and Phaser (`StudioScene`).
 * Domain rules never live here — only intents and presentation snapshots.
 */
export class StudioBridge {
	#listeners = new Set<StudioListener>();
	#commandHandler: ((cmd: StudioInboundCommand) => void) | null = null;
	lastSnapshot: StudioSnapshot | null = null;

	subscribe(listener: StudioListener): () => void {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}

	/** Phaser registers this once in StudioScene.create. */
	setCommandHandler(handler: ((cmd: StudioInboundCommand) => void) | null): void {
		this.#commandHandler = handler;
		if (handler && this.lastSnapshot) {
			handler({ type: 'sync', snapshot: this.lastSnapshot });
		}
	}

	emit(event: StudioOutboundEvent): void {
		for (const listener of this.#listeners) {
			listener(event);
		}
	}

	send(cmd: StudioInboundCommand): void {
		if (cmd.type === 'sync') {
			this.lastSnapshot = cmd.snapshot;
		}
		this.#commandHandler?.(cmd);
	}

	/** Convenience: send({ type: 'sync', snapshot }). */
	sync(snapshot: StudioSnapshot): void {
		this.send({ type: 'sync', snapshot });
	}
}
