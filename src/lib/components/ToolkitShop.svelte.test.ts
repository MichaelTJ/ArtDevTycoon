import { MEDIUM_TIERS } from '$lib/data/mediumTiers';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ToolkitShop from './ToolkitShop.svelte';

const baseProps = {
	tiers: [...MEDIUM_TIERS],
	unlockedTierIds: ['crayon', 'pencil'],
	activeTierId: 'crayon',
	cash: 300,
	reputation: 5,
	onunlock: vi.fn(),
	onselect: vi.fn(),
	onclose: vi.fn()
};

test('renders all six tiers', async () => {
	const screen = render(ToolkitShop, baseProps);
	const items = screen.getByRole('list', { name: 'Medium tiers' }).element().querySelectorAll('li');
	expect(items.length).toBe(6);
	await expect.element(screen.getByText('Crayons & Construction Paper')).toBeVisible();
	await expect.element(screen.getByText('Oil on Canvas')).toBeVisible();
});

test('active tier shows no action button', async () => {
	const screen = render(ToolkitShop, baseProps);
	expect(screen.getByRole('button', { name: /Switch to Crayons/ }).elements().length).toBe(0);
	expect(screen.getByRole('button', { name: /Unlock Crayons/ }).elements().length).toBe(0);
});

test('owned inactive tier switch button fires onselect', async () => {
	const onselect = vi.fn();
	const screen = render(ToolkitShop, { ...baseProps, onselect });
	await screen.getByRole('button', { name: 'Switch to Pencil & Sketchbook' }).click();
	expect(onselect).toHaveBeenCalledWith('pencil');
});

test('locked unaffordable tier button is disabled', async () => {
	const screen = render(ToolkitShop, {
		...baseProps,
		cash: 10,
		reputation: 5,
		unlockedTierIds: ['crayon']
	});
	const unlock = screen.getByRole('button', { name: 'Unlock Pencil & Sketchbook' });
	expect(unlock.element()).toHaveProperty('disabled', true);
});

test('locked affordable tier unlock button fires onunlock', async () => {
	const onunlock = vi.fn();
	const screen = render(ToolkitShop, {
		...baseProps,
		unlockedTierIds: ['crayon'],
		cash: 300,
		reputation: 5,
		onunlock
	});
	await screen.getByRole('button', { name: 'Unlock Pencil & Sketchbook' }).click();
	expect(onunlock).toHaveBeenCalledWith('pencil');
});

test('dialog has an accessible name and close control', async () => {
	const onclose = vi.fn();
	const screen = render(ToolkitShop, { ...baseProps, onclose });
	expect(
		screen.getByRole('dialog', { name: "Artist's Toolkit" }).elements().length
	).toBeGreaterThan(0);
	await screen.getByRole('button', { name: 'Close toolkit' }).click();
	expect(onclose).toHaveBeenCalledTimes(1);
});
