import { describe, expect, it, vi } from 'vitest';
import { EngineError } from '$lib/engines/errors';
import { calculatePayout, createDefaultSave, scorePrompt, type SaveData } from '$lib/game';
import { LEVEL_1, type Artwork, type CritiqueDraft } from '$lib/types/contracts';
import { GameStore } from './gameState.svelte';

const fakeArtwork: Artwork = {
	id: 'art-test',
	imageUrl: 'data:image/svg+xml,%3Csvg/%3E',
	playerPrompt: 'a cozy coffee cup on a wooden table',
	width: 512,
	height: 512,
	generationMs: 5,
	engineId: 'mock'
};

const fakeDraft: CritiqueDraft = {
	title: 'Morning Coffee',
	accuracyScore: 10,
	criticReview: 'A charming cup.'
};

function createStore(
	engine: {
		generate: (input: { playerPrompt: string; prompt: string }) => Promise<Artwork>;
		critique: (input: unknown) => Promise<CritiqueDraft>;
	},
	options?: {
		random?: () => number;
		now?: () => number;
		setSwitchingLocked?: (locked: boolean) => void;
		loadSave?: (startingCash: number, now?: () => number) => SaveData;
		persistSave?: (data: SaveData) => void;
		clearSave?: () => void;
		resolveAuction?: (
			qualityScore: number,
			reservePrice: number,
			random?: () => number
		) => { bidderCount: number; bids: number[]; winningBid: number };
	}
) {
	const now = options?.now ?? (() => 1_000);
	return new GameStore({
		engine,
		random: options?.random ?? (() => 0),
		now,
		setSwitchingLocked: options?.setSwitchingLocked,
		loadSave: options?.loadSave ?? ((startingCash) => createDefaultSave(startingCash, now)),
		persistSave: options?.persistSave ?? (() => {}),
		clearSave: options?.clearSave ?? (() => {}),
		resolveAuction: options?.resolveAuction
	});
}

