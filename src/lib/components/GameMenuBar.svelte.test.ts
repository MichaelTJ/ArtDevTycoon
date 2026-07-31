import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { game } from '$lib/stores/gameState.svelte';
import GameMenuBar from './GameMenuBar.svelte';

const defaultProps = {
	cash: 100,
	levelName: 'Home Kitchen',
	commissionsCompleted: 0,
	targetCommissions: 5,
	targetCash: 500,
	engineButtonLabel: 'Art engine · Crayon Mode',
	engineMenuTitle: 'Choose art engine',
	engineMenuDisabled: false,
	onopenenginemenu: vi.fn()
};

test('engine button calls onopenenginemenu', async () => {
	const onopenenginemenu = vi.fn();
	const screen = render(GameMenuBar, { ...defaultProps, onopenenginemenu });
	await screen.getByRole('button', { name: /Art engine/ }).click();
	expect(onopenenginemenu).toHaveBeenCalledTimes(1);
});

test('engine button is disabled when engineMenuDisabled is true', async () => {
	const screen = render(GameMenuBar, { ...defaultProps, engineMenuDisabled: true });
	await expect.element(screen.getByRole('button', { name: /Art engine/ })).toBeDisabled();
});

test('renders level name in compact HUD', async () => {
	const screen = render(GameMenuBar, defaultProps);
	await expect.element(screen.getByRole('heading', { name: 'Home Kitchen' })).toBeVisible();
});

test("toolkit button opens the Artist's Toolkit dialog", async () => {
	game.reset();
	const screen = render(GameMenuBar, defaultProps);
	await screen.getByRole('button', { name: /Medium ·/ }).click();
	await expect.element(screen.getByRole('dialog', { name: "Artist's Toolkit" })).toBeVisible();
});

test('gallery upgrades button opens the Gallery Upgrades dialog', async () => {
	game.reset();
	const screen = render(GameMenuBar, defaultProps);
	await screen.getByRole('button', { name: 'Gallery Upgrades' }).click();
	await expect.element(screen.getByRole('dialog', { name: /Gallery Upgrades/i })).toBeVisible();
});

test('staff office button opens the Staff Office dialog', async () => {
	game.reset();
	const screen = render(GameMenuBar, defaultProps);
	await screen.getByRole('button', { name: 'Staff Office' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Staff Office' })).toBeVisible();
});

test('progress button opens the Progress dialog', async () => {
	game.reset();
	const screen = render(GameMenuBar, defaultProps);
	await screen.getByRole('button', { name: 'Progress' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Progress' })).toBeVisible();
	await expect.element(screen.getByText('Craft skills')).toBeVisible();
});
