import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { ROOMS } from '$lib/studio/rooms';
import { authoredDraft } from './draft';
import TileEditMenu from './TileEditMenu.svelte';

test('tile menu exposes options and close', async () => {
	const onchange = () => {};
	const onclose = () => {};
	const screen = render(TileEditMenu, {
		tx: 2,
		ty: 3,
		draft: authoredDraft(ROOMS['home-kitchen']),
		onchange,
		onclose
	});

	await expect.element(screen.getByRole('dialog', { name: 'Edit tile 2, 3' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Floor' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Wall' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Table' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Desk' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Close tile menu' })).toBeVisible();
});

test('choosing blocked fires onchange and close fires onclose', async () => {
	const edits: unknown[] = [];
	const onclose = () => {
		edits.push('close');
	};
	const screen = render(TileEditMenu, {
		tx: 1,
		ty: 1,
		draft: authoredDraft(ROOMS['home-kitchen']),
		onchange: (edit) => {
			edits.push(edit);
		},
		onclose
	});

	await screen.getByRole('button', { name: 'Wall' }).click();
	await screen.getByRole('button', { name: 'Close tile menu' }).click();
	expect(edits).toEqual([{ walkable: false }, 'close']);
});
