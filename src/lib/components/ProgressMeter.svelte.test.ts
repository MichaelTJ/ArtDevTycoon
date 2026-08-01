import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProgressMeter from './ProgressMeter.svelte';

test('renders labelled progress with value and max', async () => {
	const screen = render(ProgressMeter, {
		label: 'Reputation',
		value: 3,
		max: 12,
		hint: '9 more reputation'
	});

	await expect.element(screen.getByText('9 more reputation')).toBeVisible();
	const progress = screen.getByRole('progressbar', { name: /Reputation/ });
	expect(progress.element()).toHaveProperty('value', 3);
	expect(progress.element()).toHaveProperty('max', 12);
});

test('compact variant keeps hint on the label row', async () => {
	const screen = render(ProgressMeter, {
		label: 'Commissions',
		value: 2,
		max: 5,
		hint: '2/5',
		variant: 'compact'
	});

	await expect.element(screen.getByText('2/5')).toBeVisible();
	await expect.element(screen.getByText('Commissions')).toBeVisible();
});

test('exposes pending delta in the accessibility tree', async () => {
	const screen = render(ProgressMeter, {
		label: 'Prompting',
		value: 8,
		max: 15,
		delta: 3
	});

	await expect.element(screen.getByText('+3')).toBeVisible();
});

test('treats max 0 as a full bar', async () => {
	const screen = render(ProgressMeter, {
		label: 'Hustle',
		value: 0,
		max: 0,
		hint: 'Lv 10 · Max level'
	});

	const progress = screen.getByRole('progressbar', { name: /Hustle/ });
	expect(progress.element()).toHaveProperty('value', 1);
	expect(progress.element()).toHaveProperty('max', 1);
});
