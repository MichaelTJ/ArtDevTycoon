import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { NextUnlock } from '$lib/game';
import HudBar from './HudBar.svelte';

const reputationMeter: NextUnlock = {
	track: 'reputation',
	label: 'Pencil & Sketchbook',
	current: 0,
	target: 3,
	fill: 0,
	remainingLabel: '3 more reputation'
};

const base = {
	cash: 100,
	levelName: 'Garage Studio',
	commissionsCompleted: 2,
	targetCommissions: 5,
	targetCash: 50,
	reputation: 0,
	reputationMeter
};

test('renders the level name', async () => {
	const screen = render(HudBar, base);
	await expect.element(screen.getByRole('heading', { name: 'Garage Studio' })).toBeVisible();
});

test('renders commission progress text', async () => {
	const screen = render(HudBar, { ...base, commissionsCompleted: 0, cash: 0 });
	await expect.element(screen.getByText('0 / 5 commissions')).toBeVisible();
});

test('exposes commission progressbar value and max', async () => {
	const screen = render(HudBar, base);
	const progress = screen.getByRole('progressbar', { name: /Commissions/ });
	expect(progress.element()).toHaveProperty('value', 2);
	expect(progress.element()).toHaveProperty('max', 5);
});

test('cash figure eventually reads the passed value', async () => {
	const screen = render(HudBar, base);
	await expect.element(screen.getByLabelText('Current cash')).toHaveTextContent('$100');
});

test('shows unlock and skill meters when summaries provided', async () => {
	const screen = render(HudBar, {
		...base,
		variant: 'compact',
		skillSummaries: [
			{ id: 'prompting', label: 'Prompting', level: 1, fill: 0.2, delta: 3 },
			{ id: 'imagination', label: 'Imagination', level: 1, fill: 0 },
			{ id: 'hustle', label: 'Hustle', level: 2, fill: 0.5 }
		]
	});

	await expect
		.element(screen.getByRole('progressbar', { name: /Pencil & Sketchbook/ }))
		.toBeVisible();
	await expect.element(screen.getByText('3 more reputation')).toBeVisible();
	await expect.element(screen.getByRole('progressbar', { name: /Prompting/ })).toBeVisible();
	await expect.element(screen.getByText('+3')).toBeVisible();
});
