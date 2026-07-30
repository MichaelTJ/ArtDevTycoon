import { canUnlockMediumTier, DEFAULT_MEDIUM_TIER_ID, getMediumTier } from '$lib/data/mediumTiers';
import { pickBrief } from '$lib/data/briefs';
import { getAtmosphereItem, totalAtmosphereBonus } from '$lib/data/galleryAtmosphere';
import {
	DEFAULT_LAYOUT_ID,
	GALLERY_LAYOUTS,
	canUnlockLayout,
	getLayout
} from '$lib/data/galleryLayouts';
import {
	DEFAULT_VENUE_ID,
	GALLERY_VENUES,
	canUnlockVenue,
	getVenue
} from '$lib/data/galleryVenues';
import { EngineError } from '$lib/engines/errors';
import type { EngineManager } from '$lib/engines/manager';
import { buildPrompt } from '$lib/game/promptPipeline';
import {
	calculatePayout,
	clearSave as defaultClearSave,
	createDefaultSave,
	isLevelComplete,
	levelProgress,
	loadSave as defaultLoadSave,
	persistSave as defaultPersistSave,
	reputationGain,
	scorePrompt,
	toGalleryScore,
	type SaveData
} from '$lib/game';
import {
	LEVEL_1,
	critiqueSchema,
	type Artwork,
	type ClientBrief,
	type Critique,
	type GalleryEntry,
	type GamePhase
} from '$lib/types/contracts';
import { engines } from './engineStore.svelte';

export interface GameStoreDeps {
	engine?: Pick<EngineManager, 'generate' | 'critique'>;
	setSwitchingLocked?: (locked: boolean) => void;
	random?: () => number;
	now?: () => number;
	loadSave?: (startingCash: number, now?: () => number) => SaveData;
	persistSave?: (data: SaveData) => void;
	clearSave?: () => void;
}

/** Drives the Level 1 commission loop and gallery state. */
export class GameStore {
	phase = $state<GamePhase>('idle');
	cash = $state<number>(LEVEL_1.startingCash);
	reputation = $state(0);
	commissionsCompleted = $state(0);
	currentClient = $state<ClientBrief | null>(null);
	currentArtwork = $state<Artwork | null>(null);
	currentCritique = $state<Critique | null>(null);
	errorMessage = $state<string | null>(null);
	galleryHistory = $state<GalleryEntry[]>([]);
	draftPrompt = $state('');
	generationProgress = $state<number | null>(null);
	unlockedMediumTierIds = $state<string[]>([DEFAULT_MEDIUM_TIER_ID]);
	activeMediumTierId = $state(DEFAULT_MEDIUM_TIER_ID);

	unlockedVenueId = $state(DEFAULT_VENUE_ID);
	unlockedLayoutIds = $state<string[]>([DEFAULT_LAYOUT_ID]);
	activeLayoutId = $state(DEFAULT_LAYOUT_ID);
	ownedAtmosphereIds = $state<string[]>([]);

	progress = $derived(
		levelProgress({ cash: this.cash, commissionsCompleted: this.commissionsCompleted })
	);

	activeMediumTier = $derived(getMediumTier(this.activeMediumTierId));

	venue = $derived(getVenue(this.unlockedVenueId));

	/** Capacity-capped, most-recent-first slice for the wall. `galleryHistory` stays full. */
	displayedGalleryEntries = $derived(
		[...this.galleryHistory]
			.sort((a, b) => b.completedAt - a.completedAt)
			.slice(0, this.venue.capacity)
	);

	/**
	 * Single progression multiplier passed to `calculatePayout`. Composes
	 * medium × layout × (1 + atmosphere). Specs 13/16 must multiply into this seat,
	 * not call `calculatePayout` with a parallel factor.
	 */
	presentationMultiplier = $derived(
		this.activeMediumTier.payoutMultiplier *
			getLayout(this.activeLayoutId).curationMultiplier *
			(1 + totalAtmosphereBonus(this.ownedAtmosphereIds))
	);

	readonly #engine: Pick<EngineManager, 'generate' | 'critique'>;
	readonly #setSwitchingLocked: (locked: boolean) => void;
	readonly #random: () => number;
	readonly #now: () => number;
	readonly #loadSave: (startingCash: number, now?: () => number) => SaveData;
	readonly #persistSave: (data: SaveData) => void;
	readonly #clearSave: () => void;

