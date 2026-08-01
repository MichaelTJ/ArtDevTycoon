import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LevelCompleteOverlay from './LevelCompleteOverlay.svelte';

test('renders cash and commission figures', async () => {
	const screen = render(LevelCompleteOverlay, {
		cash: 520,
		commissionsCompleted: 5,
		oncontinue: vi.fn()
	});
	await expect.element(screen.getByText('Final cash')).toBeVisible();
	await expect.element(screen.getByText('$520')).toBeVisible();
	await expect.element(screen.getByText('Commissions completed')).toBeVisible();
	await expect.element(screen.getByText('5', { exact: true })).toBeVisible();
});

test('Continue calls oncontinue', async () => {
	const oncontinue = vi.fn();
	const screen = render(LevelCompleteOverlay, {
		cash: 50,
		commissionsCompleted: 5,
		oncontinue
	});
	await screen.getByRole('button', { name: 'Continue' }).click();
	expect(oncontinue).toHaveBeenCalledTimes(1);
});

test('exposes role=dialog', async () => {
	const screen = render(LevelCompleteOverlay, {
		cash: 50,
		commissionsCompleted: 5,
		oncontinue: vi.fn()
	});
	expect(screen.getByRole('dialog').elements().length).toBeGreaterThan(0);
});
