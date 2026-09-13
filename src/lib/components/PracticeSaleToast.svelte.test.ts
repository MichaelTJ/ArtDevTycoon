import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PracticeSaleToast from './PracticeSaleToast.svelte';

test('renders the sale copy in a polite live region', async () => {
	const screen = render(PracticeSaleToast, {
		sale: { title: 'Practice — Crayons & Construction Paper', price: 4, buyerLabel: 'A neighbour' }
	});
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('A neighbour bought Practice — Crayons & Construction Paper for $4.');
});

test('renders nothing when sale is null', async () => {
	const screen = render(PracticeSaleToast, { sale: null });
	await expect.element(screen.getByRole('status')).not.toBeInTheDocument();
});
