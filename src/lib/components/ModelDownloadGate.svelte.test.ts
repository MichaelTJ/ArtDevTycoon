import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ModelDownloadGate from './ModelDownloadGate.svelte';

test('prompt state renders size in GB and button callbacks', async () => {
	const onconfirm = vi.fn();
	const oncancel = vi.fn();
	const screen = render(ModelDownloadGate, {
		engineName: 'Janus Pro',
		approxMb: 1000,
		state: 'prompt',
		onconfirm,
		oncancel
	});
	await expect.element(screen.getByText(/1\.0 GB/)).toBeVisible();
	await screen.getByRole('button', { name: 'Download and Play' }).click();
	expect(onconfirm).toHaveBeenCalledTimes(1);
	await screen.getByRole('button', { name: 'Use Crayon Mode instead' }).click();
	expect(oncancel).toHaveBeenCalledTimes(1);
});

test('loading state renders progress reflecting progress prop', async () => {
	const screen = render(ModelDownloadGate, {
		engineName: 'Janus Pro',
		approxMb: 1000,
		state: 'loading',
		progress: 0.42,
		onconfirm: vi.fn(),
		oncancel: vi.fn()
	});
	const bar = screen.getByRole('progressbar');
	expect(bar.element()).toHaveProperty('value', 0.42);
});

test('loading stage renders loading caption', async () => {
	const screen = render(ModelDownloadGate, {
		engineName: 'Janus Pro',
		approxMb: 1000,
		state: 'loading',
		stage: 'loading',
		onconfirm: vi.fn(),
		oncancel: vi.fn()
	});
	await expect.element(screen.getByText(/Loading model into memory/)).toBeVisible();
});

test('compiling stage renders compiling caption', async () => {
	const screen = render(ModelDownloadGate, {
		engineName: 'Janus Pro',
		approxMb: 1000,
		state: 'loading',
		stage: 'compiling',
		onconfirm: vi.fn(),
		oncancel: vi.fn()
	});
	await expect
		.element(screen.getByText(/Preparing the model — this can take a few seconds/))
		.toBeVisible();
});

test('error state renders message and recovery buttons', async () => {
	const onconfirm = vi.fn();
	const oncancel = vi.fn();
	const screen = render(ModelDownloadGate, {
		engineName: 'Janus Pro',
		approxMb: 1000,
		state: 'error',
		errorMessage: 'Download interrupted.',
		onconfirm,
		oncancel
	});
	await expect.element(screen.getByText('Download interrupted.')).toBeVisible();
	await screen.getByRole('button', { name: 'Try Again' }).click();
	expect(onconfirm).toHaveBeenCalledTimes(1);
	await screen.getByRole('button', { name: 'Use Crayon Mode' }).click();
	expect(oncancel).toHaveBeenCalledTimes(1);
});

test('dialog exposes role=dialog', async () => {
	const screen = render(ModelDownloadGate, {
		engineName: 'Janus Pro',
		approxMb: 1000,
		onconfirm: vi.fn(),
		oncancel: vi.fn()
	});
	expect(screen.getByRole('dialog').elements().length).toBeGreaterThan(0);
});
