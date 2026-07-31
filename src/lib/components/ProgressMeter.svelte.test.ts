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
	const progress = screen.getByRole('progressbar', { name: 'Reputation' });
	expect(progress.element()).toHaveProperty('value', 3);
	expect(progress.element()).toHaveProperty('max', 12);
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
