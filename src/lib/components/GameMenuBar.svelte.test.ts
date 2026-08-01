import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { studioAudio } from '$lib/audio';
import { game } from '$lib/stores/gameState.svelte';
import GameMenuBar from './GameMenuBar.svelte';

const defaultProps = {
	cash: 100,
	levelName: 'Home Kitchen',
	commissionsCompleted: 0,
	targetCommissions: 5,
	targetCash: 50,
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

test("openToolkitNonce opens the Artist's Toolkit dialog", async () => {
	game.reset();
	const screen = render(GameMenuBar, { ...defaultProps, openToolkitNonce: 1 });
	await expect.element(screen.getByRole('dialog', { name: "Artist's Toolkit" })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Close toolkit' })).toBeVisible();
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

test('Audio button opens the Audio dialog; mute fires prefs change', async () => {
	game.reset();
	studioAudio.setPrefs({ muted: false });
	const screen = render(GameMenuBar, defaultProps);
	await screen.getByRole('button', { name: 'Audio' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Audio' })).toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'Audio' })).toBeVisible();
	await screen.getByRole('checkbox', { name: 'Mute all' }).click();
	await expect.element(screen.getByRole('checkbox', { name: 'Mute all' })).toBeChecked();
	studioAudio.setPrefs({ muted: false });
});

test('saves button opens the Save slots dialog', async () => {
	game.reset();
	const screen = render(GameMenuBar, defaultProps);
	await screen.getByRole('button', { name: 'Saves' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Save slots' })).toBeVisible();
	await expect.element(screen.getByText('Slot 1')).toBeVisible();
});

test('Dev button is hidden when devEnabled is false', async () => {
	const screen = render(GameMenuBar, defaultProps);
	await expect.element(screen.getByRole('button', { name: 'Dev' })).not.toBeInTheDocument();
});

test('Dev button opens Developer tools when enabled', async () => {
	game.reset();
	const screen = render(GameMenuBar, {
		...defaultProps,
		devEnabled: true,
		devReason: 'query'
	});
	await screen.getByRole('button', { name: 'Dev' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Developer tools' })).toBeVisible();
	await expect.element(screen.getByText('Dev only — players never see this.')).toBeVisible();
});

test('shows banked gains toast after collect pulse', async () => {
	game.reset();
	game.lastCollectedGains = {
		skills: { prompting: 8, imagination: 6, hustle: 4 },
		reputation: 2,
		cash: 85
	};
	const screen = render(GameMenuBar, defaultProps);
	await expect.element(screen.getByText(/Banked/)).toBeVisible();
	await expect.element(screen.getByText(/\+\$85/)).toBeVisible();
	game.clearLastCollectedGains();
});

test('shows toolkit affordability badge when a medium tier is unlockable', async () => {
	game.reset();
	game.devSetReputation(3);
	const screen = render(GameMenuBar, { ...defaultProps, cash: 15 });
	const button = screen.getByRole('button', { name: /Medium ·/ });
	await expect.element(button.getByText('Upgrades available')).toBeVisible();
});

test('shows gallery affordability badge when the next venue is unlockable', async () => {
	game.reset();
	game.devSetReputation(4);
	const screen = render(GameMenuBar, { ...defaultProps, cash: 30 });
	const button = screen.getByRole('button', { name: 'Gallery Upgrades' });
	await expect.element(button.getByText('Upgrades available')).toBeVisible();
});

test('shows team affordability badge when an artist can be hired', async () => {
	game.reset();
	game.devSetReputation(4);
	const screen = render(GameMenuBar, { ...defaultProps, cash: 45 });
	const button = screen.getByRole('button', { name: 'Artist team' });
	await expect.element(button.getByText('Upgrades available')).toBeVisible();
});

test('hides affordability badges when nothing is unlockable', async () => {
	game.reset();
	const screen = render(GameMenuBar, { ...defaultProps, cash: 0 });
	await expect.element(screen.getByText('Upgrades available')).not.toBeInTheDocument();
});
