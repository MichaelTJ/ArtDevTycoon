import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import IdleEarningsModal from './IdleEarningsModal.svelte';

test('renders the earned amount', async () => {
	const screen = render(IdleEarningsModal, { amount: 42, ondismiss: vi.fn() });
	await expect.element(screen.getByText(/While you were away, your studio earned/)).toBeVisible();
	await expect.element(screen.getByText('$42')).toBeVisible();
});

test('Collect button fires ondismiss', async () => {
	const ondismiss = vi.fn();
	const screen = render(IdleEarningsModal, { amount: 12, ondismiss });
	await screen.getByRole('button', { name: 'Collect idle earnings' }).click();
	expect(ondismiss).toHaveBeenCalledTimes(1);
});

test('dialog has an accessible name', async () => {
	const screen = render(IdleEarningsModal, { amount: 1, ondismiss: vi.fn() });
	expect(screen.getByRole('dialog', { name: 'Idle earnings' }).elements().length).toBeGreaterThan(
		0
	);
});