	constructor(deps?: GameStoreDeps) {
		this.#engine = deps?.engine ?? engines.manager;
		this.#setSwitchingLocked = deps?.setSwitchingLocked ?? engines.setSwitchingLocked.bind(engines);
		this.#random = deps?.random ?? Math.random;
		this.#now = deps?.now ?? Date.now;
		this.#loadSave = deps?.loadSave ?? defaultLoadSave;
		this.#persistSave = deps?.persistSave ?? defaultPersistSave;
		this.#clearSave = deps?.clearSave ?? defaultClearSave;

		const save = this.#loadSave(LEVEL_1.startingCash, this.#now);
		this.cash = save.cash;
		this.reputation = save.reputation;
		this.commissionsCompleted = save.lifetimeCommissions;
		this.galleryHistory = [...save.galleryHistory];
		this.unlockedMediumTierIds = [...save.unlockedMediumTierIds];
		this.activeMediumTierId = save.activeMediumTierId;
		this.unlockedVenueId = save.unlockedVenueId;
		this.unlockedLayoutIds = [...save.unlockedLayoutIds];
		this.activeLayoutId = save.activeLayoutId;
		this.ownedAtmosphereIds = [...save.ownedAtmosphereIds];
	}

	inviteClient(): void {
		if (this.phase !== 'idle') {
			return;
		}

		this.currentClient = pickBrief({
			excludeIds: this.galleryHistory.map((entry) => entry.briefId),
			random: this.#random
		});
		this.currentArtwork = null;
		this.currentCritique = null;
		this.errorMessage = null;
		this.draftPrompt = '';
		this.phase = 'briefing';
	}

	async createArt(): Promise<void> {
		if (this.phase !== 'briefing' || !this.currentClient || this.draftPrompt.trim().length === 0) {
			return;
		}

		const client = this.currentClient;
		const playerPrompt = this.draftPrompt.trim();
		const builtPrompt = buildPrompt(playerPrompt, this.activeMediumTier);

		this.phase = 'generating';
		this.errorMessage = null;
		this.generationProgress = null;
		this.#setSwitchingLocked(true);

		// Yield so the UI can paint the generating state before instant mock work finishes.
		await new Promise<void>((resolve) => setTimeout(resolve, 0));

		try {
			const artwork = await this.#engine.generate({ playerPrompt, prompt: builtPrompt });
			this.currentArtwork = artwork;
			this.phase = 'critiquing';

			// Let the player see the finished piece before the (often slow) critique begins.
			await new Promise<void>((resolve) => setTimeout(resolve, 0));

			const draft = await this.#engine.critique({
				brief: client,
				playerPrompt,
				artwork
			});

			const { creativityScore } = scorePrompt(client, playerPrompt);
			const finalPayout = calculatePayout(
				client,
				draft.accuracyScore,
				creativityScore,
				this.presentationMultiplier
			);
			const critique = critiqueSchema.parse({
				title: draft.title,
				accuracyScore: draft.accuracyScore,
				criticReview: draft.criticReview,
				creativityScore,
				finalPayout
			});

