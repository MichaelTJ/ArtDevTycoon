import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KITCHEN_BRIEFS } from '$lib/data/kitchenBriefs';
import { getMediumTier } from '$lib/data/mediumTiers';
import { EngineError } from '$lib/engines/errors';
import {
	MUM_PAYOUT_CASH,
	MUM_REPUTATION_GAIN,
	mumSkillGains
} from '$lib/game/mumCritiquePresentation';
import {
	calculatePayout,
	createDefaultSave,
	getActiveSlotId,
	listSaveSlots,
	mediumSkillSuffix,
	mediumSkillBackground,
	peekSlot,
	previewSkillGains,
	scorePrompt,
	skillPayoutMultiplier,
	xpThresholdForLevel,
	type SaveData
} from '$lib/game';
import { BASE_AUTO_INVITE_DELAY_MS, computeIdleEarnings } from '$lib/game/idleIncome';
import { LEVEL_1, type Artwork, type CritiqueDraft } from '$lib/types/contracts';
import { GameStore } from './gameState.svelte';

function createMemoryStorage() {
	const map = new Map<string, string>();
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => {
			map.set(key, value);
		},
		removeItem: (key: string) => {
			map.delete(key);
		},
		clear: () => {
			map.clear();
		}
	};
}

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
		tickIntervalMs?: number;
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
		resolveAuction: options?.resolveAuction,
		tickIntervalMs: options?.tickIntervalMs
	});
}

/** P6: generate then confirm AI image so critique runs (most happy-path tests). */
async function submitAi(store: GameStore): Promise<void> {
	await store.createArt();
	await store.confirmSubmitChoice('ai', null);
}

