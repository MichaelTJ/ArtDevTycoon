import { LEVEL_1_BRIEFS } from '$lib/data/briefs';
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
	ondismisserror: vi.fn()
};

test('idle shows waiting copy without invite button', async () => {
	const screen = render(StudioHudOverlay, { ...base, phase: 'idle' });
	await expect.element(screen.getByText(/Walk with WASD/)).toBeVisible();
	await expect.element(screen.getByText('Quiet kitchen.')).toBeVisible();
	await expect
		.element(screen.getByRole('button', { name: 'Wait for a Client' }))
		.not.toBeInTheDocument();
});

test('briefing shows prompt composer and sketch pad', async () => {
	const screen = render(StudioHudOverlay, {
		...base,
		phase: 'briefing',
		currentClient: LEVEL_1_BRIEFS[0]
	});
	await expect.element(screen.getByLabelText('Your prompt')).toBeVisible();
	await expect.element(screen.getByText('Mum')).toBeVisible();
	await expect.element(screen.getByLabelText('Sketch canvas')).toBeVisible();
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
