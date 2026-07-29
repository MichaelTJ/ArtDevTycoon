import type { ClientBrief } from '$lib/types/contracts';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ClientCard from './ClientCard.svelte';

const brief: ClientBrief = {
	id: 'c1',
	clientName: 'Local Cafe Owner',
	avatarUrl: '/avatars/c1.svg',
	requestText: 'Something warm and inviting for the back wall.',
	budget: 150,
	preferredKeywords: ['coffee', 'cup', 'cozy', 'table']
};

test('renders the client name and request text', async () => {
	const screen = render(ClientCard, { brief });
	await expect.element(screen.getByRole('heading', { name: 'Local Cafe Owner' })).toBeVisible();
	await expect
		.element(screen.getByText('Something warm and inviting for the back wall.'))
		.toBeVisible();
});

test('renders the budget', async () => {
	const screen = render(ClientCard, { brief });
	await expect.element(screen.getByText('Budget: $150')).toBeVisible();
});

test('does not render preferredKeywords', async () => {
	const screen = render(ClientCard, { brief });
	for (const keyword of brief.preferredKeywords) {
		expect(screen.container.textContent).not.toContain(keyword);
	}
});
