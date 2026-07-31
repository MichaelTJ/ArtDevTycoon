import { unlockedClientTiers } from '$lib/data/clientTiers';
import { CORPORATE_BRIEFS } from '$lib/data/corporateBriefs';
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
import { canHireStaff, getStaffRole, totalIncomePerSecond } from '$lib/data/staffRoles';
import { EngineError } from '$lib/engines/errors';
import type { EngineManager } from '$lib/engines/manager';
import { buildPrompt } from '$lib/game/promptPipeline';
import {
	calculatePayout,
	clearSave as defaultClearSave,
	createDefaultSave,
	ensureDurableImageUrl,
	isLevelComplete,
	levelProgress,
	loadSave as defaultLoadSave,
	persistSave as defaultPersistSave,
	reputationGain,
	scorePrompt,
	toGalleryScore,
	type SaveData
} from '$lib/game';
import { resolveAuction, type AuctionResult } from '$lib/game/auction';
import { BASE_AUTO_INVITE_DELAY_MS, computeIdleEarnings } from '$lib/game/idleIncome';
import {
	checkPaletteUsage,
	fullyCompletedSeriesIds,
	seriesCompletionBonus
} from '$lib/game/paletteSeries';
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
	/** Injectable so auction payout tests stay deterministic. */
	resolveAuction?: typeof resolveAuction;
	/** Interval for passive income ticks; override in tests for faster accrual. */
	tickIntervalMs?: number;
}

function briefTier(brief: ClientBrief) {
	return brief.tier ?? 'walk-in';
}

/** Drives the Level 1 commission loop and gallery state. */
export class GameStore {
	phase = $state<GamePhase>('idle');
	cash = $state<number>(LEVEL_1.startingCash);
	reputation = $state(0);
	commissionsCompleted = $state(0);
	currentClient = $state<ClientBrief | null>(null);
	/** Populated only in the `results` phase. */
	currentArtwork = $state<Artwork | null>(null);
	currentCritique = $state<Critique | null>(null);
	/** Set when the current results payout came from an auction. */
	currentAuctionResult = $state<AuctionResult | null>(null);
	/** Player-facing message for the `failed` phase. */
	errorMessage = $state<string | null>(null);
	galleryHistory = $state<GalleryEntry[]>([]);
	/** Corporate seriesId → on-brand flags for pieces collected so far. */
	seriesOnBrandFlags = $state<Record<string, boolean[]>>({});
	draftPrompt = $state('');
	generationProgress = $state<number | null>(null);
	unlockedMediumTierIds = $state<string[]>([DEFAULT_MEDIUM_TIER_ID]);
	activeMediumTierId = $state(DEFAULT_MEDIUM_TIER_ID);

	unlockedVenueId = $state(DEFAULT_VENUE_ID);
	unlockedLayoutIds = $state<string[]>([DEFAULT_LAYOUT_ID]);
	activeLayoutId = $state(DEFAULT_LAYOUT_ID);
	ownedAtmosphereIds = $state<string[]>([]);

	hiredStaffIds = $state<string[]>([]);
	lastIncomeTickAt = $state<number>(0);
	/** Set once on catch-up from `startIncomeTicker`; null means the modal stays hidden. */
	idleEarningsToShow = $state<number | null>(null);

	progress = $derived(
		levelProgress({ cash: this.cash, commissionsCompleted: this.commissionsCompleted })
	);

	activeMediumTier = $derived(getMediumTier(this.activeMediumTierId));

	venue = $derived(getVenue(this.unlockedVenueId));

	incomePerSecond = $derived(totalIncomePerSecond(this.hiredStaffIds));

	/**
	 * Best owned layout when a Curator is hired; otherwise the player's manual selection.
	 * Does not mutate `activeLayoutId` so firing (future) restores the player's choice.
	 */
	effectiveLayoutId = $derived.by(() => {
		const curates = this.hiredStaffIds.some((id) => getStaffRole(id)?.autoCurates);
		if (!curates) return this.activeLayoutId;
		const owned = GALLERY_LAYOUTS.filter((l) => this.unlockedLayoutIds.includes(l.id)).sort(
			(a, b) => b.curationMultiplier - a.curationMultiplier
		);
		return owned[0]?.id ?? this.activeLayoutId;
	});

