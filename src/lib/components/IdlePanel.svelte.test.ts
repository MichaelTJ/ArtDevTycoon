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

test('Practice button fires onpractice when provided', async () => {
	const onpractice = vi.fn();
	const screen = render(IdlePanel, { oninvite: vi.fn(), onpractice });
	await screen.getByRole('button', { name: 'Practice at the desk' }).click();
	expect(onpractice).toHaveBeenCalledTimes(1);
});

test('Practice button is omitted when onpractice is not provided', async () => {
	const screen = render(IdlePanel, { oninvite: vi.fn() });
	await expect
		.element(screen.getByRole('button', { name: 'Practice at the desk' }))
		.not.toBeInTheDocument();
});
