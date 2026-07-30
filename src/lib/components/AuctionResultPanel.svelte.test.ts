import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AuctionResultPanel from './AuctionResultPanel.svelte';

test('renders all bids and highlights the winning bid', async () => {
	const screen = render(AuctionResultPanel, {
		bidderCount: 3,
		bids: [120, 200, 180],
		winningBid: 200,
		oncollect: () => {}
	});

	await expect.element(screen.getByText('$120')).toBeVisible();
	await expect.element(screen.getByText('$200 — winning bid')).toBeVisible();
	await expect.element(screen.getByText('$180')).toBeVisible();
	await expect.element(screen.getByText('+$200')).toBeVisible();
});

test('fires oncollect once when Collect Cash is pressed', async () => {
	const oncollect = vi.fn();
	const screen = render(AuctionResultPanel, {
		bidderCount: 2,
		bids: [100, 150],
		winningBid: 150,
		oncollect
	});

	await screen.getByRole('button', { name: 'Collect Cash' }).click();
	expect(oncollect).toHaveBeenCalledOnce();
});
