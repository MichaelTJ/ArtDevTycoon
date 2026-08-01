import { CLIENT_TIER_INFO, unlockedClientTiers } from '$lib/data/clientTiers';
import { CORPORATE_BRIEFS } from '$lib/data/corporateBriefs';
import {
	canUnlockMediumTier,
	DEFAULT_MEDIUM_TIER_ID,
	getMediumTier,
	MEDIUM_TIERS
} from '$lib/data/mediumTiers';
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
import {
	canHireStaff,
	getStaffRole,
	STAFF_ROLES,
	totalIncomePerSecond
} from '$lib/data/staffRoles';
import { clampCheatCash, clampCheatRep } from '$lib/dev/cheats';
import { EngineError } from '$lib/engines/errors';
import type { EngineManager } from '$lib/engines/manager';
import { buildPrompt } from '$lib/game/promptPipeline';
import {
	activateSlot,
	applySkillGains,
	buildProgressMeters,
	calculatePayout,
	clearSave as defaultClearSave,
	copySlot,
	createDefaultSave,
	createEmptySkillXp,
	deleteSlot,
	ensureDurableImageUrl,
	getActiveSlotId,
	isLevelComplete,
	levelProgress,
	listSaveSlots,
	loadSave as defaultLoadSave,
	newGameInSlot as newGameInSlotSave,
	persistSave as defaultPersistSave,
	previewSkillGains,
	renameSlot,
	reputationGain,
	saveDataSchema,
	scorePrompt,
	skillPayoutMultiplier,
	skillProgress,
	SKILL_IDS,
	toGalleryScore,
	type NextUnlock,
	type SaveData,
	type SaveSlotId,
	type SaveSlotListItem,
	type SkillGainPreview,
	type SkillProgress,
	type SkillXpMap
} from '$lib/game';
import { resolveAuction, type AuctionResult } from '$lib/game/auction';
import { BASE_AUTO_INVITE_DELAY_MS, computeIdleEarnings } from '$lib/game/idleIncome';
import { DEFAULT_WORK_ESTIMATE_MS } from '$lib/studio/workProgress';
import {
	captureMumRealCritique,
	isMumCommission,
	MUM_DISPLAY_SCORE,
	type MumRealCritique
} from '$lib/game/mumCritiquePresentation';
import { artworkForSubmitChoice, blobToDataUrl, type SubmitChoice } from '$lib/game/submitChoice';
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
	type CritiqueDraft,
	type GalleryEntry,
	type GamePhase
} from '$lib/types/contracts';
import { engines } from './engineStore.svelte';

