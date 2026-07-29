import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ArtworkFrame from './ArtworkFrame.svelte';

test('image has alt and src', async () => {
	const screen = render(ArtworkFrame, {
		imageUrl: '/test.png',
		title: 'Sunset Sail',
		alt: 'A sailboat at sunset'
	});
	const img = screen.getByRole('img', { name: 'A sailboat at sunset' });
	expect(img.element()).toHaveProperty('src', expect.stringContaining('/test.png'));
});

test('caption shows in full size and is absent in thumb', async () => {
	const full = render(ArtworkFrame, {
		imageUrl: '/test.png',
		title: 'Sunset Sail',
		alt: 'A sailboat at sunset',
		size: 'full'
	});
	await expect.element(full.getByText('Sunset Sail')).toBeVisible();

	const thumb = render(ArtworkFrame, {
		imageUrl: '/test.png',
		title: 'Sunset Sail',
		alt: 'A sailboat at sunset',
		size: 'thumb'
	});
	expect(thumb.container.textContent).not.toContain('Sunset Sail');
});
