import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OperationsPanel from './OperationsPanel.svelte';
import type { OperationsSummary } from '$lib/game/operations';
import type { GalleryEntry } from '$lib/types/contracts';

const summary: OperationsSummary = {
	cash: 275,
	cashTarget: 500,
	cashRemaining: 225,
	commissionsCompleted: 3,
	commissionsTarget: 5,
	commissionsRemaining: 2,
	overallProgress: 0.55,
	totalEarnings: 275,
	averageScore: 6.4,
	completedCount: 3,
	headline: '3 pieces in the portfolio; 55% toward Level 1.'
};

const entries: GalleryEntry[] = [
	{
		id: 'g1',
		imageUrl: '/a1.png',
		title: 'Morning Coffee',
		payout: 110,
		score: 6.5,
		clientName: 'Local Cafe Owner',
		briefId: 'c1',
		completedAt: Date.parse('2026-07-01')
	}
];

test('renders summary, search controls, and commission table', async () => {
	const screen = render(OperationsPanel, {
		summary,
		needs: [],
		entries,
		totalMatching: 1,
		query: { search: '', filter: 'all' }
	});

	await expect.element(screen.getByRole('heading', { name: 'Studio Operations' })).toBeVisible();
	await expect
		.element(screen.getByText('Cash on hand').locator('..').getByText('$275'))
		.toBeVisible();
	await expect.element(screen.getByRole('searchbox', { name: 'Search commissions' })).toBeVisible();
	await expect.element(screen.getByRole('table')).toBeVisible();
	await expect.element(screen.getByText('Morning Coffee')).toBeVisible();
});

test('shows urgent needs with alert semantics', async () => {
	const screen = render(OperationsPanel, {
		summary,
		needs: [
			{
				id: 'collect-cash',
				urgency: 'attention',
				title: 'Payment waiting',
				detail: 'Collect cash from the finished commission.'
			}
		],
		entries,
		totalMatching: 1,
		query: { search: '', filter: 'all' }
	});

	await expect.element(screen.getByRole('alert', { name: 'Urgent studio needs' })).toBeVisible();
	await expect.element(screen.getByText('Payment waiting')).toBeVisible();
});

test('calls onquerychange when search updates', async () => {
	const onquerychange = vi.fn();
	const screen = render(OperationsPanel, {
		summary,
		needs: [],
		entries,
		totalMatching: 1,
		query: { search: '', filter: 'all' },
		onquerychange
	});

	await screen.getByRole('searchbox', { name: 'Search commissions' }).fill('coffee');
	expect(onquerychange).toHaveBeenCalled();
});

test('shows empty state when no entries match', async () => {
	const screen = render(OperationsPanel, {
		summary,
		needs: [],
		entries: [],
		totalMatching: 0,
		query: { search: 'missing', filter: 'all' }
	});

	await expect
		.element(screen.getByText('No commissions match your search and filter.'))
		.toBeVisible();
});
