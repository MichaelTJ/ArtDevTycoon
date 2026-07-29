import type { GalleryEntry } from '$lib/types/contracts';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PortfolioStrip from './PortfolioStrip.svelte';

const makeEntry = (
	id: string,
	completedAt: number,
	title: string,
	payout: number
): GalleryEntry => ({
	id,
	imageUrl: `/art/${id}.png`,
	title,
	payout,
	score: 7.5,
	clientName: 'Client',
	briefId: 'c1',
	completedAt
});

test('empty message shows for empty list', async () => {
	const screen = render(PortfolioStrip, { entries: [] });
	await expect.element(screen.getByText('Your finished pieces will hang here.')).toBeVisible();
});

test('empty message is absent when entries exist', async () => {
	const screen = render(PortfolioStrip, {
		entries: [makeEntry('1', 100, 'Piece One', 50)]
	});
	expect(screen.container.textContent).not.toContain('Your finished pieces will hang here.');
});

test('three entries render three list items', async () => {
	const screen = render(PortfolioStrip, {
		entries: [
			makeEntry('1', 100, 'One', 10),
			makeEntry('2', 200, 'Two', 20),
			makeEntry('3', 300, 'Three', 30)
		]
	});
	expect(screen.getByRole('listitem').elements().length).toBe(3);
});

test('each item shows title and payout', async () => {
	const screen = render(PortfolioStrip, {
		entries: [makeEntry('1', 100, 'Sunset Sail', 85)]
	});
	await expect.element(screen.getByText('Sunset Sail')).toBeVisible();
	await expect.element(screen.getByText('+$85')).toBeVisible();
});

test('entries appear newest-first for ascending completedAt', async () => {
	const screen = render(PortfolioStrip, {
		entries: [
			makeEntry('old', 100, 'Oldest', 10),
			makeEntry('mid', 200, 'Middle', 20),
			makeEntry('new', 300, 'Newest', 30)
		]
	});
	const items = screen.getByRole('listitem').elements();
	expect(items[0]?.textContent).toContain('Newest');
	expect(items[2]?.textContent).toContain('Oldest');
});
