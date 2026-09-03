import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PersonEditMenu from './PersonEditMenu.svelte';

test('person menu lists sheets and close', async () => {
	const screen = render(PersonEditMenu, {
		slotId: 'player',
		look: { sheetId: 'player', frame: 0, tint: null },
		onchange: () => {},
		onclose: () => {},
		onreset: () => {}
	});

	await expect.element(screen.getByRole('dialog', { name: 'Edit Player' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Tiny Creatures' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Tiny Battle units' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Close person menu' })).toBeVisible();
});

test('choosing a sheet and close fire callbacks', async () => {
	const events: unknown[] = [];
	const screen = render(PersonEditMenu, {
		slotId: 'mum',
		look: { sheetId: 'mum', frame: 0, tint: null },
		onchange: (look) => {
			events.push(look.sheetId);
		},
		onclose: () => {
			events.push('close');
		},
		onreset: () => {
			events.push('reset');
		}
	});

	await screen.getByRole('button', { name: 'Tiny Creatures' }).click();
	await screen.getByRole('button', { name: 'Reset' }).click();
	await screen.getByRole('button', { name: 'Close person menu' }).click();
	expect(events).toEqual(['tiny-creatures', 'reset', 'close']);
});
