import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { TILESETS } from './catalog';
import SpriteTile from './SpriteTile.svelte';

test('preview uses an img role when it is not clickable', async () => {
	const screen = render(SpriteTile, {
		sheet: TILESETS['tiny-dungeon'],
		index: 0,
		label: 'Dungeon floor'
	});
	await expect.element(screen.getByRole('img', { name: 'Dungeon floor' })).toBeInTheDocument();
});

test('clickable tile is a toggle button', async () => {
	const onclick = vi.fn();
	const screen = render(SpriteTile, {
		sheet: TILESETS['tiny-town'],
		index: 1,
		label: 'Town tile 1',
		selected: true,
		onclick
	});
	const button = screen.getByRole('button', { name: 'Town tile 1' });
	await expect.element(button).toHaveAttribute('aria-pressed', 'true');
	await button.click();
	expect(onclick).toHaveBeenCalledTimes(1);
});
