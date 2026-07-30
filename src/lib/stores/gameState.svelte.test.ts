import { describe, expect, it, vi } from 'vitest';
import { EngineError } from '$lib/engines/errors';
import { createDefaultSave, type SaveData } from '$lib/game';
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
		clearSave: options?.clearSave ?? (() => {})
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

	it('hydrates gallery progression fields from save', () => {
		const store = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => 1_000),
					unlockedVenueId: 'garage',
					unlockedLayoutIds: ['cluttered', 'tidy-rows'],
					activeLayoutId: 'tidy-rows',
					ownedAtmosphereIds: ['gallery-lighting']
				})
			}
		);

		expect(store.unlockedVenueId).toBe('garage');
		expect(store.unlockedLayoutIds).toEqual(['cluttered', 'tidy-rows']);
		expect(store.activeLayoutId).toBe('tidy-rows');
		expect(store.ownedAtmosphereIds).toEqual(['gallery-lighting']);
		expect(store.venue.capacity).toBe(8);
		expect(store.presentationMultiplier).toBeCloseTo(1.05 * 1.05, 5);
	});

	it('caps displayedGalleryEntries at venue capacity without trimming history', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.galleryHistory = [
			{
				id: 'a',
				imageUrl: '/a.png',
				title: 'A',
				payout: 10,
				score: 5,
				clientName: 'C',
				briefId: 'c1',
				completedAt: 100
			},
			{
				id: 'b',
				imageUrl: '/b.png',
				title: 'B',
				payout: 10,
				score: 5,
				clientName: 'C',
				briefId: 'c2',
				completedAt: 200
			},
			{
				id: 'c',
				imageUrl: '/c.png',
				title: 'C',
				payout: 10,
				score: 5,
				clientName: 'C',
				briefId: 'c3',
				completedAt: 300
			},
			{
				id: 'd',
				imageUrl: '/d.png',
				title: 'D',
				payout: 10,
				score: 5,
				clientName: 'C',
				briefId: 'c4',
				completedAt: 400
			},
			{
				id: 'e',
				imageUrl: '/e.png',
				title: 'E',
				payout: 10,
				score: 5,
				clientName: 'C',
				briefId: 'c5',
				completedAt: 500
			}
		];

		expect(store.galleryHistory).toHaveLength(5);
		expect(store.displayedGalleryEntries).toHaveLength(3);
		expect(store.displayedGalleryEntries.map((e) => e.id)).toEqual(['e', 'd', 'c']);
	});

	it('unlockVenue succeeds for the next venue when affordable', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		store.cash = 400;
		store.reputation = 4;

		expect(store.unlockVenue('garage')).toBe(true);
		expect(store.cash).toBe(0);
		expect(store.unlockedVenueId).toBe('garage');
		expect(persistSave).toHaveBeenCalledOnce();
		expect(store.displayedGalleryEntries.length).toBeLessThanOrEqual(8);
	});

	it('unlockVenue refuses when unaffordable or when skipping tiers', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		store.cash = 100;
		store.reputation = 4;

		expect(store.unlockVenue('garage')).toBe(false);
		expect(store.unlockedVenueId).toBe('fridge');

		store.cash = 10_000;
		store.reputation = 22;
		expect(store.unlockVenue('storefront')).toBe(false);
		expect(store.unlockVenue('garage')).toBe(true);
		expect(persistSave).toHaveBeenCalledOnce();
	});

	it('shows all five entries once garage venue is unlocked', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.cash = 400;
		store.reputation = 4;
		store.galleryHistory = Array.from({ length: 5 }, (_, i) => ({
			id: `g${i}`,
			imageUrl: `/g${i}.png`,
			title: `G${i}`,
			payout: 10,
			score: 5,
			clientName: 'C',
			briefId: `c${i + 1}`,
			completedAt: i + 1
		}));

		expect(store.displayedGalleryEntries).toHaveLength(3);
		expect(store.unlockVenue('garage')).toBe(true);
		expect(store.displayedGalleryEntries).toHaveLength(5);
	});

	it('unlockLayout deducts cash, activates, and persists', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		store.cash = 300;

		expect(store.unlockLayout('tidy-rows')).toBe(true);
		expect(store.cash).toBe(0);
		expect(store.unlockedLayoutIds).toContain('tidy-rows');
		expect(store.activeLayoutId).toBe('tidy-rows');
		expect(store.presentationMultiplier).toBeCloseTo(1.05, 5);
		expect(persistSave).toHaveBeenCalledOnce();
	});

	it('unlockLayout is idempotent and refuses when unaffordable', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.cash = 100;
		expect(store.unlockLayout('tidy-rows')).toBe(false);
		expect(store.unlockLayout('cluttered')).toBe(false);
	});

	it('setActiveLayout switches freely among owned layouts', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		store.cash = 300;
		store.unlockLayout('tidy-rows');
		persistSave.mockClear();

		store.setActiveLayout('cluttered');
		expect(store.activeLayoutId).toBe('cluttered');
		expect(persistSave).toHaveBeenCalledOnce();

		store.setActiveLayout('minimalist');
		expect(store.activeLayoutId).toBe('cluttered');
	});

	it('buyAtmosphereItem stacks bonuses and refuses duplicates', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		store.cash = 350;

		expect(store.buyAtmosphereItem('gallery-lighting')).toBe(true);
		expect(store.cash).toBe(0);
		expect(store.ownedAtmosphereIds).toEqual(['gallery-lighting']);
		expect(store.presentationMultiplier).toBeCloseTo(1.05, 5);
		expect(persistSave).toHaveBeenCalledOnce();

		expect(store.buyAtmosphereItem('gallery-lighting')).toBe(false);
		expect(store.buyAtmosphereItem('velvet-ropes')).toBe(false);
	});

	it('reset clears gallery progression fields', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.cash = 10_000;
		store.reputation = 22;
		store.unlockVenue('garage');
		store.unlockLayout('tidy-rows');
		store.buyAtmosphereItem('gallery-lighting');

		store.reset();

		expect(store.unlockedVenueId).toBe('fridge');
		expect(store.unlockedLayoutIds).toEqual(['cluttered']);
		expect(store.activeLayoutId).toBe('cluttered');
		expect(store.ownedAtmosphereIds).toEqual([]);
		expect(store.presentationMultiplier).toBe(1);
	});

	it('createArt passes presentationMultiplier into payout', async () => {
		const store = createStore({
			generate: vi.fn(async () => fakeArtwork),
			critique: vi.fn(async () => fakeDraft)
		});
		store.cash = 300;
		store.unlockLayout('tidy-rows');
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';

		await store.createArt();

		// accuracy 10, creativity from scorePrompt on that prompt is 2 → quality 0.76
		// 100 * 0.76 * 1.05 = 79.8 → 80
		expect(store.currentCritique?.finalPayout).toBe(80);
	});
});