describe('GameStore', () => {
	it('starts idle with starting cash and empty gallery', () => {
		const store = createStore({
			generate: vi.fn(),
			critique: vi.fn()
		});

		expect(store.phase).toBe('idle');
		expect(store.cash).toBe(LEVEL_1.startingCash);
		expect(store.galleryHistory).toEqual([]);
	});

	it('hydrates cash and reputation from injected loadSave', () => {
		const store = createStore(
			{
				generate: vi.fn(),
				critique: vi.fn()
			},
			{
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => 1_000),
					cash: 340,
					reputation: 12,
					lifetimeCommissions: 2
				})
			}
		);

		expect(store.cash).toBe(340);
		expect(store.reputation).toBe(12);
		expect(store.commissionsCompleted).toBe(2);
		expect(store.phase).toBe('idle');
	});

	it('inviteClient moves to briefing with c1 when random is 0', () => {
		const store = createStore({
			generate: vi.fn(),
			critique: vi.fn()
		});

		store.inviteClient();

		expect(store.phase).toBe('briefing');
		expect(store.currentClient?.id).toBe('c1');
	});

	it('createArt with empty prompt stays in briefing', async () => {
		const store = createStore({
			generate: vi.fn(),
			critique: vi.fn()
		});
		store.inviteClient();
		store.draftPrompt = '   ';

		await store.createArt();

		expect(store.phase).toBe('briefing');
	});

	it('shows the artwork before critique finishes', async () => {
		let resolveCritique: ((draft: CritiqueDraft) => void) | undefined;
		const critique = vi.fn(
			() =>
				new Promise<CritiqueDraft>((resolve) => {
					resolveCritique = resolve;
				})
		);
		const store = createStore({
			generate: vi.fn(async () => fakeArtwork),
			critique
		});
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';

		const run = store.createArt();

		await vi.waitFor(() => {
			expect(store.phase).toBe('critiquing');
			expect(store.currentArtwork).toEqual(fakeArtwork);
			expect(resolveCritique).toBeDefined();
		});

		expect(store.currentCritique).toBeNull();

		resolveCritique!(fakeDraft);
		await run;

		expect(store.phase).toBe('results');
		expect(store.currentCritique).not.toBeNull();
	});

	it('happy path ends in results with artwork and critique', async () => {
		const store = createStore({
			generate: vi.fn(async () => fakeArtwork),
			critique: vi.fn(async () => fakeDraft)
		});
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';

		await store.createArt();

		expect(store.phase).toBe('results');
		expect(store.currentArtwork).not.toBeNull();
		expect(store.currentCritique).not.toBeNull();
	});

	it('passes built prompt to the engine while keeping playerPrompt clean', async () => {
		const generate = vi.fn(
			async ({ playerPrompt, prompt: builtPrompt }: { playerPrompt: string; prompt: string }) => {
				void builtPrompt;
				return {
					...fakeArtwork,
					playerPrompt
				};
			}
		);
		const store = createStore({ generate, critique: vi.fn(async () => fakeDraft) });
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';

		await store.createArt();

		expect(generate).toHaveBeenCalledOnce();
		const args = generate.mock.calls[0][0];
		expect(args.playerPrompt).toBe('a cozy coffee cup on a wooden table');
		expect(args.prompt).toContain(LEVEL_1.promptModifiers);
		expect(args.playerPrompt).not.toContain('crayon texture');
		expect(store.currentArtwork?.playerPrompt).toBe('a cozy coffee cup on a wooden table');
	});

	it('failed generation preserves draftPrompt and sets errorMessage', async () => {
		const store = createStore({
			generate: vi.fn(async () => {
				throw new EngineError('generation_failed', 'Paint machine jammed.');
			}),
			critique: vi.fn()
		});
		store.inviteClient();
		store.draftPrompt = 'a dragon';

		await store.createArt();

		expect(store.phase).toBe('failed');
		expect(store.errorMessage).toBe('Paint machine jammed.');
		expect(store.draftPrompt).toBe('a dragon');
	});

	it('does not start a second createArt while generating', async () => {
		let resolveGenerate: ((art: Artwork) => void) | undefined;
		const generate = vi.fn(
			() =>
				new Promise<Artwork>((resolve) => {
					resolveGenerate = resolve;
				})
		);
		const store = createStore({ generate, critique: vi.fn(async () => fakeDraft) });
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';

		const first = store.createArt();
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		await store.createArt();
		expect(generate).toHaveBeenCalledOnce();

		resolveGenerate?.(fakeArtwork);
		await first;
	});

	it('locks and unlocks engine switching around createArt', async () => {
		const lockCalls: boolean[] = [];
		const store = createStore(
			{
				generate: vi.fn(async () => fakeArtwork),
				critique: vi.fn(async () => fakeDraft)
			},
			{ setSwitchingLocked: (locked) => lockCalls.push(locked) }
		);
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';

		await store.createArt();

		expect(lockCalls).toEqual([true, false]);
	});

	it('unlocks switching even when generation fails', async () => {
		const lockCalls: boolean[] = [];
		const store = createStore(
			{
				generate: vi.fn(async () => {
					throw new EngineError('generation_failed', 'fail');
				}),
				critique: vi.fn()
			},
			{ setSwitchingLocked: (locked) => lockCalls.push(locked) }
		);
		store.inviteClient();
		store.draftPrompt = 'a dragon';

		await store.createArt();

		expect(lockCalls).toEqual([true, false]);
	});

	it('retry returns to briefing with prompt intact', async () => {
		const store = createStore({
			generate: vi.fn(async () => {
				throw new EngineError('generation_failed', 'fail');
			}),
			critique: vi.fn()
		});
		store.inviteClient();
		store.draftPrompt = 'keep me';

		await store.createArt();
		store.retry();

		expect(store.phase).toBe('briefing');
		expect(store.draftPrompt).toBe('keep me');
		expect(store.errorMessage).toBeNull();
	});

	it('collectCash pays once and records briefId', async () => {
		const store = createStore({
			generate: vi.fn(async () => fakeArtwork),
			critique: vi.fn(async () => fakeDraft)
		});
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';
		await store.createArt();

		const before = store.cash;
		store.collectCash();

		expect(store.cash).toBeGreaterThan(before);
		expect(store.galleryHistory).toHaveLength(1);
		expect(store.galleryHistory[0]?.briefId).toBe('c1');
		expect(store.phase).toBe('idle');
	});

	it('collectCash calls persistSave once with updated cash and gallery', async () => {
		const persistSave = vi.fn();
		const store = createStore(
			{
				generate: vi.fn(async () => fakeArtwork),
				critique: vi.fn(async () => fakeDraft)
			},
			{ persistSave }
		);
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';
		await store.createArt();

		store.collectCash();

		expect(persistSave).toHaveBeenCalledOnce();
		const saved = persistSave.mock.calls[0][0] as SaveData;
		expect(saved.cash).toBe(store.cash);
		expect(saved.lifetimeCommissions).toBe(1);
		expect(saved.galleryHistory).toHaveLength(1);
		expect(saved.galleryHistory[0]?.briefId).toBe('c1');
	});

	it('double collectCash pays only once', async () => {
		const persistSave = vi.fn();
		const store = createStore(
			{
				generate: vi.fn(async () => fakeArtwork),
				critique: vi.fn(async () => fakeDraft)
			},
			{ persistSave }
		);
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';
		await store.createArt();

		store.collectCash();
		const cashAfterFirst = store.cash;
		store.collectCash();

		expect(store.cash).toBe(cashAfterFirst);
		expect(store.galleryHistory).toHaveLength(1);
		expect(persistSave).toHaveBeenCalledOnce();
	});

	it('excludes completed briefIds when inviting the next client', async () => {
		const store = createStore({
			generate: vi.fn(async () => fakeArtwork),
			critique: vi.fn(async () => fakeDraft)
		});
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';
		await store.createArt();
		store.collectCash();

		store.inviteClient();

		expect(store.currentClient?.id).toBe('c2');
	});

	it('reset restores initial state and calls clearSave', async () => {
		const clearSave = vi.fn();
		const store = createStore(
			{
				generate: vi.fn(async () => fakeArtwork),
				critique: vi.fn(async () => fakeDraft)
			},
			{ clearSave }
		);
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';
		await store.createArt();
		store.collectCash();
		store.reset();

		expect(clearSave).toHaveBeenCalledOnce();
		expect(store.phase).toBe('idle');
		expect(store.cash).toBe(LEVEL_1.startingCash);
		expect(store.galleryHistory).toEqual([]);
		expect(store.currentClient).toBeNull();
	});

	it('reaches levelComplete after five commissions with enough cash', async () => {
		const store = createStore({
			generate: vi.fn(async ({ playerPrompt }) => ({ ...fakeArtwork, playerPrompt })),
			critique: vi.fn(async () => fakeDraft)
		});

		for (let i = 0; i < LEVEL_1.targetCommissions; i++) {
			store.inviteClient();
			store.draftPrompt = 'a cozy coffee cup on a wooden table';
			await store.createArt();
			store.collectCash();
		}

		expect(store.phase).toBe('levelComplete');
		expect(store.commissionsCompleted).toBe(5);
		expect(store.cash).toBeGreaterThanOrEqual(LEVEL_1.targetCash);
	});

	it('never surfaces a prestige client at reputation 0 across 50 draws', () => {
		let draw = 0;
		const seeded = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{ random: () => (draw++ % 50) / 50 }
		);

		for (let i = 0; i < 50; i++) {
			seeded.phase = 'idle';
			seeded.inviteClient();
			const tier = seeded.currentClient?.tier ?? 'walk-in';
			expect(tier).toBe('walk-in');
		}
	});

	it('surfaces all four tiers across draws at reputation 60', () => {
		const seen = new Set<string>();
		let draw = 0;
		const store = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{
				random: () => (draw++ % 100) / 100,
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => 1_000),
					reputation: 60
				})
			}
		);

		for (let i = 0; i < 100; i++) {
			store.phase = 'idle';
			store.inviteClient();
			const client = store.currentClient;
			expect(client).not.toBeNull();
			if (!client) continue;
			seen.add(client.tier ?? 'walk-in');
			store.galleryHistory = [
				{
					id: `skip-${i}`,
					imageUrl: 'data:image/svg+xml,%3Csvg/%3E',
					title: 'Skip',
					payout: 0,
					score: 1,
					clientName: client.clientName,
					briefId: client.id,
					completedAt: i
				},
				...store.galleryHistory
			];
		}

		expect(seen.has('walk-in')).toBe(true);
		expect(seen.has('corporate')).toBe(true);
		expect(seen.has('billionaire')).toBe(true);
		expect(seen.has('auction-house')).toBe(true);
	});

	it('uses injected resolveAuction winningBid for auction-house payouts', async () => {
		const resolveAuction = vi.fn(() => ({
			bidderCount: 4,
			bids: [100, 400, 220, 180],
			winningBid: 400
		}));
		const store = createStore(
			{
				generate: vi.fn(async () => fakeArtwork),
				critique: vi.fn(async () => fakeDraft)
			},
			{ resolveAuction }
		);
		store.currentClient = {
			id: 'auc-1',
			clientName: "Hargrove's Auction House",
			avatarUrl: '/avatars/c1.svg',
			requestText: 'Bring us your finest.',
			budget: 200,
			preferredKeywords: ['detail', 'skill', 'composition'],
			tier: 'auction-house'
		};
		store.phase = 'briefing';
		store.draftPrompt = 'a detailed skillful composition with rich texture';

		await store.createArt();

		expect(resolveAuction).toHaveBeenCalledOnce();
		expect(store.currentCritique?.finalPayout).toBe(400);
		expect(store.currentAuctionResult?.winningBid).toBe(400);
	});

	it('adds a 300 series bonus on the third on-brand corporate piece', async () => {
		const store = createStore({
			generate: vi.fn(async ({ playerPrompt }) => ({ ...fakeArtwork, playerPrompt })),
			critique: vi.fn(async () => fakeDraft)
		});
		store.seriesOnBrandFlags = { 'corp-1': [true, true] };
		store.currentClient = {
			id: 'corp-1c',
			clientName: 'Meridian Bank',
			avatarUrl: '/avatars/c1.svg',
			requestText: 'Executive suite closer.',
			budget: 320,
			preferredKeywords: ['vault', 'door', 'light'],
			tier: 'corporate',
			seriesId: 'corp-1',
			seriesPosition: 3,
			paletteConstraint: ['navy', 'gold', 'cream']
		};
		store.phase = 'briefing';
		store.draftPrompt = 'a navy and gold vault door in soft light';

		await store.createArt();

		const base = calculatePayout(
			store.currentClient,
			fakeDraft.accuracyScore,
			scorePrompt(store.currentClient, store.draftPrompt).creativityScore
		);
		expect(store.currentCritique?.finalPayout).toBe(base + 300);
	});

	it('adds no series bonus when the third corporate piece is off brand', async () => {
		const store = createStore({
			generate: vi.fn(async ({ playerPrompt }) => ({ ...fakeArtwork, playerPrompt })),
			critique: vi.fn(async () => fakeDraft)
		});
		store.seriesOnBrandFlags = { 'corp-1': [true, true] };
		store.currentClient = {
			id: 'corp-1c',
			clientName: 'Meridian Bank',
			avatarUrl: '/avatars/c1.svg',
			requestText: 'Executive suite closer.',
			budget: 320,
			preferredKeywords: ['vault', 'door', 'light'],
			tier: 'corporate',
			seriesId: 'corp-1',
			seriesPosition: 3,
			paletteConstraint: ['navy', 'gold', 'cream']
		};
		store.phase = 'briefing';
		store.draftPrompt = 'a vault door in soft light with no palette words';

		await store.createArt();

		const base = calculatePayout(
			store.currentClient,
			fakeDraft.accuracyScore,
			scorePrompt(store.currentClient, store.draftPrompt).creativityScore
		);
		expect(store.currentCritique?.finalPayout).toBe(base);
	});
});
