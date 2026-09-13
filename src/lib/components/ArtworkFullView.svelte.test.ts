import type { GalleryEntry } from '$lib/types/contracts';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
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

function galleryEntry(id: string, title: string): GalleryEntry {
	return {
		id,
		imageUrl: `/art/${id}.png`,
		title,
		payout: 10,
		score: 5,
		clientName: 'Maya Chen',
		briefId: `b-${id}`,
		completedAt: 100
	};
}

const first = galleryEntry('a', 'First Piece');
const second = galleryEntry('b', 'Second Piece');
const third = galleryEntry('c', 'Third Piece');
const trio = [first, second, third];

const tallImageUrl =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="2400"><rect width="200" height="2400" fill="#888"/></svg>'
	);

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

test('Close stays visible on a 390×640 viewport with a tall image', async () => {
	await page.viewport(390, 640);
	const tall: GalleryEntry = { ...entry, imageUrl: tallImageUrl };
	const screen = render(ArtworkFullView, { entry: tall, onclose: vi.fn() });
	await expect.element(screen.getByRole('button', { name: 'Close' })).toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'Sunset Sail' })).toBeVisible();
	expect(screen.getByRole('dialog').elements().length).toBeGreaterThan(0);
	await page.viewport(1280, 720);
});

test('hides prev/next arrows when entries is omitted or a single piece', async () => {
	const omitted = render(ArtworkFullView, { entry, onclose: vi.fn() });
	expect(omitted.getByRole('button', { name: 'Previous artwork' }).elements().length).toBe(0);
	expect(omitted.getByRole('button', { name: 'Next artwork' }).elements().length).toBe(0);

	const single = render(ArtworkFullView, { entry, entries: [entry], onclose: vi.fn() });
	expect(single.getByRole('button', { name: 'Previous artwork' }).elements().length).toBe(0);
	expect(single.getByRole('button', { name: 'Next artwork' }).elements().length).toBe(0);
});

test('Next artwork selects the following entry', async () => {
	const onselect = vi.fn();
	const screen = render(ArtworkFullView, {
		entry: first,
		entries: trio,
		onclose: vi.fn(),
		onselect
	});
	await screen.getByRole('button', { name: 'Next artwork' }).click();
	expect(onselect).toHaveBeenCalledTimes(1);
	expect(onselect).toHaveBeenCalledWith(second);
});

test('Previous artwork wraps from the first entry', async () => {
	const onselect = vi.fn();
	const screen = render(ArtworkFullView, {
		entry: first,
		entries: trio,
		onclose: vi.fn(),
		onselect
	});
	await screen.getByRole('button', { name: 'Previous artwork' }).click();
	expect(onselect).toHaveBeenCalledTimes(1);
	expect(onselect).toHaveBeenCalledWith(third);
});

test('ArrowRight selects the next entry', async () => {
	const onselect = vi.fn();
	render(ArtworkFullView, {
		entry: first,
		entries: trio,
		onclose: vi.fn(),
		onselect
	});
	await userEvent.keyboard('{ArrowRight}');
	expect(onselect).toHaveBeenCalledTimes(1);
	expect(onselect).toHaveBeenCalledWith(second);
});
