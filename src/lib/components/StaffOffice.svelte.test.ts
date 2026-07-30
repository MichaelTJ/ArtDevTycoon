import { STAFF_ROLES } from '$lib/data/staffRoles';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StaffOffice from './StaffOffice.svelte';

const baseProps = {
	roles: [...STAFF_ROLES],
	hiredIds: ['apprentice'] as string[],
	cash: 3000,
	reputation: 20,
	onhire: vi.fn(),
	onclose: vi.fn()
};

test('renders all four staff roles', async () => {
	const screen = render(StaffOffice, baseProps);
	const items = screen.getByRole('list', { name: 'Staff roles' }).element().querySelectorAll('li');
	expect(items.length).toBe(4);
	await expect.element(screen.getByText('The Apprentice')).toBeVisible();
	await expect.element(screen.getByText('The Curator')).toBeVisible();
});

test('hired role shows Hired and no hire button', async () => {
	const screen = render(StaffOffice, baseProps);
	await expect.element(screen.getByText('Hired')).toBeVisible();
	expect(screen.getByRole('button', { name: 'Hire The Apprentice' }).elements().length).toBe(0);
});

test('affordable unhired role hire button fires onhire', async () => {
	const onhire = vi.fn();
	const screen = render(StaffOffice, {
		...baseProps,
		hiredIds: [],
		cash: 800,
		reputation: 8,
		onhire
	});
	await screen.getByRole('button', { name: 'Hire The Apprentice' }).click();
	expect(onhire).toHaveBeenCalledWith('apprentice');
});

test('locked unaffordable role button is disabled', async () => {
	const screen = render(StaffOffice, {
		...baseProps,
		hiredIds: [],
		cash: 100,
		reputation: 8
	});
	const hire = screen.getByRole('button', { name: 'Hire The Apprentice' });
	expect(hire.element()).toHaveProperty('disabled', true);
});

test('dialog has an accessible name and close control', async () => {
	const onclose = vi.fn();
	const screen = render(StaffOffice, { ...baseProps, onclose });
	expect(screen.getByRole('dialog', { name: 'Staff Office' }).elements().length).toBeGreaterThan(0);
	await screen.getByRole('button', { name: 'Close staff office' }).click();
	expect(onclose).toHaveBeenCalledTimes(1);
});

test('shows passive income and effect tags', async () => {
	const screen = render(StaffOffice, { ...baseProps, hiredIds: [] });
	await expect.element(screen.getByText('$3/min passive')).toBeVisible();
	await expect.element(screen.getByText('Auto-invites clients')).toBeVisible();
	await expect.element(screen.getByText('Auto-curates gallery')).toBeVisible();
});
