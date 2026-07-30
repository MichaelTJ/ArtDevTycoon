import type { GalleryEntry } from '$lib/types/contracts';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ArtworkFullView from './ArtworkFullView.svelte';

const entry: GalleryEntry = {
	id: '1',
	imageUrl: '/art/1.png',
	title: 'Sunset Sail',
	payout: 85,
	score: 7.5,
	clientName: 'Maya Chen',
	briefId: 'c1',
	completedAt: 100
};

test('renders title, score, and payout', async () => {
	const screen = render(ArtworkFullView, { entry, onclose: vi.fn() });
	await expect.element(screen.getByRole('heading', { name: 'Sunset Sail' })).toBeVisible();
	await expect.element(screen.getByText('+$85')).toBeVisible();
	await expect.element(screen.getByText('For Maya Chen')).toBeVisible();
});

test('Close calls onclose', async () => {
	const onclose = vi.fn();
	const screen = render(ArtworkFullView, { entry, onclose });
	await screen.getByRole('button', { name: 'Close' }).click();
	expect(onclose).toHaveBeenCalledTimes(1);
});

test('exposes role=dialog', async () => {
	const screen = render(ArtworkFullView, { entry, onclose: vi.fn() });
	expect(screen.getByRole('dialog').elements().length).toBeGreaterThan(0);
});
