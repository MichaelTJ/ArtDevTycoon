import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HudBar from './HudBar.svelte';

test('renders the level name', async () => {
	const screen = render(HudBar, {
		cash: 100,
		levelName: 'Garage Studio',
		commissionsCompleted: 2,
		targetCommissions: 5,
		targetCash: 500
	});
	await expect.element(screen.getByRole('heading', { name: 'Garage Studio' })).toBeVisible();
});

test('renders commission progress text', async () => {
	const screen = render(HudBar, {
		cash: 0,
		levelName: 'Garage Studio',
		commissionsCompleted: 0,
		targetCommissions: 5,
		targetCash: 500
	});
	await expect.element(screen.getByText('0 / 5 commissions')).toBeVisible();
});

test('progress element exposes value and max', async () => {
	const screen = render(HudBar, {
		cash: 50,
		levelName: 'Garage Studio',
		commissionsCompleted: 2,
		targetCommissions: 5,
		targetCash: 500
	});
	const progress = screen.getByRole('progressbar');
	expect(progress.element()).toHaveProperty('value', 2);
	expect(progress.element()).toHaveProperty('max', 5);
});

test('cash figure eventually reads the passed value', async () => {
	const screen = render(HudBar, {
		cash: 100,
		levelName: 'Garage Studio',
		commissionsCompleted: 1,
		targetCommissions: 5,
		targetCash: 500
	});
	await expect.element(screen.getByLabelText('Current cash')).toHaveTextContent('$100');
});