/** Neighbour June — non-Mum walk-in for payout/skill formula tests. */
function startNonMumBriefing(store: GameStore): void {
	const client = KITCHEN_BRIEFS.find((b) => b.id === 'c4');
	if (!client) throw new Error('Expected Neighbour June brief c4');
	store.phase = 'idle';
	store.currentClient = client;
	store.phase = 'briefing';
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
		expect(store.currentClient?.abstractness ?? 0).toBe(0);
		expect(store.currentClient?.clientName).toBe('Mum');
	});

	it('inviteClient at zero commissions always yields Mum band-0 openers', () => {
		const openerIds = new Set(['c1', 'c2', 'c3', 'c7']);
		let draw = 0;
		const store = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{ random: () => (draw++ % 20) / 20 }
		);

		for (let i = 0; i < 20; i++) {
			store.phase = 'idle';
			store.inviteClient();
			expect(openerIds.has(store.currentClient!.id)).toBe(true);
			expect(store.currentClient!.abstractness ?? 0).toBe(0);
			expect(store.currentClient!.clientName).toBe('Mum');
		}
	});

	it('inviteClient eventually yields abstractness 2 after twenty commissions', () => {
		let draw = 0;
		const store = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{ random: () => (draw++ % 80) / 80 }
		);
		store.commissionsCompleted = 20;

		const levels = new Set<number>();
		for (let i = 0; i < 80; i++) {
			store.phase = 'idle';
			store.galleryHistory = [];
			store.inviteClient();
			levels.add(store.currentClient!.abstractness ?? 0);
		}
		expect(levels.has(2)).toBe(true);
	});

	it('inviteClient yields abstractness 2 via reputation before commission threshold', () => {
		let draw = 0;
		const store = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{ random: () => (draw++ % 80) / 80 }
		);
		store.commissionsCompleted = 4;
		store.reputation = 16;

		const levels = new Set<number>();
		for (let i = 0; i < 80; i++) {
			store.phase = 'idle';
			store.galleryHistory = [];
			store.inviteClient();
			levels.add(store.currentClient!.abstractness ?? 0);
		}
		expect(levels.has(2)).toBe(true);
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

	it('createArt stops at submit choice without calling critique', async () => {
		const generate = vi.fn(
			async (input: { playerPrompt: string; prompt: string; sketchImage?: Blob }) => {
				void input;
				return fakeArtwork;
			}
		);
		const critique = vi.fn(async () => fakeDraft);
		const store = createStore({ generate, critique });
		store.inviteClient();
		store.draftPrompt = 'a cat';

		await store.createArt();

		expect(generate).toHaveBeenCalledWith(
			expect.objectContaining({
				playerPrompt: 'a cat'
			})
		);
		expect(generate.mock.calls[0]?.[0]).not.toHaveProperty('sketchImage');
		expect(store.pendingSubmitChoice).toBe(true);
		expect(store.phase).toBe('generating');
		expect(critique).not.toHaveBeenCalled();
	});

	it('confirmSubmitChoice with drawing swaps imageUrl before critique', async () => {
		const aiUrl = 'data:image/svg+xml,ai';
		const generate = vi.fn(async () => ({ ...fakeArtwork, imageUrl: aiUrl }));
		const critique = vi.fn(async (input: unknown) => {
			const { artwork } = input as { artwork: Artwork };
			expect(artwork.imageUrl).not.toBe(aiUrl);
			expect(artwork.imageUrl.startsWith('data:image/png')).toBe(true);
			return fakeDraft;
		});
		const store = createStore({ generate, critique });
		store.inviteClient();
		store.draftPrompt = 'a cat';
		await store.createArt();
		const sketch = new Blob([Uint8Array.from([9, 9, 9])], { type: 'image/png' });

		await store.confirmSubmitChoice('drawing', sketch);

		expect(store.phase).toBe('results');
		expect(store.currentArtwork?.imageUrl.startsWith('data:image/png')).toBe(true);
	});

	it('confirmSubmitChoice with ai keeps the generated imageUrl', async () => {
		const aiUrl = 'data:image/svg+xml,ai';
		const generate = vi.fn(async () => ({ ...fakeArtwork, imageUrl: aiUrl }));
		const critique = vi.fn(async (input: unknown) => {
			const { artwork } = input as { artwork: Artwork };
			expect(artwork.imageUrl).toBe(aiUrl);
			return fakeDraft;
		});
		const store = createStore({ generate, critique });
		store.inviteClient();
		store.draftPrompt = 'a cat';
		await store.createArt();

		await store.confirmSubmitChoice('ai', null);

		expect(store.phase).toBe('results');
		expect(store.currentArtwork?.imageUrl).toBe(aiUrl);
	});

	it('inviteClient clears draft sketch', () => {
		const store = createStore({
			generate: vi.fn(),
			critique: vi.fn()
		});
		store.setDraftSketch(new Blob([Uint8Array.from([1])], { type: 'image/png' }));
		store.inviteClient();
		expect(store.draftSketchBlob).toBeNull();
	});

	it('collectCash clears draft sketch', async () => {
		const store = createStore({
			generate: vi.fn(async () => fakeArtwork),
			critique: vi.fn(async () => fakeDraft)
		});
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';
		await store.createArt();
		const sketch = new Blob([Uint8Array.from([1])], { type: 'image/png' });
		await store.confirmSubmitChoice('drawing', sketch);
		expect(store.draftSketchBlob).not.toBeNull();
		await store.collectCash();
		expect(store.draftSketchBlob).toBeNull();
	});

	it('dismissError clears draft sketch and returns to briefing', async () => {
		const store = createStore({
			generate: vi.fn(async () => {
				throw new EngineError('generation_failed', 'fail');
			}),
			critique: vi.fn()
		});
		store.inviteClient();
		store.draftPrompt = 'keep me';
		store.setDraftSketch(new Blob([Uint8Array.from([1])], { type: 'image/png' }));
		await store.createArt();
		store.dismissError();
		expect(store.phase).toBe('briefing');
		expect(store.draftSketchBlob).toBeNull();
		expect(store.draftPrompt).toBe('keep me');
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
			expect(store.pendingSubmitChoice).toBe(true);
			expect(store.currentArtwork).toEqual(fakeArtwork);
		});

		const confirm = store.confirmSubmitChoice('ai', null);

		await vi.waitFor(() => {
			expect(store.phase).toBe('critiquing');
			expect(resolveCritique).toBeDefined();
		});

		expect(store.currentCritique).toBeNull();

		resolveCritique!(fakeDraft);
		await run;
		await confirm;

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

		await submitAi(store);

		expect(store.phase).toBe('results');
		expect(store.currentArtwork).not.toBeNull();
		expect(store.currentCritique).not.toBeNull();
	});

	it('Mum commissions store real critique, pay $5, and preview max gains', async () => {
		const harshDraft: CritiqueDraft = {
			title: 'Wobbly Cup',
			accuracyScore: 2,
			criticReview: 'The handle is on the wrong side.'
		};
		const store = createStore({
			generate: vi.fn(async () => fakeArtwork),
			critique: vi.fn(async () => harshDraft)
		});
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';

		await submitAi(store);

		expect(store.mumRealCritique).toEqual({
			title: 'Wobbly Cup',
			accuracyScore: 2,
			creativityScore: expect.any(Number),
			criticReview: 'The handle is on the wrong side.'
		});
		expect(store.currentCritique?.accuracyScore).toBe(10);
		expect(store.currentCritique?.creativityScore).toBe(10);
		expect(store.currentCritique?.finalPayout).toBe(MUM_PAYOUT_CASH);
		expect(store.pendingSkillGains).toEqual(mumSkillGains());
	});

	it('Mum collectCash applies $5 cash, max rep, and max skill XP', async () => {
		const store = createStore({
			generate: vi.fn(async () => fakeArtwork),
			critique: vi.fn(async () => fakeDraft)
		});
		const cashBefore = store.cash;
		const repBefore = store.reputation;
		const skillsBefore = { ...store.skillXp };

		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';
		await submitAi(store);
		await store.collectCash();

		expect(store.cash).toBe(cashBefore + MUM_PAYOUT_CASH);
		expect(store.reputation).toBe(repBefore + MUM_REPUTATION_GAIN);
		expect(store.skillXp.prompting).toBe(skillsBefore.prompting + 10);
		expect(store.skillXp.imagination).toBe(skillsBefore.imagination + 10);
		expect(store.skillXp.hustle).toBe(skillsBefore.hustle + 20);
		expect(store.lastCollectedGains).toEqual({
			skills: mumSkillGains(),
			reputation: MUM_REPUTATION_GAIN,
			cash: MUM_PAYOUT_CASH
		});
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

		expect(lockCalls).toEqual([true]);
		await store.confirmSubmitChoice('ai', null);
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
		await store.confirmSubmitChoice('ai', null);

		const before = store.cash;
		await store.collectCash();

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
		await store.confirmSubmitChoice('ai', null);

		await store.collectCash();

		expect(persistSave).toHaveBeenCalledOnce();
		const saved = persistSave.mock.calls[0][0] as SaveData;
		expect(saved.cash).toBe(store.cash);
		expect(saved.lifetimeCommissions).toBe(1);
		expect(saved.galleryHistory).toHaveLength(1);
		expect(saved.galleryHistory[0]?.briefId).toBe('c1');
	});

	it('collectCash durableizes blob image URLs before persisting', async () => {
		const persistSave = vi.fn();
		const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
		const blob = new Blob([bytes], { type: 'image/png' });
		const blobUrl = 'blob:http://localhost/gallery-art';

		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () => new Response(blob, { status: 200, headers: { 'Content-Type': 'image/png' } })
			)
		);

		const store = createStore(
			{
				generate: vi.fn(async () => ({ ...fakeArtwork, imageUrl: blobUrl })),
				critique: vi.fn(async () => fakeDraft)
			},
			{ persistSave }
		);
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';
		await store.createArt();
		await store.confirmSubmitChoice('ai', null);
		await store.collectCash();

		const saved = persistSave.mock.calls[0][0] as SaveData;
		expect(saved.galleryHistory[0]?.imageUrl.startsWith('data:image/png;base64,')).toBe(true);
		expect(store.galleryHistory[0]?.imageUrl.startsWith('data:image/png;base64,')).toBe(true);

		vi.unstubAllGlobals();
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
		await store.confirmSubmitChoice('ai', null);

		await store.collectCash();
		const cashAfterFirst = store.cash;
		await store.collectCash();

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
		await store.confirmSubmitChoice('ai', null);
		await store.collectCash();

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
		await store.confirmSubmitChoice('ai', null);
		await store.collectCash();
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
		store.cash = LEVEL_1.targetCash;

		for (let i = 0; i < LEVEL_1.targetCommissions; i++) {
			store.inviteClient();
			store.draftPrompt = 'a cozy coffee cup on a wooden table';
			await store.createArt();
			await store.confirmSubmitChoice('ai', null);
			await store.collectCash();
		}

		expect(store.phase).toBe('levelComplete');
		expect(store.commissionsCompleted).toBe(5);
		expect(store.cash).toBeGreaterThanOrEqual(LEVEL_1.targetCash);
	});

	it('acknowledgeCareerMilestone keeps cash, gallery, and unlocks', async () => {
		const persistSave = vi.fn();
		const store = createStore(
			{
				generate: vi.fn(async ({ playerPrompt }) => ({ ...fakeArtwork, playerPrompt })),
				critique: vi.fn(async () => fakeDraft)
			},
			{ persistSave }
		);
		store.cash = LEVEL_1.targetCash;
		store.reputation = 12;
		store.unlockedMediumTierIds = ['crayon', 'pencil'];
		store.activeMediumTierId = 'pencil';

		for (let i = 0; i < LEVEL_1.targetCommissions; i++) {
			store.inviteClient();
			store.draftPrompt = 'a cozy coffee cup on a wooden table';
			await store.createArt();
			await store.confirmSubmitChoice('ai', null);
			await store.collectCash();
		}

		const cashBefore = store.cash;
		const galleryBefore = store.galleryHistory.length;
		const repBefore = store.reputation;
		const unlocksBefore = [...store.unlockedMediumTierIds];

		store.acknowledgeCareerMilestone();

		expect(store.phase).toBe('idle');
		expect(store.careerMilestoneAcknowledged).toBe(true);
		expect(store.cash).toBe(cashBefore);
		expect(store.galleryHistory.length).toBe(galleryBefore);
		expect(store.reputation).toBe(repBefore);
		expect(store.unlockedMediumTierIds).toEqual(unlocksBefore);
		expect(persistSave).toHaveBeenCalled();
		const lastSave = persistSave.mock.calls.at(-1)?.[0] as SaveData;
		expect(lastSave.careerMilestoneAcknowledged).toBe(true);
	});

	it('after milestone acknowledged, further collects stay idle without re-overlay', async () => {
		const store = createStore({
			generate: vi.fn(async ({ playerPrompt }) => ({ ...fakeArtwork, playerPrompt })),
			critique: vi.fn(async () => fakeDraft)
		});
		store.cash = LEVEL_1.targetCash;
		store.careerMilestoneAcknowledged = true;

		for (let i = 0; i < LEVEL_1.targetCommissions; i++) {
			store.inviteClient();
			store.draftPrompt = 'a cozy coffee cup on a wooden table';
			await store.createArt();
			await store.confirmSubmitChoice('ai', null);
			await store.collectCash();
		}

		expect(store.phase).toBe('idle');
		expect(store.commissionsCompleted).toBe(5);
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
					reputation: 60,
					// Past opener guarantee so prestige tiers can appear in the pool.
					lifetimeCommissions: 4
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

		await submitAi(store);

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

		await submitAi(store);

		const base = calculatePayout(
			store.currentClient,
			fakeDraft.accuracyScore,
			scorePrompt(store.currentClient, store.draftPrompt).creativityScore,
			store.presentationMultiplier
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

		await submitAi(store);

		const base = calculatePayout(
			store.currentClient,
			fakeDraft.accuracyScore,
			scorePrompt(store.currentClient, store.draftPrompt).creativityScore,
			store.presentationMultiplier
		);
		expect(store.currentCritique?.finalPayout).toBe(base);
	});

	it('unlockMediumTier succeeds when the player can afford pencil', () => {
		const persistSave = vi.fn();
		const store = createStore(
			{
				generate: vi.fn(),
				critique: vi.fn()
			},
			{
				persistSave,
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => 1_000),
					cash: 300,
					reputation: 5
				})
			}
		);

		expect(store.unlockMediumTier('pencil')).toBe(true);
		expect(store.cash).toBe(285);
		expect(store.activeMediumTierId).toBe('pencil');
		expect(store.unlockedMediumTierIds).toContain('pencil');
		expect(persistSave).toHaveBeenCalledOnce();
	});

	it('unlockMediumTier fails when cash is insufficient', () => {
		const persistSave = vi.fn();
		const store = createStore(
			{
				generate: vi.fn(),
				critique: vi.fn()
			},
			{
				persistSave,
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => 1_000),
					cash: 10,
					reputation: 5
				})
			}
		);

		expect(store.unlockMediumTier('pencil')).toBe(false);
		expect(store.cash).toBe(10);
		expect(store.activeMediumTierId).toBe('crayon');
		expect(persistSave).not.toHaveBeenCalled();
	});

	it('unlockMediumTier refuses to re-buy crayon', () => {
		const store = createStore({
			generate: vi.fn(),
			critique: vi.fn()
		});

		expect(store.unlockMediumTier('crayon')).toBe(false);
	});

	it('setActiveMediumTier no-ops for locked tiers', () => {
		const store = createStore({
			generate: vi.fn(),
			critique: vi.fn()
		});

		store.setActiveMediumTier('oil');
		expect(store.activeMediumTierId).toBe('crayon');
	});

	it('createArt uses the active medium prompt suffix', async () => {
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
		store.unlockedMediumTierIds = ['crayon', 'oil'];
		store.activeMediumTierId = 'oil';
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';

		await store.createArt();

		expect(generate).toHaveBeenCalledOnce();
		const args = generate.mock.calls[0][0];
		expect(args.prompt).toContain(getMediumTier('oil').promptModifierSuffix);
		expect(args.prompt.endsWith(mediumSkillBackground(1))).toBe(true);
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
		expect(store.cash).toBe(370);
		expect(store.unlockedVenueId).toBe('garage');
		expect(persistSave).toHaveBeenCalledOnce();
		expect(store.displayedGalleryEntries.length).toBeLessThanOrEqual(8);
	});

	it('unlockVenue refuses when unaffordable or when skipping tiers', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		store.cash = 20;
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
		startNonMumBriefing(store);
		store.draftPrompt = 'a cozy coffee cup on a wooden table';

		await submitAi(store);

		expect(store.currentCritique?.finalPayout).toBe(
			calculatePayout(
				store.currentClient!,
				store.currentCritique!.accuracyScore,
				store.currentCritique!.creativityScore,
				store.presentationMultiplier
			)
		);
	});

	it('hireStaff deducts cash, raises incomePerSecond, and persists', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		store.cash = 800;
		store.reputation = 8;

		expect(store.hireStaff('apprentice')).toBe(true);
		expect(store.cash).toBe(0);
		expect(store.hiredStaffIds).toEqual(['apprentice']);
		expect(store.incomePerSecond).toBe(0.05);
		expect(persistSave).toHaveBeenCalledOnce();
	});

	it('hireStaff refuses a second hire of the same role', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		store.cash = 2000;
		store.reputation = 8;

		expect(store.hireStaff('apprentice')).toBe(true);
		persistSave.mockClear();
		expect(store.hireStaff('apprentice')).toBe(false);
		expect(store.cash).toBe(1200);
		expect(persistSave).not.toHaveBeenCalled();
	});

	it('startIncomeTicker catch-up sets cash and idleEarningsToShow', () => {
		const nowMs = 100_000;
		const store = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{
				now: () => nowMs,
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => nowMs),
					cash: 100,
					hiredStaffIds: ['apprentice'],
					lastIncomeTickAt: 40_000
				})
			}
		);

		const expected = computeIdleEarnings(40_000, 100_000, 0.05);
		const cleanup = store.startIncomeTicker();
		expect(expected.earned).toBe(3);
		expect(store.cash).toBe(103);
		expect(store.idleEarningsToShow).toBe(3);
		cleanup();
	});

	it('startIncomeTicker with no income roles leaves cash and modal unset', () => {
		const store = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{
				now: () => 100_000,
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => 100_000),
					cash: 100,
					hiredStaffIds: [],
					lastIncomeTickAt: 40_000
				})
			}
		);

		const cleanup = store.startIncomeTicker();
		expect(store.cash).toBe(100);
		expect(store.idleEarningsToShow).toBeNull();
		cleanup();
	});

	it('marketing director auto-invites after BASE_AUTO_INVITE_DELAY_MS / 3', () => {
		vi.useFakeTimers();
		try {
			const store = createStore({ generate: vi.fn(), critique: vi.fn() });
			store.cash = 2200;
			store.reputation = 14;
			expect(store.hireStaff('marketing-director')).toBe(true);
			expect(store.phase).toBe('idle');

			vi.advanceTimersByTime(BASE_AUTO_INVITE_DELAY_MS / 3);
			expect(store.phase).toBe('briefing');
			expect(store.currentClient).not.toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it('setAutoInviteAction overrides Marketing Director arrival without changing phase', () => {
		vi.useFakeTimers();
		try {
			const action = vi.fn();
			const store = createStore({ generate: vi.fn(), critique: vi.fn() });
			store.setAutoInviteAction(action);
			store.cash = 2200;
			store.reputation = 14;
			expect(store.hireStaff('marketing-director')).toBe(true);

			vi.advanceTimersByTime(BASE_AUTO_INVITE_DELAY_MS / 3);
			expect(action).toHaveBeenCalledOnce();
			expect(store.phase).toBe('idle');
			expect(store.currentClient).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it('auto-invites on the base timer without marketing director', () => {
		vi.useFakeTimers();
		try {
			const store = createStore({ generate: vi.fn(), critique: vi.fn() });
			expect(store.phase).toBe('idle');

			vi.advanceTimersByTime(BASE_AUTO_INVITE_DELAY_MS - 1);
			expect(store.phase).toBe('idle');

			vi.advanceTimersByTime(1);
			expect(store.phase).toBe('briefing');
			expect(store.currentClient).not.toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it('curator orders displayedGalleryEntries by score descending', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.cash = 3000;
		store.reputation = 18;
		store.galleryHistory = [
			{
				id: 'recent-low',
				imageUrl: '/a.png',
				title: 'A',
				payout: 10,
				score: 4,
				clientName: 'C',
				briefId: 'c1',
				completedAt: 900
			},
			{
				id: 'older-high',
				imageUrl: '/b.png',
				title: 'B',
				payout: 10,
				score: 9,
				clientName: 'C',
				briefId: 'c2',
				completedAt: 100
			},
			{
				id: 'mid',
				imageUrl: '/c.png',
				title: 'C',
				payout: 10,
				score: 7,
				clientName: 'C',
				briefId: 'c3',
				completedAt: 500
			}
		];

		expect(store.displayedGalleryEntries.map((e) => e.id)).toEqual([
			'recent-low',
			'mid',
			'older-high'
		]);

		expect(store.hireStaff('curator')).toBe(true);
		expect(store.displayedGalleryEntries.map((e) => e.id)).toEqual([
			'older-high',
			'mid',
			'recent-low'
		]);
		expect(store.activeLayoutId).toBe('cluttered');
	});

	it('curator uses best owned layout for presentationMultiplier without mutating activeLayoutId', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.cash = 10_000;
		store.reputation = 18;
		store.unlockLayout('tidy-rows');
		store.setActiveLayout('cluttered');
		expect(store.activeLayoutId).toBe('cluttered');
		expect(store.presentationMultiplier).toBe(1);

		expect(store.hireStaff('curator')).toBe(true);
		expect(store.activeLayoutId).toBe('cluttered');
		expect(store.effectiveLayoutId).toBe('tidy-rows');
		expect(store.presentationMultiplier).toBeCloseTo(1.05, 5);
	});

	it('reset clears hired staff and idle earnings', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.cash = 800;
		store.reputation = 8;
		store.hireStaff('apprentice');
		store.idleEarningsToShow = 12;

		store.reset();

		expect(store.hiredStaffIds).toEqual([]);
		expect(store.incomePerSecond).toBe(0);
		expect(store.idleEarningsToShow).toBeNull();
	});

	it('hydrates skill XP from save into skillProgressList', () => {
		const store = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => 1_000),
					skillXpPrompting: 15
				})
			}
		);

		const prompting = store.skillProgressList.find((s) => s.id === 'prompting');
		expect(prompting?.level).toBe(2);
	});

	it('sets pendingSkillGains in results and applies XP on collectCash', async () => {
		const store = createStore({
			generate: vi.fn(async () => fakeArtwork),
			critique: vi.fn(async () => ({
				title: 'Morning Coffee',
				accuracyScore: 8,
				criticReview: 'Solid.'
			}))
		});
		startNonMumBriefing(store);
		store.draftPrompt = 'a cozy coffee cup on a wooden table with warm light steam';
		await submitAi(store);

		expect(store.phase).toBe('results');
		expect(store.pendingSkillGains).not.toBeNull();
		expect(store.currentCritique).not.toBeNull();

		const expected = previewSkillGains({
			accuracyScore: store.currentCritique!.accuracyScore,
			creativityScore: store.currentCritique!.creativityScore,
			finalPayout: store.currentCritique!.finalPayout
		});
		expect(store.pendingSkillGains).toEqual(expected);

		await store.collectCash();

		expect(store.pendingSkillGains).toBeNull();
		expect(store.skillXp.prompting).toBe(expected.prompting);
		expect(store.skillXp.imagination).toBe(expected.imagination);
		expect(store.skillXp.hustle).toBe(expected.hustle);
		expect(store.lastCollectedGains?.skills).toEqual(expected);
		store.clearLastCollectedGains();
		expect(store.lastCollectedGains).toBeNull();
	});

	it('folds skillPayoutMultiplier into non-auction presentationMultiplier', () => {
		const empty = createStore({ generate: vi.fn(), critique: vi.fn() });
		expect(empty.presentationMultiplier).toBe(1);

		const level4 = xpThresholdForLevel(4);
		const skilled = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => 1_000),
					skillXpPrompting: level4,
					skillXpImagination: level4,
					skillXpHustle: level4
				})
			}
		);
		expect(skillPayoutMultiplier(skilled.skillXp)).toBe(1.09);
		expect(skilled.presentationMultiplier).toBeCloseTo(1.09, 5);
	});

	it('commission channels progress by venue (P27)', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		expect(store.commissionChannel).toBe('none');
		expect(store.commissionBoardAvailable).toBe(false);
		expect(store.receptionistAvailable).toBe(false);

		store.cash = 50;
		store.reputation = 4;
		expect(store.unlockVenue('garage')).toBe(true);
		expect(store.commissionChannel).toBe('letterbox');
		expect(store.commissionBoardAvailable).toBe(true);
		expect(store.receptionistAvailable).toBe(false);

		store.cash = 200;
		store.reputation = 8;
		expect(store.unlockVenue('storefront')).toBe(true);
		expect(store.commissionChannel).toBe('computer');
		expect(store.commissionBoardAvailable).toBe(true);
		expect(store.receptionistAvailable).toBe(false);

		store.cash = 500;
		store.reputation = 14;
		expect(store.unlockVenue('gallery-hall')).toBe(true);
		expect(store.commissionChannel).toBe('receptionist');
		expect(store.commissionBoardAvailable).toBe(true);
		expect(store.receptionistAvailable).toBe(true);
	});

	it('hireArtist and assignBriefToArtist complete via work ticker', () => {
		vi.useFakeTimers();
		try {
			let nowMs = 1000;
			const store = createStore(
				{ generate: vi.fn(), critique: vi.fn() },
				{ now: () => nowMs, tickIntervalMs: 500 }
			);
			store.cash = 100;
			store.reputation = 8;
			expect(store.hireArtist('jade-ink')).toBe(true);
			store.inviteClient();
			expect(store.assignBriefToArtist('jade-ink')).toBe(true);
			expect(store.artistAssignment).not.toBeNull();

			const cleanup = store.startIncomeTicker();
			nowMs += 9000;
			vi.advanceTimersByTime(500);
			expect(store.phase).toBe('results');
			expect(store.currentCritique).not.toBeNull();
			expect(store.artistAssignment).toBeNull();
			expect(store.hiredArtists[0]?.xp).toBe(25);
			cleanup();
		} finally {
			vi.useRealTimers();
		}
	});

	it('acceptBoardBrief sets chosen client in briefing', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { random: () => 0 });
		const offers = store.pickCommissionBoardOffers(2);
		store.acceptBoardBrief(offers[0]);
		expect(store.phase).toBe('briefing');
		expect(store.currentClient?.id).toBe(offers[0].id);
	});

	it('declineClient clears briefing without payout or reputation change', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { random: () => 0 });
		store.inviteClient();
		expect(store.phase).toBe('briefing');
		expect(store.currentClient).not.toBeNull();
		store.draftPrompt = 'a cat';
		const cashBefore = store.cash;
		const repBefore = store.reputation;
		const commissionsBefore = store.commissionsCompleted;
		store.declineClient();
		expect(store.phase).toBe('idle');
		expect(store.currentClient).toBeNull();
		expect(store.draftPrompt).toBe('');
		expect(store.cash).toBe(cashBefore);
		expect(store.reputation).toBe(repBefore);
		expect(store.commissionsCompleted).toBe(commissionsBefore);
	});

	it('declineClient clears generating without payout and unlocks engine switching', async () => {
		let resolveGenerate!: (value: Artwork) => void;
		const generatePromise = new Promise<Artwork>((resolve) => {
			resolveGenerate = resolve;
		});
		const setSwitchingLocked = vi.fn();
		const store = createStore(
			{
				generate: vi.fn(() => generatePromise),
				critique: vi.fn()
			},
			{ random: () => 0, setSwitchingLocked }
		);
		store.inviteClient();
		store.draftPrompt = 'a cat';
		const cashBefore = store.cash;
		const repBefore = store.reputation;
		void store.createArt();
		expect(store.phase).toBe('generating');
		expect(setSwitchingLocked).toHaveBeenCalledWith(true);
		store.declineClient();
		expect(store.phase).toBe('idle');
		expect(store.currentClient).toBeNull();
		expect(store.pendingSubmitChoice).toBe(false);
		expect(store.aiGeneratedImageUrl).toBeNull();
		expect(store.workStartedAt).toBeNull();
		expect(store.cash).toBe(cashBefore);
		expect(store.reputation).toBe(repBefore);
		expect(setSwitchingLocked).toHaveBeenCalledWith(false);
		resolveGenerate(fakeArtwork);
		await generatePromise;
		expect(store.phase).toBe('idle');
		expect(store.currentArtwork).toBeNull();
	});

	it('declineClient clears pending submit choice during generating', async () => {
		const store = createStore(
			{ generate: vi.fn(async () => fakeArtwork), critique: vi.fn() },
			{ random: () => 0 }
		);
		store.inviteClient();
		store.draftPrompt = 'a cat';
		await store.createArt();
		expect(store.pendingSubmitChoice).toBe(true);
		expect(store.aiGeneratedImageUrl).toBe(fakeArtwork.imageUrl);
		store.declineClient();
		expect(store.phase).toBe('idle');
		expect(store.currentClient).toBeNull();
		expect(store.pendingSubmitChoice).toBe(false);
		expect(store.aiGeneratedImageUrl).toBeNull();
	});

	it('declineClient is a no-op outside briefing and generating', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { random: () => 0 });
		store.declineClient();
		expect(store.phase).toBe('idle');
		store.inviteClient();
		store.phase = 'results';
		store.currentClient = KITCHEN_BRIEFS[0]!;
		store.declineClient();
		expect(store.phase).toBe('results');
		store.phase = 'critiquing';
		store.declineClient();
		expect(store.phase).toBe('critiquing');
	});

	it('major project beat completes and payout collects', () => {
		vi.useFakeTimers();
		try {
			let nowMs = 5000;
			const store = createStore(
				{ generate: vi.fn(), critique: vi.fn() },
				{ now: () => nowMs, tickIntervalMs: 200 }
			);
			store.reputation = 12;
			store.cash = 100;
			expect(store.hireArtist('jade-ink')).toBe(true);
			expect(store.acceptMajorProject('comic-lunch-legend')).toBe(true);
			expect(store.assignCrewToBeat(0, 'jade-ink')).toBe(true);
			expect(store.startMajorProjectBeat(0)).toBe(true);

			const cleanup = store.startIncomeTicker();
			nowMs += 15_000;
			vi.advanceTimersByTime(200);
			expect(store.majorProjectProgress?.beatsCompleted).toBe(1);
			cleanup();
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('GameStore save slots', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createMemoryStorage());
	});

	function createSlotStore(now = () => 1_000) {
		return new GameStore({
			engine: { generate: vi.fn(), critique: vi.fn() },
			random: () => 0,
			now,
			setSwitchingLocked: vi.fn()
		});
	}

	it('switchToSlot mid-commission lands idle with the other slot cash and unlocks', () => {
		const store = createSlotStore();
		store.cash = 250;
		store.unlockedMediumTierIds = ['crayon', 'pencil'];
		store.activeMediumTierId = 'pencil';
		store.newGameInSlot('1', 'Kitchen');
		expect(store.activeSaveSlotId).toBe('1');
		expect(store.cash).toBe(LEVEL_1.startingCash);

		store.cash = 500;
		store.reputation = 3;
		store.inviteClient();
		expect(store.phase).toBe('briefing');

		store.switchToSlot('0');
		expect(store.phase).toBe('idle');
		expect(store.currentClient).toBeNull();
		expect(store.activeSaveSlotId).toBe('0');
		expect(store.cash).toBe(250);
		expect(store.unlockedMediumTierIds).toEqual(['crayon', 'pencil']);
		expect(store.activeMediumTierId).toBe('pencil');
	});

	it('slot switch closes practice', () => {
		const store = createSlotStore();
		expect(store.enterPractice()).toBe(true);
		store.newGameInSlot('1', 'Kitchen');
		expect(store.practiceOpen).toBe(false);
		expect(store.phase).toBe('idle');
	});

	it('newGameInSlot / rename / copy / delete cover slot helpers', () => {
		const store = createSlotStore(() => 42);
		store.cash = 333;
		store.skillXp = { prompting: 15, imagination: 0, hustle: 0 };
		store.newGameInSlot('1', 'Kitchen');
		expect(getActiveSlotId()).toBe('1');
		expect(listSaveSlots()[1].name).toBe('Kitchen');
		expect(peekSlot('0', LEVEL_1.startingCash)?.cash).toBe(333);
		expect(peekSlot('0', LEVEL_1.startingCash)?.skillXpPrompting).toBe(15);

		store.renameSaveSlot('1', 'Museum');
		expect(store.saveSlotsList[1].name).toBe('Museum');

		store.cash = 200;
		store.skillXp = { prompting: 5, imagination: 0, hustle: 0 };
		store.switchToSlot('0');
		store.switchToSlot('1');
		store.copySaveSlot('1', '2');
		expect(peekSlot('2', LEVEL_1.startingCash)?.cash).toBe(200);
		expect(peekSlot('2', LEVEL_1.startingCash)?.skillXpPrompting).toBe(5);
		expect(listSaveSlots()[2].name).toBe('Slot 3');

		store.deleteSaveSlot('1');
		expect(listSaveSlots()[1].empty).toBe(true);
		expect(store.activeSaveSlotId).toBe('0');
		expect(store.cash).toBe(333);
	});

	it('preserves Spec 20 skill XP fields across slot switch', () => {
		const store = createSlotStore();
		store.skillXp = { prompting: 15, imagination: 8, hustle: 4 };
		store.newGameInSlot('1', 'Fresh');
		expect(store.skillXp).toEqual({ prompting: 0, imagination: 0, hustle: 0 });
		store.switchToSlot('0');
		expect(store.skillXp).toEqual({ prompting: 15, imagination: 8, hustle: 4 });
	});
});

