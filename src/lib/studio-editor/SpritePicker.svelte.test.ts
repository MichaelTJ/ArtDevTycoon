import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { FURNITURE_SHEET } from './catalog';
import SpritePicker from './SpritePicker.svelte';

test('sprite picker lists tiles and close', async () => {
	const screen = render(SpritePicker, {
		title: 'Change furniture',
		dialogLabel: 'Change furniture sprite',
		sheets: [FURNITURE_SHEET],
		selectedSheetId: 'furniture',
		selectedIndex: 0,
		onpick: () => {},
		onclose: () => {}
	});

	await expect
		.element(screen.getByRole('dialog', { name: 'Change furniture sprite' }))
		.toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Studio props tile 1' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Close sprite picker' })).toBeVisible();
});

test('picking a tile and close fire callbacks', async () => {
	const onpick = vi.fn();
	const onclose = vi.fn();
	const screen = render(SpritePicker, {
		title: 'Change furniture',
		dialogLabel: 'Change furniture sprite',
		sheets: [FURNITURE_SHEET],
		selectedSheetId: 'furniture',
		selectedIndex: 0,
		onpick,
		onclose
	});

	await screen.getByRole('button', { name: 'Studio props tile 1' }).click();
	await screen.getByRole('button', { name: 'Close sprite picker' }).click();
	expect(onpick).toHaveBeenCalledWith('furniture', 1);
	expect(onclose).toHaveBeenCalledTimes(1);
});
