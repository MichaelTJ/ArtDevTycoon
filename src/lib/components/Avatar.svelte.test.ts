import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Avatar from './Avatar.svelte';

test('renders an img whose accessible name is the client name', async () => {
	const screen = render(Avatar, { src: '/avatars/c1.svg', name: 'Local Cafe Owner' });
	await expect.element(screen.getByRole('img', { name: 'Local Cafe Owner' })).toBeVisible();
});

test('renders sm size variant', async () => {
	const screen = render(Avatar, { src: '/avatars/c1.svg', name: 'Small Avatar', size: 'sm' });
	await expect.element(screen.getByRole('img', { name: 'Small Avatar' })).toBeVisible();
	screen.unmount();
});

test('renders lg size variant', async () => {
	const screen = render(Avatar, { src: '/avatars/c1.svg', name: 'Large Avatar', size: 'lg' });
	await expect.element(screen.getByRole('img', { name: 'Large Avatar' })).toBeVisible();
});

test('initials fallback shows LC for Local Cafe Owner', async () => {
	const screen = render(Avatar, {
		src: '/avatars/c1.svg',
		name: 'Local Cafe Owner'
	});
	screen.getByRole('img', { name: 'Local Cafe Owner' }).element().dispatchEvent(new Event('error'));
	await expect
		.element(screen.getByRole('img', { name: 'Local Cafe Owner' }))
		.toHaveTextContent('LC');
});