	/** Capacity-capped gallery wall. Curator sorts by score; otherwise by recency. */
	displayedGalleryEntries = $derived.by(() => {
		const curates = this.hiredStaffIds.some((id) => getStaffRole(id)?.autoCurates);
		const sorted = curates
			? [...this.galleryHistory].sort((a, b) => b.score - a.score)
			: [...this.galleryHistory].sort((a, b) => b.completedAt - a.completedAt);
		return sorted.slice(0, this.venue.capacity);
	});

	/**
	 * Single progression multiplier passed to `calculatePayout`. Composes
	 * medium × layout × (1 + atmosphere). Specs 13/16 must multiply into this seat,
	 * not call `calculatePayout` with a parallel factor.
	 */
	presentationMultiplier = $derived(
		this.activeMediumTier.payoutMultiplier *
			getLayout(this.effectiveLayoutId).curationMultiplier *
			(1 + totalAtmosphereBonus(this.ownedAtmosphereIds))
	);

	readonly #engine: Pick<EngineManager, 'generate' | 'critique'>;
	readonly #setSwitchingLocked: (locked: boolean) => void;
	readonly #random: () => number;
	readonly #now: () => number;
	readonly #loadSave: (startingCash: number, now?: () => number) => SaveData;
	readonly #persistSave: (data: SaveData) => void;
	readonly #clearSave: () => void;
	readonly #resolveAuction: typeof resolveAuction;
	readonly #tickIntervalMs: number;

	#autoInviteTimer: ReturnType<typeof setTimeout> | null = null;
	#incomeTicker: ReturnType<typeof setInterval> | null = null;
	/** Prevents a double-click from banking the same commission twice while durableizing. */
	#collectingCash = false;

	constructor(deps?: GameStoreDeps) {
		this.#engine = deps?.engine ?? engines.manager;
		this.#setSwitchingLocked = deps?.setSwitchingLocked ?? engines.setSwitchingLocked.bind(engines);
		this.#random = deps?.random ?? Math.random;
		this.#now = deps?.now ?? Date.now;
		this.#loadSave = deps?.loadSave ?? defaultLoadSave;
		this.#persistSave = deps?.persistSave ?? defaultPersistSave;
		this.#clearSave = deps?.clearSave ?? defaultClearSave;
		this.#resolveAuction = deps?.resolveAuction ?? resolveAuction;
		this.#tickIntervalMs = deps?.tickIntervalMs ?? 1000;

		const save = this.#loadSave(LEVEL_1.startingCash, this.#now);
		this.cash = save.cash;
		this.reputation = save.reputation;
		this.commissionsCompleted = save.lifetimeCommissions;
		this.galleryHistory = [...save.galleryHistory];
		this.seriesOnBrandFlags = { ...save.seriesOnBrandFlags };
		this.unlockedMediumTierIds = [...save.unlockedMediumTierIds];
		this.activeMediumTierId = save.activeMediumTierId;
		this.unlockedVenueId = save.unlockedVenueId;
		this.unlockedLayoutIds = [...save.unlockedLayoutIds];
		this.activeLayoutId = save.activeLayoutId;
		this.ownedAtmosphereIds = [...save.ownedAtmosphereIds];
		this.hiredStaffIds = [...save.hiredStaffIds];
		this.lastIncomeTickAt = save.lastIncomeTickAt ?? this.#now();

		this.#scheduleAutoInvite();
	}

