import { pickBrief } from '$lib/data/briefs';
import { EngineError } from '$lib/engines/errors';
import type { EngineManager } from '$lib/engines/manager';
import {
	buildLevel1Prompt,
	calculatePayout,
	isLevelComplete,
	levelProgress,
	reputationGain,
	scorePrompt,
	toGalleryScore
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
}

/** Drives the Level 1 commission loop and gallery state. */
export class GameStore {
	phase = $state<GamePhase>('idle');
	cash = $state(LEVEL_1.startingCash);
	reputation = $state(0);
	commissionsCompleted = $state(0);
	currentClient = $state<ClientBrief | null>(null);
	currentArtwork = $state<Artwork | null>(null);
	currentCritique = $state<Critique | null>(null);
	errorMessage = $state<string | null>(null);
	galleryHistory = $state<GalleryEntry[]>([]);
	draftPrompt = $state('');
	generationProgress = $state<number | null>(null);

	progress = $derived(
		levelProgress({ cash: this.cash, commissionsCompleted: this.commissionsCompleted })
	);

	readonly #engine: Pick<EngineManager, 'generate' | 'critique'>;
	readonly #setSwitchingLocked: (locked: boolean) => void;
	readonly #random: () => number;
	readonly #now: () => number;

	constructor(deps?: GameStoreDeps) {
		this.#engine = deps?.engine ?? engines.manager;
		this.#setSwitchingLocked = deps?.setSwitchingLocked ?? engines.setSwitchingLocked.bind(engines);
		this.#random = deps?.random ?? Math.random;
		this.#now = deps?.now ?? Date.now;
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
		const builtPrompt = buildLevel1Prompt(playerPrompt);

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
			const finalPayout = calculatePayout(client, draft.accuracyScore, creativityScore);
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
	}
}

/** The single game store instance the screen binds to. */
export const game = new GameStore();