describe('GameStore Spec 23 dev cheats', () => {
	it('devImportSave rejects invalid JSON', () => {
		const store = createStore({
			generate: async () => fakeArtwork,
			critique: async () => fakeDraft
		});
		expect(store.devImportSave('{')).toEqual({
			ok: false,
			error: 'Invalid save JSON'
		});
	});

	it('devImportSave accepts valid SaveData and applies cash', () => {
		const store = createStore({
			generate: async () => fakeArtwork,
			critique: async () => fakeDraft
		});
		const raw = JSON.stringify(createDefaultSave(250, () => 1_000));
		expect(store.devImportSave(raw)).toEqual({ ok: true });
		expect(store.cash).toBe(250);
		expect(store.phase).toBe('idle');
	});

	it('devSetCash clamps and unlock-all grants progression', () => {
		const store = createStore({
			generate: async () => fakeArtwork,
			critique: async () => fakeDraft
		});
		store.devSetCash(-1);
		expect(store.cash).toBe(0);
		store.devSetCash(3.7);
		expect(store.cash).toBe(3);
		store.devUnlockAllProgression();
		expect(store.unlockedMediumTierIds.length).toBeGreaterThan(1);
		expect(store.hiredStaffIds.length).toBeGreaterThan(0);
		expect(store.reputation).toBeGreaterThanOrEqual(50);
		expect(store.unlockedVenueId).toBe('mega-museum');
	});

	it('devForceIdle aborts an in-flight commission', async () => {
		let releaseGenerate!: (art: Artwork) => void;
		const generateGate = new Promise<Artwork>((resolve) => {
			releaseGenerate = resolve;
		});
		const store = createStore({
			generate: () => generateGate,
			critique: async () => fakeDraft
		});
		store.inviteClient();
		store.draftPrompt = 'a cozy coffee cup on a wooden table';
		const pending = store.createArt();
		expect(store.phase).toBe('generating');
		store.devForceIdle();
		expect(store.phase).toBe('idle');
		expect(store.currentClient).toBeNull();
		releaseGenerate(fakeArtwork);
		await pending;
		expect(store.phase).toBe('idle');
	});
});

