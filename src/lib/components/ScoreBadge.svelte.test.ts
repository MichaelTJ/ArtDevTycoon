import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ScoreBadge from './ScoreBadge.svelte';

test('shows label and score', async () => {
	const screen = render(ScoreBadge, { label: 'Accuracy', score: 7 });
	await expect.element(screen.getByText('Accuracy')).toBeVisible();
	await expect.element(screen.getByText('7 / 10')).toBeVisible();
});

test('score of 2 uses the red band', async () => {
	const screen = render(ScoreBadge, { label: 'Accuracy', score: 2 });
	const badge = screen.getByText('2 / 10');
	expect(badge.element().parentElement?.getAttribute('class')).toContain('red-100');
});

test('score of 10 uses the emerald band', async () => {
	const screen = render(ScoreBadge, { label: 'Creativity', score: 10 });
	const badge = screen.getByText('10 / 10');
	expect(badge.element().parentElement?.getAttribute('class')).toContain('emerald-100');
});
