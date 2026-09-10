import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CapabilityNotice from './CapabilityNotice.svelte';

test('renders nothing when supported is true', async () => {
	const screen = render(CapabilityNotice, {
		supported: true,
		reason: 'WebGPU unavailable',
		ondismiss: vi.fn()
	});
	expect(screen.container.textContent?.trim()).toBe('');
});

test('renders the reason when not supported', async () => {
	const screen = render(CapabilityNotice, {
		supported: false,
		reason: 'WebGPU is not available on this browser.',
		ondismiss: vi.fn()
	});
	await expect.element(screen.getByText('WebGPU is not available on this browser.')).toBeVisible();
});

test('Continue without model calls ondismiss', async () => {
	const ondismiss = vi.fn();
	const screen = render(CapabilityNotice, {
		supported: false,
		reason: 'Limited GPU memory.',
		ondismiss
	});
	await screen.getByRole('button', { name: 'Continue without model' }).click();
	expect(ondismiss).toHaveBeenCalledTimes(1);
});

test('Download model is hidden when canDownload is false', async () => {
	const screen = render(CapabilityNotice, {
		supported: false,
		reason: 'Limited GPU memory.',
		canDownload: false,
		ondismiss: vi.fn()
	});
	await expect
		.element(screen.getByRole('button', { name: 'Download model' }))
		.not.toBeInTheDocument();
});

test('Download model calls ondownload and not ondismiss', async () => {
	const ondismiss = vi.fn();
	const ondownload = vi.fn();
	const screen = render(CapabilityNotice, {
		supported: false,
		reason: 'WebGPU is ready.',
		canDownload: true,
		ondismiss,
		ondownload
	});
	await screen.getByRole('button', { name: 'Download model' }).click();
	expect(ondownload).toHaveBeenCalledTimes(1);
	expect(ondismiss).toHaveBeenCalledTimes(0);
});

test('does not render Got it', async () => {
	const screen = render(CapabilityNotice, {
		supported: false,
		reason: 'Safari on this device.',
		ondismiss: vi.fn()
	});
	await expect.element(screen.getByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
});

test('exposes role=dialog when not supported', async () => {
	const screen = render(CapabilityNotice, {
		supported: false,
		reason: 'Limited GPU memory.',
		ondismiss: vi.fn()
	});
	expect(screen.getByRole('dialog').elements().length).toBeGreaterThan(0);
});

test('copy avoids error-toned wording', async () => {
	const screen = render(CapabilityNotice, {
		supported: false,
		reason: 'Safari on this device.',
		ondismiss: vi.fn()
	});
	const text = screen.container.textContent?.toLowerCase() ?? '';
	expect(text).not.toContain('unsupported');
	expect(text).not.toContain('failed');
	expect(text).toContain('crayon mode');
	expect(screen.container.textContent ?? '').toContain('Art is (poorly) drawn procedurally');
});

test('empty reason hides the secondary paragraph', async () => {
	const screen = render(CapabilityNotice, {
		supported: false,
		reason: '   ',
		ondismiss: vi.fn()
	});
	await expect.element(screen.getByText(/Art is \(poorly\) drawn procedurally/)).toBeVisible();
	expect(screen.container.querySelectorAll('p').length).toBe(1);
});
