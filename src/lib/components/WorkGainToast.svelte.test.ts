import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WorkGainToast from './WorkGainToast.svelte';

test('shows pending gains copy', async () => {
	const screen = render(WorkGainToast, {
		gains: { prompting: 8, imagination: 6, hustle: 4 },
		reputation: 2,
		cash: 100,
		mode: 'pending'
	});

	await expect.element(screen.getByText(/On collect/)).toBeVisible();
	await expect.element(screen.getByText(/\+\$100/)).toBeVisible();
	await expect.element(screen.getByText(/\+2 rep/)).toBeVisible();
	await expect.element(screen.getByText(/\+8\/\+6\/\+4 XP/)).toBeVisible();
});

test('shows banked gains copy', async () => {
	const screen = render(WorkGainToast, {
		gains: { prompting: 1, imagination: 1, hustle: 1 },
		reputation: 0,
		cash: 40,
		mode: 'collected'
	});

	await expect.element(screen.getByText(/Banked/)).toBeVisible();
});
