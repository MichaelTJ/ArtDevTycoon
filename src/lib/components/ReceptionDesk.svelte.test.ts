import { KITCHEN_BRIEFS } from '$lib/data/kitchenBriefs';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ReceptionDesk from './ReceptionDesk.svelte';

const offers = [KITCHEN_BRIEFS[0]];

test('renders commission offers with budgets', async () => {
	const screen = render(ReceptionDesk, {
		offers,
		onaccept: vi.fn(),
		onclose: vi.fn()
	});
	await expect.element(screen.getByText('Reception desk')).toBeVisible();
	await expect.element(screen.getByText('Paint me a cat.')).toBeVisible();
});

test('accept brief fires onaccept', async () => {
	const onaccept = vi.fn();
	const screen = render(ReceptionDesk, { offers, onaccept, onclose: vi.fn() });
	await screen.getByRole('button', { name: 'Accept commission from Mum' }).click();
	expect(onaccept).toHaveBeenCalledWith(offers[0]);
});

test('dialog is accessible and closable', async () => {
	const onclose = vi.fn();
	const screen = render(ReceptionDesk, { offers, onaccept: vi.fn(), onclose });
	expect(screen.getByRole('dialog', { name: 'Reception desk' }).elements().length).toBeGreaterThan(
		0
	);
	await screen.getByRole('button', { name: 'Close reception desk' }).click();
	expect(onclose).toHaveBeenCalled();
});

test('no thanks closes board without accepting', async () => {
	const onclose = vi.fn();
	const onaccept = vi.fn();
	const screen = render(ReceptionDesk, { offers, onaccept, onclose });
	await screen.getByRole('button', { name: 'Decline commission board offers' }).click();
	expect(onclose).toHaveBeenCalled();
	expect(onaccept).not.toHaveBeenCalled();
});
