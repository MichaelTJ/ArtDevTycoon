import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AssignArtistModal from './AssignArtistModal.svelte';

const artists = [{ catalogId: 'jade-ink', name: 'Jade Ink', portrait: '🖊️', level: 1 }];

test('lists artists to assign', async () => {
	const screen = render(AssignArtistModal, {
		artists,
		clientName: 'Alex',
		assignmentFill: null,
		onassign: vi.fn(),
		onclose: vi.fn()
	});
	await expect.element(screen.getByText('Assign to artist')).toBeVisible();
	await screen.getByRole('button', { name: 'Assign to Jade Ink, level 1' }).click();
});

test('shows progress when assignment active', async () => {
	const screen = render(AssignArtistModal, {
		artists,
		clientName: 'Alex',
		assignmentFill: 0.5,
		onassign: vi.fn(),
		onclose: vi.fn()
	});
	await expect.element(screen.getByText(/Artist working/)).toBeVisible();
});
