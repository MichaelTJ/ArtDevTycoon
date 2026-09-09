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
	}
];

test('renders one radio per option', async () => {
	const screen = render(EnginePicker, {
		options,
		activeId: 'mock',
		onselect: vi.fn()
	});
	expect(screen.getByRole('radio').elements().length).toBe(2);
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
	const unavailableJanus: EngineOption[] = [
		options[0],
		{
			...options[1],
			available: false,
			unavailableReason: 'Needs WebGPU. Try Chrome or Edge on a computer.',
			requiresDownload: false
		}
	];
	const screen = render(EnginePicker, {
		options: unavailableJanus,
		activeId: 'mock',
		onselect
	});
	const disabled = screen.getByRole('radio', { name: /Janus Pro/ });
	expect(disabled.element()).toHaveProperty('disabled', true);
	await expect.element(screen.getByText('Needs WebGPU', { exact: true })).toBeVisible();
	await expect
		.element(screen.getByText('Needs WebGPU. Try Chrome or Edge on a computer.'))
		.toBeVisible();
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

test('loading with empty options shows status instead of blank list', async () => {
	const screen = render(EnginePicker, {
		options: [],
		activeId: 'janus-webgpu',
		loading: true,
		loadingLabel: 'Loading Janus Pro…',
		onselect: vi.fn()
	});
	await expect.element(screen.getByRole('status')).toBeVisible();
	await expect.element(screen.getByText('Loading Janus Pro…')).toBeVisible();
	expect(screen.getByRole('radio').elements().length).toBe(0);
});

test('loading placeholder shows progress when loadProgress is set', async () => {
	const screen = render(EnginePicker, {
		options: [],
		activeId: 'janus-webgpu',
		loading: true,
		loadingLabel: 'Loading Janus Pro…',
		loadProgress: {
			status: 'downloading',
			file: 'weights.bin',
			loadedBytes: 420,
			totalBytes: 1000,
			fraction: 0.42
		},
		onselect: vi.fn()
	});
	const bar = screen.getByRole('progressbar');
	expect(bar.element()).toHaveProperty('value', 0.42);
	await expect.element(screen.getByText('42%')).toBeVisible();
	await expect.element(screen.getByText('weights.bin')).toBeVisible();
});