export interface CollectedGains {
	skills: SkillGainPreview;
	reputation: number;
	cash: number;
}

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
	/**
	 * Spec 17: Marketing Director arrival. Defaults to `inviteClient`.
	 * The studio floor overrides this to summon a walking client first.
	 */
	autoInviteAction?: () => void;
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
	/**
	 * Engine verdict for Mum commissions — player-facing praise hides this until
	 * "Ask for real critique" in {@link ResultsPanel}.
	 */
	mumRealCritique = $state<MumRealCritique | null>(null);
	/** Set when the current results payout came from an auction. */
	currentAuctionResult = $state<AuctionResult | null>(null);
	/** Player-facing message for the `failed` phase. */
	errorMessage = $state<string | null>(null);
	galleryHistory = $state<GalleryEntry[]>([]);
	/** Corporate seriesId → on-brand flags for pieces collected so far. */
	seriesOnBrandFlags = $state<Record<string, boolean[]>>({});
	draftPrompt = $state('');
	/** Optional player sketch blob captured at submit-choice time; cleared with each new brief. */
	draftSketchBlob = $state<Blob | null>(null);
	/**
	 * After generate completes, the player picks their drawing or the AI image before
	 * critique runs. Stays true while phase is still `generating`.
	 */
	pendingSubmitChoice = $state(false);
	/** AI image URL held until the player confirms a submit choice. */
	aiGeneratedImageUrl = $state<string | null>(null);
	generationProgress = $state<number | null>(null);
	/**
	 * Wall-clock ms of the last finished generate+critique. Used as the studio desk
	 * progress-bar estimate for the next commission.
	 */
	lastWorkDurationMs = $state(DEFAULT_WORK_ESTIMATE_MS);
	/** `Date.now()` when the current generate+critique started; null when not working. */
	workStartedAt = $state<number | null>(null);
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

	/** Spec 20 — lifetime craft XP. */
	skillXp = $state<SkillXpMap>(createEmptySkillXp());
	/** Previewed XP while in `results`; cleared on collect / reset. */
	pendingSkillGains = $state<SkillGainPreview | null>(null);
	/** One-shot pulse after collect; UI clears via `clearLastCollectedGains`. */
	lastCollectedGains = $state<CollectedGains | null>(null);

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
	 * medium × layout × (1 + atmosphere) × craft-skill bonus. Specs 13/16/20 multiply
	 * into this seat, not via a parallel `calculatePayout` factor.
	 */
	presentationMultiplier = $derived(
		this.activeMediumTier.payoutMultiplier *
			getLayout(this.effectiveLayoutId).curationMultiplier *
			(1 + totalAtmosphereBonus(this.ownedAtmosphereIds)) *
			skillPayoutMultiplier(this.skillXp)
	);

	skillProgressList = $derived.by((): SkillProgress[] =>
		SKILL_IDS.map((id) => skillProgress(id, this.skillXp[id]))
	);

	progressMeters = $derived.by(() =>
		buildProgressMeters({
			cash: this.cash,
			reputation: this.reputation,
			commissionsCompleted: this.commissionsCompleted,
			targetCash: LEVEL_1.targetCash,
			targetCommissions: LEVEL_1.targetCommissions,
			unlockedVenueId: this.unlockedVenueId,
			unlockedMediumTierIds: this.unlockedMediumTierIds,
			hiredStaffIds: this.hiredStaffIds
		})
	);

	/** Convenience alias for HUD reputation meter. */
	reputationMeter = $derived.by((): NextUnlock => this.progressMeters.reputation);

	/** Bumped after any slot mutation so list/active deriveds re-read localStorage. */
	#slotsEpoch = $state(0);

	/** For UI binding — re-reads slot index when `#slotsEpoch` changes. */
	saveSlotsList = $derived.by((): ReadonlyArray<SaveSlotListItem> => {
		void this.#slotsEpoch;
		return listSaveSlots();
	});

	activeSaveSlotId = $derived.by((): SaveSlotId => {
		void this.#slotsEpoch;
		return getActiveSlotId();
	});

	readonly #engine: Pick<EngineManager, 'generate' | 'critique'>;
	readonly #setSwitchingLocked: (locked: boolean) => void;
	readonly #random: () => number;
	readonly #now: () => number;
	readonly #loadSave: (startingCash: number, now?: () => number) => SaveData;
	readonly #persistSave: (data: SaveData) => void;
	readonly #clearSave: () => void;
	readonly #resolveAuction: typeof resolveAuction;
	readonly #tickIntervalMs: number;
	#autoInviteAction: () => void;

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
		this.#autoInviteAction = deps?.autoInviteAction ?? (() => this.inviteClient());

		const save = this.#loadSave(LEVEL_1.startingCash, this.#now);
		this.#hydrateFromSave(save);
		this.#slotsEpoch += 1;

		this.#scheduleAutoInvite();
	}

	/** Abort in-flight commission, hydrate from slot, persist pointer. */
	switchToSlot(id: SaveSlotId): void {
		if (id === getActiveSlotId()) return;
		this.#persist();
		const save = activateSlot(id, LEVEL_1.startingCash, this.#now);
		this.#applySlotSave(save);
	}

	newGameInSlot(id: SaveSlotId, name?: string): void {
		this.#persist();
		const save = newGameInSlotSave(id, LEVEL_1.startingCash, name, this.#now);
		this.#applySlotSave(save);
	}

	deleteSaveSlot(id: SaveSlotId): void {
		const wasActive = id === getActiveSlotId();
		deleteSlot(id, LEVEL_1.startingCash, this.#now);
		if (!wasActive) {
			this.#slotsEpoch += 1;
			return;
		}
		const save = this.#loadSave(LEVEL_1.startingCash, this.#now);
		this.#applySlotSave(save);
	}

	renameSaveSlot(id: SaveSlotId, name: string): void {
		renameSlot(id, name);
		this.#slotsEpoch += 1;
	}

	copySaveSlot(from: SaveSlotId, to: SaveSlotId): void {
		copySlot(from, to, this.#now);
		this.#slotsEpoch += 1;
	}

	/** Spec 23 — Dev mode only; safe if called when off (just mutates local save). */
	devSetCash(n: number): void {
		this.cash = clampCheatCash(n);
		this.#persist();
	}

	devSetReputation(n: number): void {
		this.reputation = clampCheatRep(n);
		this.#persist();
	}

	devSetLifetimeCommissions(n: number): void {
		this.commissionsCompleted = clampCheatCash(n);
		this.#persist();
	}

	devUnlockAllProgression(): void {
		const maxTierRep = CLIENT_TIER_INFO.reduce(
			(max, tier) => Math.max(max, tier.requiredReputation),
			0
		);
		this.reputation = Math.max(this.reputation, maxTierRep);
		this.unlockedMediumTierIds = MEDIUM_TIERS.map((tier) => tier.id);
		this.activeMediumTierId = MEDIUM_TIERS[MEDIUM_TIERS.length - 1]?.id ?? DEFAULT_MEDIUM_TIER_ID;
		this.unlockedVenueId = GALLERY_VENUES[GALLERY_VENUES.length - 1]?.id ?? DEFAULT_VENUE_ID;
		this.unlockedLayoutIds = GALLERY_LAYOUTS.map((layout) => layout.id);
		this.activeLayoutId =
			this.unlockedLayoutIds[this.unlockedLayoutIds.length - 1] ?? DEFAULT_LAYOUT_ID;
		this.hiredStaffIds = STAFF_ROLES.map((role) => role.id);
		this.#persist();
	}

	devForceIdle(): void {
		this.#clearAutoInvite();
		this.phase = 'idle';
		this.currentClient = null;
		this.currentArtwork = null;
		this.currentCritique = null;
		this.mumRealCritique = null;
		this.currentAuctionResult = null;
		this.errorMessage = null;
		this.draftPrompt = '';
		this.draftSketchBlob = null;
		this.pendingSubmitChoice = false;
		this.aiGeneratedImageUrl = null;
		this.generationProgress = null;
		this.workStartedAt = null;
		this.pendingSkillGains = null;
		this.lastCollectedGains = null;
		this.#collectingCash = false;
		this.#setSwitchingLocked(false);
		this.#scheduleAutoInvite();
	}

	devExportSave(): string {
		const data = this.#snapshotSave();
		return JSON.stringify(data, null, 2);
	}

	devImportSave(raw: string): { ok: true } | { ok: false; error: string } {
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return { ok: false, error: 'Invalid save JSON' };
		}
		const result = saveDataSchema.safeParse(parsed);
		if (!result.success) {
			return { ok: false, error: 'Save failed validation' };
		}
		this.#persistSave(result.data);
		this.#applySlotSave(result.data);
		return { ok: true };
	}

	/** Spec 17: override Marketing Director arrival. Default remains `inviteClient`. */
	setAutoInviteAction(fn: () => void): void {
		this.#autoInviteAction = fn;
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
			commissionsCompleted: this.commissionsCompleted,
			random: this.#random
		});
		this.currentArtwork = null;
		this.currentCritique = null;
		this.mumRealCritique = null;
		this.currentAuctionResult = null;
		this.errorMessage = null;
		this.draftPrompt = '';
		this.draftSketchBlob = null;
		this.pendingSubmitChoice = false;
		this.aiGeneratedImageUrl = null;
		this.phase = 'briefing';
	}

	/** Store optional sketch PNG captured at submit-choice time. */
	setDraftSketch(blob: Blob | null): void {
		this.draftSketchBlob = blob;
	}

	async createArt(): Promise<void> {
		if (this.phase !== 'briefing' || !this.currentClient || this.draftPrompt.trim().length === 0) {
			return;
		}

		const playerPrompt = this.draftPrompt.trim();
		const builtPrompt = buildPrompt(playerPrompt, this.activeMediumTier);

		this.phase = 'generating';
		this.errorMessage = null;
		this.generationProgress = null;
		this.currentAuctionResult = null;
		this.pendingSubmitChoice = false;
		this.aiGeneratedImageUrl = null;
		this.currentArtwork = null;
		this.workStartedAt = this.#now();
		this.#setSwitchingLocked(true);

		// Yield so the UI can paint the generating state before instant mock work finishes.
		await new Promise<void>((resolve) => setTimeout(resolve, 0));

		try {
			// Spec 23 force-idle (or slot switch) may abort while we were yielding / awaiting.
			if (this.phase !== 'generating') return;

			const artwork = await this.#engine.generate({
				playerPrompt,
				prompt: builtPrompt
			});
			if (this.phase !== 'generating') return;

			this.currentArtwork = artwork;
			this.aiGeneratedImageUrl = artwork.imageUrl;
			this.pendingSubmitChoice = true;
		} catch (error) {
			this.pendingSkillGains = null;
			this.pendingSubmitChoice = false;
			this.aiGeneratedImageUrl = null;
			this.errorMessage =
				error instanceof EngineError
					? error.message
					: 'Something went wrong creating your art. Please try again.';
			this.phase = 'failed';
			this.workStartedAt = null;
			this.#setSwitchingLocked(false);
		}
	}

	/**
	 * After generate finishes, the player submits their canvas drawing or the AI image;
	 * critique and payout run against the chosen `imageUrl`.
	 */
	async confirmSubmitChoice(choice: SubmitChoice, sketchBlob: Blob | null): Promise<void> {
		if (
			!this.pendingSubmitChoice ||
			!this.currentArtwork ||
			!this.currentClient ||
			!this.aiGeneratedImageUrl ||
			this.phase !== 'generating'
		) {
			return;
		}
		if (choice === 'drawing' && !sketchBlob) {
			return;
		}

		const client = this.currentClient;
		const playerPrompt = this.currentArtwork.playerPrompt;
		const aiImageUrl = this.aiGeneratedImageUrl;

		let drawingDataUrl: string | null = null;
		if (choice === 'drawing' && sketchBlob) {
			drawingDataUrl = await blobToDataUrl(sketchBlob);
			this.draftSketchBlob = sketchBlob;
		} else {
			this.draftSketchBlob = null;
		}

		const artwork = artworkForSubmitChoice(this.currentArtwork, aiImageUrl, choice, drawingDataUrl);
		this.currentArtwork = artwork;
		this.pendingSubmitChoice = false;
		this.aiGeneratedImageUrl = null;
		this.phase = 'critiquing';

		try {
			await new Promise<void>((resolve) => setTimeout(resolve, 0));
			if (this.phase !== 'critiquing') return;

			const draft = await this.#engine.critique({
				brief: client,
				playerPrompt,
				artwork
			});
			if (this.phase !== 'critiquing') return;

			this.#applyCritiqueResult(client, playerPrompt, draft);
		} catch (error) {
			this.pendingSkillGains = null;
			this.pendingSubmitChoice = false;
			this.errorMessage =
				error instanceof EngineError
					? error.message
					: 'Something went wrong creating your art. Please try again.';
			this.phase = 'failed';
		} finally {
			this.workStartedAt = null;
			this.#setSwitchingLocked(false);
		}
	}

	#applyCritiqueResult(client: ClientBrief, playerPrompt: string, draft: CritiqueDraft): void {
		const { creativityScore } = scorePrompt(client, playerPrompt);
		const tier = briefTier(client);
		const isMum = isMumCommission(client.clientName);
		if (isMum) {
			this.mumRealCritique = captureMumRealCritique(draft, creativityScore);
		} else {
			this.mumRealCritique = null;
		}
		const payoutAccuracy = isMum ? MUM_DISPLAY_SCORE : draft.accuracyScore;
		const payoutCreativity = isMum ? MUM_DISPLAY_SCORE : creativityScore;
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
				payoutAccuracy,
				payoutCreativity,
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
			accuracyScore: payoutAccuracy,
			criticReview: draft.criticReview,
			creativityScore: payoutCreativity,
			finalPayout
		});

		this.currentCritique = critique;
		this.currentAuctionResult = auctionResult;
		this.pendingSkillGains = previewSkillGains({
			accuracyScore: critique.accuracyScore,
			creativityScore: critique.creativityScore,
			finalPayout: critique.finalPayout
		});
		const started = this.workStartedAt ?? this.#now();
		this.lastWorkDurationMs = Math.max(250, this.#now() - started);
		this.phase = 'results';
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

			const gains =
				this.pendingSkillGains ??
				previewSkillGains({
					accuracyScore: critique.accuracyScore,
					creativityScore: critique.creativityScore,
					finalPayout: critique.finalPayout
				});
			const repGain = reputationGain(critique.accuracyScore, critique.creativityScore);

			this.cash += critique.finalPayout;
			this.reputation += repGain;
			this.commissionsCompleted += 1;
			this.skillXp = applySkillGains(this.skillXp, gains);
			this.lastCollectedGains = {
				skills: gains,
				reputation: repGain,
				cash: critique.finalPayout
			};
			this.pendingSkillGains = null;

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
			this.mumRealCritique = null;
			this.currentClient = null;
			this.currentAuctionResult = null;
			this.draftSketchBlob = null;
			this.pendingSubmitChoice = false;
			this.aiGeneratedImageUrl = null;

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

	/** Clears the post-collect XP/rep pulse once the HUD has animated it. */
	clearLastCollectedGains(): void {
		this.lastCollectedGains = null;
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
		this.draftSketchBlob = null;
		this.pendingSubmitChoice = false;
		this.aiGeneratedImageUrl = null;
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
		this.draftSketchBlob = null;
		this.pendingSubmitChoice = false;
		this.aiGeneratedImageUrl = null;
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
		this.skillXp = createEmptySkillXp();
		this.pendingSkillGains = null;
		this.lastCollectedGains = null;
		this.#slotsEpoch += 1;
	}

	/** Apply a slot blob and return to idle (aborts any in-flight commission). */
	#applySlotSave(save: SaveData): void {
		this.#clearAutoInvite();
		this.#hydrateFromSave(save);
		this.phase = 'idle';
		this.currentClient = null;
		this.currentArtwork = null;
		this.currentCritique = null;
		this.mumRealCritique = null;
		this.currentAuctionResult = null;
		this.errorMessage = null;
		this.draftPrompt = '';
		this.draftSketchBlob = null;
		this.pendingSubmitChoice = false;
		this.aiGeneratedImageUrl = null;
		this.generationProgress = null;
		this.workStartedAt = null;
		this.pendingSkillGains = null;
		this.lastCollectedGains = null;
		this.idleEarningsToShow = null;
		this.#collectingCash = false;
		this.#setSwitchingLocked(false);
		this.#slotsEpoch += 1;
		this.#scheduleAutoInvite();
	}

	#hydrateFromSave(save: SaveData): void {
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
		this.skillXp = {
			prompting: save.skillXpPrompting,
			imagination: save.skillXpImagination,
			hustle: save.skillXpHustle
		};
		this.lastIncomeTickAt = save.lastIncomeTickAt ?? this.#now();
	}

	/**
	 * One writer for the whole progression blob. Specs 13–16 extend this method rather
	 * than adding parallel save calls — only banked progress goes here, never the live
	 * commission.
	 */
	#persist(): void {
		this.#persistSave(this.#snapshotSave());
	}

	#snapshotSave(): SaveData {
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
		data.skillXpPrompting = this.skillXp.prompting;
		data.skillXpImagination = this.skillXp.imagination;
		data.skillXpHustle = this.skillXp.hustle;
		return data;
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
	 * Schedules the next client arrival while idle. Always runs on a base timer;
	 * Marketing Director (and any future roles) speed it up via
	 * `autoInviteSpeedMultiplier` (max across roles, not the sum).
	 */
	#scheduleAutoInvite(): void {
		this.#clearAutoInvite();
		if (this.phase !== 'idle') return;

		const bestMultiplier = this.hiredStaffIds.reduce((best, id) => {
			const mult = getStaffRole(id)?.autoInviteSpeedMultiplier ?? 1;
			return Math.max(best, mult);
		}, 1);

		const delay = BASE_AUTO_INVITE_DELAY_MS / bestMultiplier;
		this.#autoInviteTimer = setTimeout(() => {
			this.#autoInviteTimer = null;
			if (this.phase === 'idle') {
				this.#autoInviteAction();
			}
		}, delay);
	}
}

/** The single game store instance the screen binds to. */
export const game = new GameStore();
