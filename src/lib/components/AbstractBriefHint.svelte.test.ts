import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AbstractBriefHint from './AbstractBriefHint.svelte';

test('renders the band-2 sentence when abstractness is 2', async () => {
	const screen = render(AbstractBriefHint, { abstractness: 2 });
	await expect
		.element(screen.getByText('This is a mood, not a shopping list. Invent something specific.'))
		.toBeVisible();
});

test('renders the band-1 sentence when abstractness is 1', async () => {
	const screen = render(AbstractBriefHint, { abstractness: 1 });
	await expect
		.element(
			screen.getByText("They didn't name a subject — pick a concrete scene that fits the feeling.")
		)
		.toBeVisible();
});

test('renders nothing when abstractness is 0', async () => {
	const screen = render(AbstractBriefHint, { abstractness: 0 });
	expect(screen.container.textContent?.trim()).toBe('');
});
