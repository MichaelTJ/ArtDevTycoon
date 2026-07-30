import { ATMOSPHERE_ITEMS } from '$lib/data/galleryAtmosphere';
import { GALLERY_LAYOUTS } from '$lib/data/galleryLayouts';
import { GALLERY_VENUES } from '$lib/data/galleryVenues';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GalleryUpgradeShop from './GalleryUpgradeShop.svelte';

const baseProps = {
	venues: GALLERY_VENUES,
	layouts: GALLERY_LAYOUTS,
	atmosphereItems: ATMOSPHERE_ITEMS,
	unlockedVenueId: 'fridge',
	unlockedLayoutIds: ['cluttered'],
	activeLayoutId: 'cluttered',
	ownedAtmosphereIds: [] as string[],
	cash: 500,
	reputation: 4,
	onunlockvenue: vi.fn(),
	onunlocklayout: vi.fn(),
	onselectlayout: vi.fn(),
	onbuyatmosphere: vi.fn(),
	onclose: vi.fn()
};

test('venue tab shows owned fridge and unlock for next garage', async () => {
	const onunlockvenue = vi.fn();
	const screen = render(GalleryUpgradeShop, { ...baseProps, onunlockvenue });

	await expect
		.element(screen.getByRole('tab', { name: 'Venue' }))
		.toHaveAttribute('aria-selected', 'true');
	await expect.element(screen.getByText('Owned')).toBeVisible();
	await screen.getByRole('button', { name: 'Unlock' }).click();
	expect(onunlockvenue).toHaveBeenCalledWith('garage');
});

test('layout tab fires unlock and select callbacks', async () => {
	const onunlocklayout = vi.fn();
	const onselectlayout = vi.fn();
	const screen = render(GalleryUpgradeShop, {
		...baseProps,
		cash: 800,
		unlockedLayoutIds: ['cluttered', 'tidy-rows'],
		activeLayoutId: 'cluttered',
		onunlocklayout,
		onselectlayout
	});

	await screen.getByRole('tab', { name: 'Layout' }).click();
	await expect
		.element(screen.getByRole('tab', { name: 'Layout' }))
		.toHaveAttribute('aria-selected', 'true');

	await screen.getByRole('button', { name: 'Switch to this layout' }).click();
	expect(onselectlayout).toHaveBeenCalledWith('tidy-rows');

	await screen.getByRole('button', { name: 'Unlock' }).click();
	expect(onunlocklayout).toHaveBeenCalledWith('salon-hang');
});

test('atmosphere tab buys affordable items and shows owned badge', async () => {
	const onbuyatmosphere = vi.fn();
	const screen = render(GalleryUpgradeShop, {
		...baseProps,
		cash: 350,
		ownedAtmosphereIds: ['ambient-music'],
		onbuyatmosphere
	});

	await screen.getByRole('tab', { name: 'Atmosphere' }).click();
	await expect.element(screen.getByText('Owned')).toBeVisible();
	await screen.getByRole('button', { name: 'Buy' }).click();
	expect(onbuyatmosphere).toHaveBeenCalledWith('gallery-lighting');
});

test('close button calls onclose', async () => {
	const onclose = vi.fn();
	const screen = render(GalleryUpgradeShop, { ...baseProps, onclose });
	await screen.getByRole('button', { name: 'Close' }).click();
	expect(onclose).toHaveBeenCalledTimes(1);
});
