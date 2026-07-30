import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
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
