import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CritiqueSentToast from './CritiqueSentToast.svelte';

test('names the client in the critique-sent float', async () => {
	const screen = render(CritiqueSentToast, { clientName: 'Mum' });
	await expect.element(screen.getByRole('status')).toBeVisible();
	await expect.element(screen.getByText('Sent for critique')).toBeVisible();
	await expect
		.element(screen.getByText('Sending your painting to Mum for a critique.'))
		.toBeVisible();
});