	inviteClient(): void {
		if (this.phase !== 'idle') {
			return;
		}

		this.#clearAutoInvite();

		const excludeIds = this.galleryHistory.map((entry) => entry.briefId);
		this.currentClient = pickBrief({
			excludeIds,
			unlockedTiers: unlockedClientTiers(this.reputation),
			completedSeriesIds: fullyCompletedSeriesIds(excludeIds, CORPORATE_BRIEFS),
			random: this.#random
		});
		this.currentArtwork = null;
		this.currentCritique = null;
		this.currentAuctionResult = null;
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
		this.currentAuctionResult = null;
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
			const tier = briefTier(client);
			let finalPayout: number;
			let auctionResult: AuctionResult | null = null;

			if (tier === 'auction-house') {
				auctionResult = this.#resolveAuction(
					toGalleryScore(draft.accuracyScore, creativityScore),
					client.budget,
					this.#random
				);
				finalPayout = auctionResult.winningBid;
			} else {
				finalPayout = calculatePayout(
					client,
					draft.accuracyScore,
					creativityScore,
					this.presentationMultiplier
				);
				if (
					tier === 'corporate' &&
					client.seriesPosition === 3 &&
					client.seriesId &&
					client.paletteConstraint
				) {
					const prior = this.seriesOnBrandFlags[client.seriesId] ?? [];
					const currentOnBrand = checkPaletteUsage(playerPrompt, client.paletteConstraint).onBrand;
					finalPayout += seriesCompletionBonus([...prior, currentOnBrand]);
				}
			}

			const critique = critiqueSchema.parse({
				title: draft.title,
				accuracyScore: draft.accuracyScore,
				criticReview: draft.criticReview,
				creativityScore,
				finalPayout
			});

			this.currentCritique = critique;
			this.currentAuctionResult = auctionResult;
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

