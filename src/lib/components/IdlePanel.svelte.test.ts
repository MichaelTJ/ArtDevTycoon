import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import IdlePanel from './IdlePanel.svelte';

test('Wait for a Client calls oninvite', async () => {
	const oninvite = vi.fn();
	const screen = render(IdlePanel, { oninvite });
	await screen.getByRole('button', { name: 'Wait for a Client' }).click();
	expect(oninvite).toHaveBeenCalledTimes(1);
});

test('button is disabled when disabled is true', async () => {
	const screen = render(IdlePanel, { oninvite: vi.fn(), disabled: true });
	await expect.element(screen.getByRole('button', { name: 'Wait for a Client' })).toBeDisabled();
});
