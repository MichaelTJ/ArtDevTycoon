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

test('dismiss calls ondismiss', async () => {
	const ondismiss = vi.fn();
	const screen = render(CapabilityNotice, {
		supported: false,
		reason: 'Limited GPU memory.',
		ondismiss
	});
	await screen.getByRole('button', { name: 'Dismiss Crayon Mode notice' }).click();
	expect(ondismiss).toHaveBeenCalledTimes(1);
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
});