	async collectCash(): Promise<void> {
		if (
			this.phase !== 'results' ||
			!this.currentArtwork ||
			!this.currentCritique ||
			!this.currentClient ||
			this.#collectingCash
		) {
			return;
		}

		this.#collectingCash = true;
		try {
			const artwork = this.currentArtwork;
			const critique = this.currentCritique;
			const client = this.currentClient;

			if (
				briefTier(client) === 'corporate' &&
				client.seriesId &&
				client.paletteConstraint &&
				artwork.playerPrompt !== undefined
			) {
				const onBrand = checkPaletteUsage(artwork.playerPrompt, client.paletteConstraint).onBrand;
				const existing = this.seriesOnBrandFlags[client.seriesId] ?? [];
				this.seriesOnBrandFlags = {
					...this.seriesOnBrandFlags,
					[client.seriesId]: [...existing, onBrand]
				};
			}

			const imageUrl = await ensureDurableImageUrl(artwork.imageUrl);

			this.cash += critique.finalPayout;
			this.reputation += reputationGain(critique.accuracyScore, critique.creativityScore);
			this.commissionsCompleted += 1;

			const entry: GalleryEntry = {
				id: artwork.id,
				imageUrl,
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
			this.currentAuctionResult = null;

			this.phase = isLevelComplete({
				cash: this.cash,
				commissionsCompleted: this.commissionsCompleted
			})
				? 'levelComplete'
				: 'idle';

			this.#persist();
			if (this.phase === 'idle') {
				this.#scheduleAutoInvite();
			}
		} finally {
			this.#collectingCash = false;
		}
	}

	/**
	 * One-time hire. Roles are never un-hired or refunded. Returns false when already
	 * hired or the player cannot afford the role.
	 */
	hireStaff(id: string): boolean {
		const role = getStaffRole(id);
		if (!role) return false;
		if (this.hiredStaffIds.includes(id)) return false;
		if (!canHireStaff(role, { cash: this.cash, reputation: this.reputation })) {
			return false;
		}
		this.cash -= role.hireCost;
		this.hiredStaffIds = [...this.hiredStaffIds, id];
		this.#persist();
		if (this.phase === 'idle') {
			this.#scheduleAutoInvite();
		}
		return true;
	}

	/**
	 * Catch up idle earnings once, then tick on an interval. Returns a cleanup that
	 * clears the interval — call from page mount teardown.
	 */
	startIncomeTicker(): () => void {
		this.#clearIncomeTicker();

		const catchUp = computeIdleEarnings(this.lastIncomeTickAt, this.#now(), this.incomePerSecond);
		if (catchUp.earned > 0) {
			this.cash += catchUp.earned;
			this.idleEarningsToShow = catchUp.earned;
			this.lastIncomeTickAt = this.#now();
			this.#persist();
		} else {
			this.lastIncomeTickAt = this.#now();
		}

		this.#incomeTicker = setInterval(() => {
			const { earned } = computeIdleEarnings(
				this.lastIncomeTickAt,
				this.#now(),
				this.incomePerSecond
			);
			this.lastIncomeTickAt = this.#now();
			if (earned > 0) {
				this.cash += earned;
				this.#persist();
			}
		}, this.#tickIntervalMs);

		return () => {
			this.#clearIncomeTicker();
		};
	}

	/** Clears the one-shot idle earnings modal flag after the player collects. */
	dismissIdleEarnings(): void {
		this.idleEarningsToShow = null;
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
		this.#clearAutoInvite();
		this.#clearIncomeTicker();
		this.#clearSave();
		this.phase = 'idle';
		this.cash = LEVEL_1.startingCash;
		this.reputation = 0;
		this.commissionsCompleted = 0;
		this.currentClient = null;
		this.currentArtwork = null;
		this.currentCritique = null;
		this.currentAuctionResult = null;
		this.errorMessage = null;
		this.galleryHistory = [];
		this.seriesOnBrandFlags = {};
		this.draftPrompt = '';
		this.generationProgress = null;
		this.unlockedMediumTierIds = [DEFAULT_MEDIUM_TIER_ID];
		this.activeMediumTierId = DEFAULT_MEDIUM_TIER_ID;
		this.unlockedVenueId = DEFAULT_VENUE_ID;
		this.unlockedLayoutIds = [DEFAULT_LAYOUT_ID];
		this.activeLayoutId = DEFAULT_LAYOUT_ID;
		this.ownedAtmosphereIds = [];
		this.hiredStaffIds = [];
		this.lastIncomeTickAt = this.#now();
		this.idleEarningsToShow = null;
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
		data.seriesOnBrandFlags = { ...this.seriesOnBrandFlags };
		data.unlockedMediumTierIds = [...this.unlockedMediumTierIds];
		data.activeMediumTierId = this.activeMediumTierId;
		data.unlockedVenueId = this.unlockedVenueId;
		data.unlockedLayoutIds = [...this.unlockedLayoutIds];
		data.activeLayoutId = this.activeLayoutId;
		data.ownedAtmosphereIds = [...this.ownedAtmosphereIds];
		data.hiredStaffIds = [...this.hiredStaffIds];
		data.lastIncomeTickAt = this.lastIncomeTickAt;
		this.#persistSave(data);
	}

	#clearAutoInvite(): void {
		if (this.#autoInviteTimer !== null) {
			clearTimeout(this.#autoInviteTimer);
			this.#autoInviteTimer = null;
		}
	}

	#clearIncomeTicker(): void {
		if (this.#incomeTicker !== null) {
			clearInterval(this.#incomeTicker);
			this.#incomeTicker = null;
		}
	}

	/**
	 * Schedules Marketing Director auto-invite only while idle and a hired role has
	 * `autoInviteSpeedMultiplier > 1`. Uses max multiplier across roles, not the sum.
	 */
	#scheduleAutoInvite(): void {
		this.#clearAutoInvite();
		if (this.phase !== 'idle') return;

		const bestMultiplier = this.hiredStaffIds.reduce((best, id) => {
			const mult = getStaffRole(id)?.autoInviteSpeedMultiplier ?? 1;
			return Math.max(best, mult);
		}, 1);

		if (bestMultiplier <= 1) return;

		const delay = BASE_AUTO_INVITE_DELAY_MS / bestMultiplier;
		this.#autoInviteTimer = setTimeout(() => {
			this.#autoInviteTimer = null;
			if (this.phase === 'idle') {
				this.inviteClient();
			}
		}, delay);
	}
}

/** The single game store instance the screen binds to. */
export const game = new GameStore();