describe('GameStore Spec 27 medium skill', () => {
	it('createArt uses the player pencil Master suffix at 810 XP', async () => {
		const generate = vi.fn(
			async ({ playerPrompt, prompt: builtPrompt }: { playerPrompt: string; prompt: string }) => {
				void builtPrompt;
				return { ...fakeArtwork, playerPrompt };
			}
		);
		const store = createStore({ generate, critique: vi.fn(async () => fakeDraft) });
		store.unlockedMediumTierIds = ['crayon', 'pencil'];
		store.activeMediumTierId = 'pencil';
		store.playerMediumSkillXp = { pencil: 810 };
		store.inviteClient();
		store.draftPrompt = 'an apple';

		await store.createArt();

		expect(generate).toHaveBeenCalledOnce();
		const args = generate.mock.calls[0]?.[0];
		expect(args?.prompt).toBe(
			`an apple, ${mediumSkillSuffix('pencil', 7)}, ${mediumSkillBackground(7)}`
		);
	});

	it('grants 1 pencil XP after 8000ms generating and none while idle', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.unlockedMediumTierIds = ['crayon', 'pencil'];
		store.activeMediumTierId = 'pencil';
		store.phase = 'generating';
		store.tickMediumSkillsForTests(8_000);
		expect(store.playerMediumSkillXp.pencil).toBe(1);

		store.phase = 'idle';
		const before = { ...store.playerMediumSkillXp };
		store.tickMediumSkillsForTests(8_000);
		expect(store.playerMediumSkillXp).toEqual(before);
	});

	it('grants hired artist idle XP into the active medium and work XP into the assignment medium', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.cash = 100;
		store.reputation = 8;
		store.unlockedMediumTierIds = ['crayon', 'pencil', 'ink'];
		store.activeMediumTierId = 'pencil';
		expect(store.hireArtist('jade-ink')).toBe(true);

		store.tickMediumSkillsForTests(60_000);
		expect(store.hiredArtists[0]?.mediumSkillXp.pencil).toBe(1);

		store.inviteClient();
		store.activeMediumTierId = 'ink';
		expect(store.assignBriefToArtist('jade-ink')).toBe(true);
		store.tickMediumSkillsForTests(2_000);
		expect(store.hiredArtists[0]?.mediumSkillXp.ink).toBe(1);
		expect(store.hiredArtists[0]?.mediumSkillXp.pencil).toBe(1);
	});

	it('clamps artist idle catch-up to 10 minutes (10 XP at the idle rate)', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.cash = 100;
		store.reputation = 8;
		store.activeMediumTierId = 'pencil';
		expect(store.hireArtist('jade-ink')).toBe(true);
		store.tickMediumSkillsForTests(999_999);
		expect(store.hiredArtists[0]?.mediumSkillXp.pencil).toBe(10);
	});

	it('stamps a null lastMediumSkillTickAt on hydrate so the first tick grants 0 artist XP', () => {
		const nowMs = 5_000;
		const store = createStore(
			{ generate: vi.fn(), critique: vi.fn() },
			{
				now: () => nowMs,
				loadSave: () => ({
					...createDefaultSave(LEVEL_1.startingCash, () => nowMs),
					cash: 100,
					reputation: 8,
					hiredArtists: [{ catalogId: 'jade-ink', xp: 0, mediumSkillXp: {} }],
					lastMediumSkillTickAt: null
				})
			}
		);
		expect(store.lastMediumSkillTickAt).toBe(nowMs);
		expect(store.hiredArtists[0]?.mediumSkillXp).toEqual({});
		const cleanup = store.startIncomeTicker();
		expect(store.hiredArtists[0]?.mediumSkillXp.pencil ?? 0).toBe(0);
		cleanup();
	});

	it('grantPracticeDrawingMs banks remainder across two 2000ms strokes', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		expect(store.enterPractice()).toBe(true);
		store.grantPracticeDrawingMs(2000);
		expect(store.playerMediumSkillXp.crayon ?? 0).toBe(0);
		expect(persistSave).not.toHaveBeenCalled();
		store.grantPracticeDrawingMs(2000);
		expect(store.playerMediumSkillXp.crayon).toBe(1);
		expect(persistSave).toHaveBeenCalled();
		store.grantPracticeDrawingMs(2000);
		expect(store.playerMediumSkillXp.crayon).toBe(2);
	});

	it('enterPractice succeeds while idle and rejects briefing or assignment', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		expect(store.enterPractice()).toBe(true);
		expect(store.practiceOpen).toBe(true);
		expect(store.enterPractice()).toBe(false);

		store.exitPractice();
		expect(store.practiceOpen).toBe(false);
		expect(store.enterPractice()).toBe(true);
		store.exitPractice();

		store.inviteClient();
		expect(store.enterPractice()).toBe(false);
	});

	it('enterPractice is blocked while an artist assignment is set', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.artistAssignment = {
			artistCatalogId: 'jade-ink',
			briefId: 'c1',
			startedAt: 1000,
			durationMs: 5000,
			mediumTierId: 'crayon'
		};
		expect(store.enterPractice()).toBe(false);
		expect(store.practiceOpen).toBe(false);
	});

	it('enterPractice is blocked during an active major-project beat', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.majorProjectProgress = {
			projectId: 'comic',
			beatsCompleted: 0,
			crewByBeat: ['jade-ink'],
			activeBeatIndex: 0,
			beatStartedAt: 1000,
			beatDurationMs: 8000
		};
		expect(store.enterPractice()).toBe(false);
	});

	it('inviteClient while practising closes the canvas', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		expect(store.enterPractice()).toBe(true);
		store.inviteClient();
		expect(store.practiceOpen).toBe(false);
		expect(store.phase).toBe('briefing');
	});

	it('reset closes practice', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		expect(store.enterPractice()).toBe(true);
		store.reset();
		expect(store.practiceOpen).toBe(false);
	});

	it('grantPracticeDrawingMs while open grants 1 XP per 3000ms', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		expect(store.enterPractice()).toBe(true);
		store.grantPracticeDrawingMs(3000);
		expect(store.playerMediumSkillXp.crayon).toBe(1);
	});

	it('grantPracticeDrawingMs while closed grants no XP', () => {
		const persistSave = vi.fn();
		const store = createStore({ generate: vi.fn(), critique: vi.fn() }, { persistSave });
		store.grantPracticeDrawingMs(10_000);
		expect(store.playerMediumSkillXp.crayon ?? 0).toBe(0);
		expect(persistSave).not.toHaveBeenCalled();
	});

	it('practice XP crossing 60 on pencil surfaces Doodler rank-up', () => {
		const store = createStore({ generate: vi.fn(), critique: vi.fn() });
		store.unlockedMediumTierIds = ['crayon', 'pencil'];
		store.setActiveMediumTier('pencil');
		store.playerMediumSkillXp = { pencil: 59 };
		expect(store.enterPractice()).toBe(true);
		store.grantPracticeDrawingMs(3000);
		expect(store.playerMediumSkillXp.pencil).toBe(60);
		expect(store.lastMediumSkillRankUp).toEqual({ mediumId: 'pencil', rankLabel: 'Doodler' });
	});

	it('auto-invite stays paused while practising and resumes after exit', () => {
		vi.useFakeTimers();
		try {
			const store = createStore({ generate: vi.fn(), critique: vi.fn() });
			expect(store.enterPractice()).toBe(true);
			vi.advanceTimersByTime(BASE_AUTO_INVITE_DELAY_MS);
			expect(store.phase).toBe('idle');
			expect(store.currentClient).toBeNull();
			store.exitPractice();
			vi.advanceTimersByTime(BASE_AUTO_INVITE_DELAY_MS);
			expect(store.phase).toBe('briefing');
			expect(store.practiceOpen).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it('artist generate uses the skill suffix and lands the engine image', async () => {
		vi.useFakeTimers();
		try {
			let nowMs = 1000;
			const artistArt: Artwork = {
				id: 'artist-gen',
				imageUrl: 'data:image/png;base64,abc',
				playerPrompt: '[Jade Ink] brief',
				width: 384,
				height: 384,
				generationMs: 12,
				engineId: 'mock'
			};
			const generate = vi.fn(
				async ({ playerPrompt, prompt: builtPrompt }: { playerPrompt: string; prompt: string }) => {
					void playerPrompt;
					void builtPrompt;
					return artistArt;
				}
			);
			const store = createStore(
				{ generate, critique: vi.fn() },
				{ now: () => nowMs, tickIntervalMs: 500 }
			);
			store.cash = 100;
			store.reputation = 8;
			store.unlockedMediumTierIds = ['crayon', 'pencil'];
			store.activeMediumTierId = 'pencil';
			expect(store.hireArtist('jade-ink')).toBe(true);
			store.inviteClient();
			expect(store.assignBriefToArtist('jade-ink')).toBe(true);
			await Promise.resolve();
			await Promise.resolve();
			expect(generate).toHaveBeenCalledOnce();
			const args = generate.mock.calls[0]?.[0];
			expect(args?.prompt).toContain(mediumSkillSuffix('pencil', 1));
			expect(args?.prompt.endsWith(mediumSkillBackground(1))).toBe(true);

			const cleanup = store.startIncomeTicker();
			nowMs += 9000;
			vi.advanceTimersByTime(500);
			expect(store.phase).toBe('results');
			expect(store.currentArtwork?.imageUrl).toBe('data:image/png;base64,abc');
			cleanup();
		} finally {
			vi.useRealTimers();
		}
	});

	it('falls back to SVG mock art when artist generate rejects', async () => {
		vi.useFakeTimers();
		try {
			let nowMs = 1000;
			const generate = vi.fn(async () => {
				throw new Error('engine down');
			});
			const store = createStore(
				{ generate, critique: vi.fn() },
				{ now: () => nowMs, tickIntervalMs: 500 }
			);
			store.cash = 100;
			store.reputation = 8;
			expect(store.hireArtist('jade-ink')).toBe(true);
			store.inviteClient();
			expect(store.assignBriefToArtist('jade-ink')).toBe(true);
			await Promise.resolve();
			await Promise.resolve();
			const cleanup = store.startIncomeTicker();
			nowMs += 9000;
			vi.advanceTimersByTime(500);
			expect(store.phase).toBe('results');
			expect(store.currentArtwork?.imageUrl.startsWith('data:image/svg+xml')).toBe(true);
			cleanup();
		} finally {
			vi.useRealTimers();
		}
	});

	it('ignores a late artist generate after declineClient', async () => {
		let resolveGenerate!: (value: Artwork) => void;
		const generatePromise = new Promise<Artwork>((resolve) => {
			resolveGenerate = resolve;
		});
		const store = createStore({ generate: vi.fn(() => generatePromise), critique: vi.fn() });
		store.cash = 100;
		store.reputation = 8;
		expect(store.hireArtist('jade-ink')).toBe(true);
		store.inviteClient();
		expect(store.assignBriefToArtist('jade-ink')).toBe(true);
		store.declineClient();
		expect(store.currentArtwork).toBeNull();
		resolveGenerate({
			id: 'late',
			imageUrl: 'data:image/png;base64,late',
			playerPrompt: 'late',
			width: 8,
			height: 8,
			generationMs: 1,
			engineId: 'mock'
		});
		await generatePromise;
		await Promise.resolve();
		expect(store.currentArtwork).toBeNull();
		expect(store.phase).toBe('idle');
	});
});

afterEach(() => {
	vi.useRealTimers();
});