			this.currentCritique = critique;
			this.phase = 'results';
		} catch (error) {
			this.errorMessage =
				error instanceof EngineError
					? error.message
					: 'Something went wrong creating your art. Please try again.';
			this.phase = 'failed';
		} finally {
			this.#setSwitchingLocked(false);
		}
	}

	/**
	 * Permanently unlock a medium tier for cash + reputation. Newly unlocked tiers become
	 * active immediately. Returns false when already owned or the player cannot afford it.
	 */
	unlockMediumTier(id: string): boolean {
		const tier = getMediumTier(id);
		if (this.unlockedMediumTierIds.includes(id)) return false;
		if (!canUnlockMediumTier(tier, { cash: this.cash, reputation: this.reputation })) {
			return false;
		}
		this.cash -= tier.unlockCost;
		this.unlockedMediumTierIds = [...this.unlockedMediumTierIds, id];
		this.activeMediumTierId = id;
		this.#persist();
		return true;
	}

	/** Switch the active medium among already-unlocked tiers. Free; no-ops if locked. */
	setActiveMediumTier(id: string): void {
		if (!this.unlockedMediumTierIds.includes(id)) return;
		this.activeMediumTierId = id;
		this.#persist();
	}

	collectCash(): void {
		if (
			this.phase !== 'results' ||
			!this.currentArtwork ||
			!this.currentCritique ||
			!this.currentClient
		) {
			return;
		}

		const artwork = this.currentArtwork;
		const critique = this.currentCritique;
		const client = this.currentClient;

		this.cash += critique.finalPayout;
		this.reputation += reputationGain(critique.accuracyScore, critique.creativityScore);
		this.commissionsCompleted += 1;

		const entry: GalleryEntry = {
			id: artwork.id,
			imageUrl: artwork.imageUrl,
			title: critique.title,
			payout: critique.finalPayout,
			score: toGalleryScore(critique.accuracyScore, critique.creativityScore),
			clientName: client.clientName,
			briefId: client.id,
			completedAt: this.#now()
		};

		this.galleryHistory = [entry, ...this.galleryHistory];
		this.currentArtwork = null;
		this.currentCritique = null;
		this.currentClient = null;

		this.phase = isLevelComplete({
			cash: this.cash,
			commissionsCompleted: this.commissionsCompleted
		})
			? 'levelComplete'
			: 'idle';

		this.#persist();
	}

	/**
	 * Venues are linear — only the next tier after the current unlocked venue can be bought.
	 */
	unlockVenue(id: string): boolean {
		const targetIndex = GALLERY_VENUES.findIndex((v) => v.id === id);
		if (targetIndex < 0) return false;

		const currentIndex = GALLERY_VENUES.findIndex((v) => v.id === this.unlockedVenueId);
		if (targetIndex !== currentIndex + 1) return false;

		const venue = GALLERY_VENUES[targetIndex];
		if (!canUnlockVenue(venue, { cash: this.cash, reputation: this.reputation })) {
			return false;
		}

		this.cash -= venue.unlockCost;
		this.unlockedVenueId = id;
		this.#persist();
		return true;
	}

	unlockLayout(id: string): boolean {
		const layout = GALLERY_LAYOUTS.find((l) => l.id === id);
		if (!layout) return false;
		if (this.unlockedLayoutIds.includes(id)) return false;
		if (!canUnlockLayout(layout, this.cash)) return false;

		this.cash -= layout.unlockCost;
		this.unlockedLayoutIds = [...this.unlockedLayoutIds, id];
		this.activeLayoutId = id;
		this.#persist();
		return true;
	}

	setActiveLayout(id: string): void {
		if (!this.unlockedLayoutIds.includes(id)) return;
		this.activeLayoutId = id;
		this.#persist();
	}

	buyAtmosphereItem(id: string): boolean {
		const item = getAtmosphereItem(id);
		if (!item) return false;
		if (this.ownedAtmosphereIds.includes(id)) return false;
		if (this.cash < item.cost) return false;

		this.cash -= item.cost;
		this.ownedAtmosphereIds = [...this.ownedAtmosphereIds, id];
		this.#persist();
		return true;
	}

	retry(): void {
		if (this.phase !== 'failed') {
			return;
		}
		this.errorMessage = null;
		this.phase = 'briefing';
	}

	dismissError(): void {
		if (this.phase !== 'failed') {
			return;
		}
		this.errorMessage = null;
		this.phase = 'briefing';
	}

	reset(): void {
		this.#clearSave();
		this.phase = 'idle';
		this.cash = LEVEL_1.startingCash;
		this.reputation = 0;
		this.commissionsCompleted = 0;
		this.currentClient = null;
		this.currentArtwork = null;
		this.currentCritique = null;
		this.errorMessage = null;
		this.galleryHistory = [];
		this.draftPrompt = '';
		this.generationProgress = null;
		this.unlockedMediumTierIds = [DEFAULT_MEDIUM_TIER_ID];
		this.activeMediumTierId = DEFAULT_MEDIUM_TIER_ID;
		this.unlockedVenueId = DEFAULT_VENUE_ID;
		this.unlockedLayoutIds = [DEFAULT_LAYOUT_ID];
		this.activeLayoutId = DEFAULT_LAYOUT_ID;
		this.ownedAtmosphereIds = [];
	}

	/**
	 * One writer for the whole progression blob. Specs 13–16 extend this method rather
	 * than adding parallel save calls — only banked progress goes here, never the live
	 * commission.
	 */
	#persist(): void {
		const data = createDefaultSave(this.cash, this.#now);
		data.cash = this.cash;
		data.reputation = this.reputation;
		data.lifetimeCommissions = this.commissionsCompleted;
		data.galleryHistory = [...this.galleryHistory];
		data.unlockedMediumTierIds = [...this.unlockedMediumTierIds];
		data.activeMediumTierId = this.activeMediumTierId;
		data.unlockedVenueId = this.unlockedVenueId;
		data.unlockedLayoutIds = [...this.unlockedLayoutIds];
		data.activeLayoutId = this.activeLayoutId;
		data.ownedAtmosphereIds = [...this.ownedAtmosphereIds];
		this.#persistSave(data);
	}
}

/** The single game store instance the screen binds to. */
export const game = new GameStore();
