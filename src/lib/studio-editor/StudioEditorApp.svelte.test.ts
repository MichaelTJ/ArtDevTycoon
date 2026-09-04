import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { clearStudioEditorState } from './storage';
import StudioEditorApp from './StudioEditorApp.svelte';

test('room grid opens a tile menu that can be closed', async () => {
	clearStudioEditorState();
	const screen = render(StudioEditorApp);

	await expect.element(screen.getByRole('heading', { name: 'Studio editor' })).toBeVisible();
	await screen.getByRole('gridcell', { name: 'Tile 1, 1' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Edit tile 1, 1' })).toBeVisible();
	await screen.getByRole('button', { name: 'Wall', exact: true }).click();
	await screen.getByRole('button', { name: 'Close tile menu' }).click();
	await expect
		.element(screen.getByRole('dialog', { name: 'Edit tile 1, 1' }))
		.not.toBeInTheDocument();
	await expect.element(screen.getByRole('status')).toHaveTextContent("Mum's kitchen saved.");
});

test('people tab opens a person menu', async () => {
	clearStudioEditorState();
	const screen = render(StudioEditorApp);

	await screen.getByRole('tab', { name: 'People' }).click();
	await screen.getByRole('button', { name: 'Edit Player' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Edit Player' })).toBeVisible();
	await screen.getByRole('button', { name: 'Tiny Town props' }).click();
	await screen.getByRole('button', { name: 'Close person menu' }).click();
	await expect.element(screen.getByRole('status')).toHaveTextContent('Player saved.');
});

test('wall and furniture palettes recolor every matching sprite', async () => {
	clearStudioEditorState();
	const screen = render(StudioEditorApp);

	await expect.element(screen.getByRole('heading', { name: 'Floors' })).toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'Walls' })).toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'Furniture' })).toBeVisible();

	await screen.getByRole('button', { name: 'Change wall sprite tiny-dungeon 40' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Change wall sprite' })).toBeVisible();
	await screen.getByRole('button', { name: 'Tiny Dungeon tile 14', exact: true }).click();
	await expect
		.element(screen.getByRole('button', { name: 'Change wall sprite tiny-dungeon 14' }))
		.toBeVisible();

	await screen.getByRole('button', { name: 'Change floor sprite tiny-dungeon 0' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Change floor sprite' })).toBeVisible();
	await screen.getByRole('button', { name: 'Home interior tile 0', exact: true }).click();
	await expect
		.element(screen.getByRole('button', { name: 'Change floor sprite home-interior 0' }))
		.toBeVisible();

	await screen.getByRole('button', { name: 'Change furniture sprite furniture 0' }).click();
	await expect
		.element(screen.getByRole('dialog', { name: 'Change furniture sprite' }))
		.toBeVisible();
	await screen.getByRole('button', { name: 'Studio props tile 1' }).click();
	await expect
		.element(screen.getByRole('button', { name: 'Change furniture sprite furniture 1' }))
		.toBeVisible();
	await expect.element(screen.getByRole('status')).toHaveTextContent("Mum's kitchen saved.");
});
