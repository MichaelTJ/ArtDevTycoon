import type { Artwork, Critique } from '$lib/types/contracts';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ResultsPanel from './ResultsPanel.svelte';

const artwork: Artwork = {
	id: 'art-1',
	imageUrl: '/test.png',
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
