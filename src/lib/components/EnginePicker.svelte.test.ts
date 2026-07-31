import type { EngineOption } from '$lib/types/contracts';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EnginePicker from './EnginePicker.svelte';

const options: EngineOption[] = [
	{
		id: 'mock',
		displayName: 'Crayon Mode',
		description: 'Procedural art, no download.',
		available: true,
		requiresDownload: false,
		approxDownloadMb: 0
	},
	{
		id: 'janus-webgpu',
		displayName: 'Janus Pro',
		description: 'Unified generation and critique.',
		available: true,
		requiresDownload: true,
		approxDownloadMb: 1000
	},
	{
		id: 'sdturbo-webgpu',
		displayName: 'SD-Turbo',
		description: 'Desktop-only painter.',
		available: false,
		unavailableReason: 'Requires a desktop GPU.',
		requiresDownload: true,
		approxDownloadMb: 1500
	},
	{
		id: 'remote',
		displayName: 'My PC',
		description: 'JanusLink on your home GPU.',
		available: false,
		unavailableReason: 'Not connected.',
		requiresDownload: false,
		approxDownloadMb: 0
	}
];

test('renders one radio per option', async () => {
	const screen = render(EnginePicker, {
		options,
		activeId: 'mock',
		onselect: vi.fn()
	});
	expect(screen.getByRole('radio').elements().length).toBe(4);
});

test('Set up My PC calls onconfigure without selecting', async () => {
	const onselect = vi.fn();
	const onconfigure = vi.fn();
	const screen = render(EnginePicker, {
		options,
		activeId: 'mock',
		onselect,
		onconfigure
	});
	await screen.getByRole('button', { name: 'Set up My PC' }).click();
	expect(onconfigure).toHaveBeenCalledWith('remote');
	expect(onselect).not.toHaveBeenCalled();
});

test('active option is checked', async () => {
	const screen = render(EnginePicker, {
		options,
		activeId: 'janus-webgpu',
		onselect: vi.fn()
	});
	const janus = screen.getByRole('radio', { name: /Janus Pro/ });
	expect(janus.element()).toHaveProperty('checked', true);
});

test('clicking an available option calls onselect with its id', async () => {
	const onselect = vi.fn();
	const screen = render(EnginePicker, {
		options,
		activeId: 'mock',
		onselect
	});
	await screen.getByRole('radio', { name: /Janus Pro/ }).click();
	expect(onselect).toHaveBeenCalledWith('janus-webgpu');
});

test('disabled option does not call onselect', async () => {
	const onselect = vi.fn();
	const screen = render(EnginePicker, {
		options,
		activeId: 'mock',
		onselect
	});
	const disabled = screen.getByRole('radio', { name: /SD-Turbo/ });
	expect(disabled.element()).toHaveProperty('disabled', true);
	await disabled.click({ force: true });
	expect(onselect).not.toHaveBeenCalled();
});

test('download size is shown for options that require download', async () => {
	const screen = render(EnginePicker, {
		options,
		activeId: 'mock',
		onselect: vi.fn()
	});
	await expect.element(screen.getByText('1.0 GB download')).toBeVisible();
});

test('group has an accessible name', async () => {
	const screen = render(EnginePicker, {
		options,
		activeId: 'mock',
		onselect: vi.fn()
	});
	expect(screen.getByRole('radiogroup', { name: 'Art engine' }).elements().length).toBeGreaterThan(
		0
	);
});
