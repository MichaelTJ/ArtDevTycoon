import type { GalleryEntry } from '$lib/types/contracts';
import type { PracticeArtwork } from '$lib/game';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StoragePanel from './StoragePanel.svelte';

const storedUnlistable: PracticeArtwork = {
	id: 'doodle',
	imageUrl: 'data:image/png;base64,aa',
	title: 'Practice — Crayons & Construction Paper',
	mediumTierId: 'crayon',
	strokeMs: 1000,
	coverage01: 0.01,
	skillLevel: 1,
	askingPrice: null,
	location: 'storage',
	createdAt: 1
};

const hung: PracticeArtwork = {
	id: 'wall-1',
	imageUrl: 'data:image/png;base64,bb',
	title: 'Practice — Pencil & Sketchbook',
	mediumTierId: 'pencil',
	strokeMs: 9000,
	coverage01: 0.05,
	skillLevel: 1,
	askingPrice: 4,
	location: 'gallery',
	createdAt: 2
};

const archived: GalleryEntry = {
	id: 'c-old',
	imageUrl: '/old.png',
	title: 'Morning Coffee',
	payout: 5,
	score: 8,
	clientName: 'Mum',
	briefId: 'c1',
	completedAt: 3
};

function panelProps(overrides: Record<string, unknown> = {}) {
	return {
		storageName: "Mum's rainy-day box",
		tagline: 'Shoebox under the sink. Magnets were full.',
		practiceStored: [] as PracticeArtwork[],
		practiceHung: [] as PracticeArtwork[],
		archivedCommissions: [] as GalleryEntry[],
		venueId: 'fridge',
		reputation: 0,
		onhangpractice: vi.fn(),
		ontakepractice: vi.fn(),
		onclose: vi.fn(),
		...overrides
	};
}

test('empty storage shows nothing stored yet', async () => {
	const screen = render(StoragePanel, panelProps());
	await expect.element(screen.getByRole('dialog', { name: "Mum's rainy-day box" })).toBeVisible();
	await expect.element(screen.getByText('Nothing stored yet.')).toBeVisible();
});

test('Hang on an unlistable piece is disabled', async () => {
	const screen = render(StoragePanel, panelProps({ practiceStored: [storedUnlistable] }));
	await expect.element(screen.getByRole('button', { name: 'Hang' })).toBeDisabled();
	await expect
		.element(screen.getByText('Too little paint for a sale — draw more, or put it in storage.'))
		.toBeVisible();
});

test('Take down fires ontakepractice with the piece id', async () => {
	const ontakepractice = vi.fn();
	const screen = render(StoragePanel, panelProps({ practiceHung: [hung], ontakepractice }));
	await screen.getByRole('button', { name: 'Take down Practice — Pencil & Sketchbook' }).click();
	expect(ontakepractice).toHaveBeenCalledWith('wall-1');
});

test('archived commissions have no hang button', async () => {
	const screen = render(StoragePanel, panelProps({ archivedCommissions: [archived] }));
	await expect.element(screen.getByText('Morning Coffee')).toBeVisible();
	await expect
		.element(screen.getByText('Commission archive — returns when there is space.'))
		.toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Hang' })).not.toBeInTheDocument();
});
