import { LEVEL_1_BRIEFS } from '$lib/data/briefs';
import { pickMumPraiseLine, praiseSeedFromArtworkId } from '$lib/game/mumCritiquePresentation';
import type { Artwork, Critique } from '$lib/types/contracts';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StudioHudOverlay from './StudioHudOverlay.svelte';

const artwork: Artwork = {
	id: 'a1',
	imageUrl: 'data:image/svg+xml,%3Csvg/%3E',
	playerPrompt: 'a cat',
	width: 64,
	height: 64,
	generationMs: 1,
	engineId: 'mock'
};

const critique: Critique = {
	title: 'Cat Study',
	accuracyScore: 8,
	creativityScore: 3,
	criticReview: 'Nice cat.',
	finalPayout: 40
};

const base = {
	idleMessage: 'Quiet kitchen.',
	loadingMessages: ['painting…'],
	critiqueMessages: ['looking…'],
	currentClient: null as (typeof LEVEL_1_BRIEFS)[0] | null,
	currentArtwork: null as Artwork | null,
	currentCritique: null as Critique | null,
	currentAuctionResult: null,
	errorMessage: null,
	generationProgress: null,
	draftPrompt: '',
	clientSummoned: false,
	studioDebug: false,
	floorInteract: true,
	oninvite: vi.fn(),
	ontalk: vi.fn(),
	ondeliver: vi.fn(),
	onsubmit: vi.fn(),
	oncollect: vi.fn(),
	onretry: vi.fn(),
	ondismisserror: vi.fn(),
	ondecline: vi.fn()
};

test('idle shows waiting copy without invite button', async () => {
	const screen = render(StudioHudOverlay, { ...base, phase: 'idle' });
	await expect.element(screen.getByText(/Walk with WASD/)).toBeVisible();
	await expect.element(screen.getByText('Quiet kitchen.')).toBeVisible();
	await expect
		.element(screen.getByRole('button', { name: 'Wait for a Client' }))
		.not.toBeInTheDocument();
});

test('briefing shows prompt composer without sketch pad', async () => {
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'briefing',
		currentClient: LEVEL_1_BRIEFS[0]
	});
	await expect.element(screen.getByLabelText('Your prompt')).toBeVisible();
	await expect.element(screen.getByText('Mum')).toBeVisible();
	await expect.element(screen.getByLabelText('Sketch canvas')).not.toBeInTheDocument();
});

test('briefing decline button fires ondecline', async () => {
	const ondecline = vi.fn();
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'briefing',
		currentClient: LEVEL_1_BRIEFS[0],
		ondecline
	});
	await screen.getByRole('button', { name: 'Decline commission' }).click();
	expect(ondecline).toHaveBeenCalledTimes(1);
});

test('generating shows sketch pad while waiting', async () => {
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'generating',
		currentClient: LEVEL_1_BRIEFS[0]
	});
	await expect.element(screen.getByLabelText('Sketch canvas')).toBeVisible();
	await expect.element(screen.getByText(/Paint on the canvas while you wait/)).toBeVisible();
});

test('generating submit choice keeps sketch pad visible with AI preview below', async () => {
	const onconfirmsubmit = vi.fn();
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'generating',
		currentClient: LEVEL_1_BRIEFS[0],
		pendingSubmitChoice: true,
		aiGeneratedImageUrl: artwork.imageUrl,
		onconfirmsubmit
	});
	const sketchCanvas = screen.getByLabelText('Sketch canvas');
	const aiImage = screen.getByAltText('Generated art from your prompt');
	await expect.element(sketchCanvas).toBeVisible();
	await expect.element(aiImage).toBeVisible();
	expect(
		sketchCanvas.element().compareDocumentPosition(aiImage.element()) &
			Node.DOCUMENT_POSITION_FOLLOWING
	).toBeTruthy();
	await expect.element(screen.getByText(/keep painting or choose what to submit/)).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Submit AI image' })).toBeVisible();
	const drawingBtn = screen.getByRole('button', { name: 'Submit your drawing' });
	await expect.element(drawingBtn).toBeVisible();
	await expect.element(drawingBtn).toBeDisabled();
	await screen.getByRole('button', { name: 'Submit AI image' }).click();
	expect(onconfirmsubmit).toHaveBeenCalledWith('ai');
});

test('studioDebug talk button appears when client is summoned', async () => {
	const ontalk = vi.fn();
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'idle',
		clientSummoned: true,
		studioDebug: true,
		ontalk
	});
	await screen.getByTestId('studio-debug-talk').click();
	expect(ontalk).toHaveBeenCalledTimes(1);
});

test('results shows deliver hint and hides Collect Cash on the floor', async () => {
	const ondeliver = vi.fn();
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'results',
		currentClient: LEVEL_1_BRIEFS[0],
		currentArtwork: artwork,
		currentCritique: critique,
		studioDebug: true,
		ondeliver
	});
	await expect.element(screen.getByText(/press E to deliver/)).toBeVisible();
	await expect
		.element(screen.getByRole('button', { name: 'Collect Cash' }))
		.not.toBeInTheDocument();
	await screen.getByTestId('studio-debug-deliver').click();
	expect(ondeliver).toHaveBeenCalledTimes(1);
});

test('results shows pending skill gains before collect', async () => {
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'results',
		currentClient: LEVEL_1_BRIEFS[0],
		currentArtwork: artwork,
		currentCritique: critique,
		pendingSkillGains: { prompting: 8, imagination: 3, hustle: 2 }
	});
	await expect.element(screen.getByText(/On collect/)).toBeVisible();
	await expect.element(screen.getByText(/\+8\/\+3\/\+2 XP/)).toBeVisible();
});

test('Mum results pass through praise mode to ResultsPanel', async () => {
	const praise = pickMumPraiseLine(praiseSeedFromArtworkId(artwork.id));
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'results',
		currentClient: LEVEL_1_BRIEFS[0],
		currentArtwork: artwork,
		currentCritique: { ...critique, accuracyScore: 10, creativityScore: 10 },
		mumRealCritique: {
			title: 'Cat Study',
			accuracyScore: 2,
			creativityScore: 3,
			criticReview: 'Harsh truth.'
		},
		floorInteract: false
	});
	await expect.element(screen.getByText(praise)).toBeVisible();
	await expect
		.element(screen.getByRole('button', { name: 'Ask for real critique from the art critic' }))
		.toBeVisible();
});

test('auction results show long critique title in full', async () => {
	const longTitle = 'Portrait of Regal Whisker Crown Garden Sunlight Afternoon Studio Session';
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'results',
		currentClient: LEVEL_1_BRIEFS[0],
		currentArtwork: artwork,
		currentCritique: { ...critique, title: longTitle },
		currentAuctionResult: {
			bidderCount: 2,
			bids: [30, 25],
			winningBid: 30
		},
		floorInteract: false
	});
	await expect.element(screen.getByRole('heading', { name: longTitle })).toBeVisible();
	expect(screen.container.textContent).toContain(longTitle);
});
