import type { Artwork, Critique } from '$lib/types/contracts';
import type { MumRealCritique } from '$lib/game/mumCritiquePresentation';
import { pickMumPraiseLine, praiseSeedFromArtworkId } from '$lib/game/mumCritiquePresentation';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ResultsPanel from './ResultsPanel.svelte';

const artwork: Artwork = {
	id: 'art-1',
	imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
	playerPrompt: 'a cat',
	width: 512,
	height: 512,
	generationMs: 1000,
	engineId: 'mock'
};

const critique: Critique = {
	title: 'Regal Whisker Study',
	accuracyScore: 8,
	creativityScore: 6,
	criticReview: 'The crown is charming, if slightly crooked.',
	finalPayout: 85
};

const mumRealCritique: MumRealCritique = {
	title: 'Wobbly Whisker Study',
	accuracyScore: 2,
	creativityScore: 4,
	criticReview: 'The paws are facing the wrong way.'
};

test('renders title, review, scores and payout', async () => {
	const screen = render(ResultsPanel, {
		artwork,
		critique,
		clientName: 'Cat Enthusiast',
		oncollect: vi.fn()
	});
	await expect.element(screen.getByRole('heading', { name: 'Regal Whisker Study' })).toBeVisible();
	await expect
		.element(screen.getByText('The crown is charming, if slightly crooked.'))
		.toBeVisible();
	await expect.element(screen.getByText('8 / 10')).toBeVisible();
	await expect.element(screen.getByText('6 / 10')).toBeVisible();
	await expect.element(screen.getByText('+$85')).toBeVisible();
});

test('Mum commission shows praise and 10/10 until real critique is requested', async () => {
	const praise = pickMumPraiseLine(praiseSeedFromArtworkId(artwork.id));
	const screen = render(ResultsPanel, {
		artwork,
		critique: { ...critique, accuracyScore: 10, creativityScore: 10 },
		clientName: 'Mum',
		mumRealCritique,
		oncollect: vi.fn()
	});
	await expect.element(screen.getByText('Accuracy')).toBeVisible();
	await expect.element(screen.getByText('Creativity')).toBeVisible();
	await expect.element(screen.getByText(praise)).toBeVisible();
	await expect
		.element(screen.getByText('The paws are facing the wrong way.'))
		.not.toBeInTheDocument();
	await screen.getByRole('button', { name: 'You can be honest with me mum…' }).click();
	await expect.element(screen.getByText('The paws are facing the wrong way.')).toBeVisible();
	await expect.element(screen.getByText('2 / 10')).toBeVisible();
	await expect.element(screen.getByText('4 / 10')).toBeVisible();
});

test('clicking Collect Cash calls oncollect once', async () => {
	const oncollect = vi.fn();
	const screen = render(ResultsPanel, {
		artwork,
		critique,
		clientName: 'Cat Enthusiast',
		oncollect
	});
	await screen.getByRole('button', { name: 'Collect Cash' }).click();
	expect(oncollect).toHaveBeenCalledTimes(1);
});

test('dialog exposes role=dialog', async () => {
	const screen = render(ResultsPanel, {
		artwork,
		critique,
		clientName: 'Cat Enthusiast',
		oncollect: vi.fn()
	});
	expect(screen.getByRole('dialog').elements().length).toBeGreaterThan(0);
});

test('artwork image alt equals critique title', async () => {
	const screen = render(ResultsPanel, {
		artwork,
		critique,
		clientName: 'Cat Enthusiast',
		oncollect: vi.fn()
	});
	await expect.element(screen.getByRole('img', { name: 'Regal Whisker Study' })).toBeVisible();
});

test('shows pending skill and reputation gains before collect', async () => {
	const screen = render(ResultsPanel, {
		artwork,
		critique,
		clientName: 'Cat Enthusiast',
		oncollect: vi.fn(),
		pendingSkillGains: { prompting: 8, imagination: 6, hustle: 3 },
		pendingReputation: 2
	});
	await expect.element(screen.getByText(/On collect/)).toBeVisible();
	await expect.element(screen.getByText(/\+2 rep/)).toBeVisible();
	await expect.element(screen.getByText(/\+8\/\+6\/\+3 XP/)).toBeVisible();
});

test('long critique title remains fully visible in heading and caption', async () => {
	const longTitle = 'Portrait of Regal Whisker Crown Garden Sunlight Afternoon Studio Session';
	const screen = render(ResultsPanel, {
		artwork,
		critique: { ...critique, title: longTitle },
		clientName: 'Cat Enthusiast',
		oncollect: vi.fn()
	});
	await expect.element(screen.getByRole('heading', { name: longTitle })).toBeVisible();
	expect(screen.container.textContent?.match(new RegExp(longTitle, 'g'))?.length).toBe(2);
});
