import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createDefaultAudioPrefs } from '$lib/audio';
import AudioSettingsPanel from './AudioSettingsPanel.svelte';

test('renders Audio dialog with mute and volume controls', async () => {
	const screen = render(AudioSettingsPanel, {
		prefs: createDefaultAudioPrefs(),
		onchange: vi.fn(),
		onclose: vi.fn()
	});
	await expect.element(screen.getByRole('dialog', { name: 'Audio' })).toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'Audio' })).toBeVisible();
	await expect.element(screen.getByRole('checkbox', { name: 'Mute all' })).toBeVisible();
	await expect.element(screen.getByRole('slider', { name: 'Master' })).toBeVisible();
	await expect.element(screen.getByRole('slider', { name: 'Music' })).toBeVisible();
	await expect.element(screen.getByRole('slider', { name: 'Sound effects' })).toBeVisible();
});

test('Mute all fires onchange with muted true', async () => {
	const onchange = vi.fn();
	const screen = render(AudioSettingsPanel, {
		prefs: createDefaultAudioPrefs(),
		onchange,
		onclose: vi.fn()
	});
	await screen.getByRole('checkbox', { name: 'Mute all' }).click();
	expect(onchange).toHaveBeenCalledWith({ muted: true });
});

test('Close calls onclose', async () => {
	const onclose = vi.fn();
	const screen = render(AudioSettingsPanel, {
		prefs: createDefaultAudioPrefs(),
		onchange: vi.fn(),
		onclose
	});
	await screen.getByRole('button', { name: 'Close audio' }).click();
	expect(onclose).toHaveBeenCalledTimes(1);
});
