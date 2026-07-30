import type { GalleryEntry } from '$lib/types/contracts';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FridgeGallery from './FridgeGallery.svelte';

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
	const screen = render(FridgeGallery, {
		entries: [],
		onselect: vi.fn()
	});
	await expect.element(screen.getByText('Your finished pieces will hang here.')).toBeVisible();
});

test('three entries render three list items', async () => {
	const screen = render(FridgeGallery, {
		entries: [
			makeEntry('1', 100, 'One', 10),
			makeEntry('2', 200, 'Two', 20),
			makeEntry('3', 300, 'Three', 30)
		],
		onselect: vi.fn()
	});
	expect(screen.getByRole('listitem').elements().length).toBe(3);
});

test('clicking a magnet calls onselect with the entry', async () => {
	const onselect = vi.fn();
	const entry = makeEntry('1', 100, 'Sunset Sail', 85);
	const screen = render(FridgeGallery, { entries: [entry], onselect });
	await screen.getByRole('button', { name: /Sunset Sail/ }).click();
	expect(onselect).toHaveBeenCalledWith(entry);
});
