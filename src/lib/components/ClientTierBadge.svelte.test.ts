import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ClientTierBadge from './ClientTierBadge.svelte';

test('renders the corporate tier name', async () => {
	const screen = render(ClientTierBadge, { tier: 'corporate' });
	await expect.element(screen.getByText('Corporate Buyer')).toBeVisible();
});

test('renders the auction-house tier name', async () => {
	const screen = render(ClientTierBadge, { tier: 'auction-house' });
	await expect.element(screen.getByText('Auction House')).toBeVisible();
});
