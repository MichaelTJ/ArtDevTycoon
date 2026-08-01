import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { SaveSlotListItem } from '$lib/game';
import SaveSlotsPanel from './SaveSlotsPanel.svelte';

const slots: SaveSlotListItem[] = [
	{
		id: '0',
		name: 'Slot 1',
		savedAt: 1,
		empty: false,
		summary: { cash: 250, reputation: 2, lifetimeCommissions: 1 }
	},
	{ id: '1', name: 'Kitchen', savedAt: 0, empty: true },
	{ id: '2', name: 'Slot 3', savedAt: 0, empty: true }
];

function renderPanel(
	overrides: {
		activeId?: '0' | '1' | '2';
		busy?: boolean;
		onswitch?: (id: '0' | '1' | '2') => void;
		ondelete?: (id: '0' | '1' | '2') => void;
	} = {}
) {
	return render(SaveSlotsPanel, {
		slots,
		activeId: '0' as const,
		busy: false,
		onswitch: vi.fn(),
		onnew: vi.fn(),
		ondelete: vi.fn(),
		onrename: vi.fn(),
		oncopy: vi.fn(),
		onclose: vi.fn(),
		...overrides
	});
}

test('renders 3 slots with roles and names', async () => {
	const screen = renderPanel();
	await expect.element(screen.getByRole('dialog', { name: 'Save slots' })).toBeVisible();
	await expect.element(screen.getByText('Slot 1')).toBeVisible();
	await expect.element(screen.getByText('Kitchen')).toBeVisible();
	await expect.element(screen.getByText('Slot 3')).toBeVisible();
	await expect.element(screen.getByLabelText('Save slot Slot 1')).toBeVisible();
	await expect.element(screen.getByLabelText('Save slot Kitchen')).toBeVisible();
	await expect.element(screen.getByLabelText('Save slot Slot 3')).toBeVisible();
});

test('Active badge on activeId', async () => {
	const screen = renderPanel({ activeId: '0' });
	await expect.element(screen.getByText('Active')).toBeVisible();
});

test('Switch click fires onswitch with id', async () => {
	const onswitch = vi.fn();
	const screen = renderPanel({ onswitch });
	await screen.getByRole('button', { name: 'Switch to Kitchen' }).click();
	expect(onswitch).toHaveBeenCalledOnce();
	expect(onswitch).toHaveBeenCalledWith('1');
});

test('Delete confirm cancel does not fire ondelete', async () => {
	const ondelete = vi.fn();
	const screen = renderPanel({ ondelete });
	await screen.getByRole('button', { name: 'Delete Slot 1' }).click();
	await expect.element(screen.getByRole('dialog', { name: 'Delete this save?' })).toBeVisible();
	await screen.getByRole('button', { name: 'Cancel' }).click();
	expect(ondelete).not.toHaveBeenCalled();
});
