import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GameSceneComingSoonHarness from './GameSceneComingSoon.harness.svelte';
import GameSceneHarness from './GameScene.harness.svelte';

test('home-kitchen renders workspace snippet and fridge gallery', async () => {
	const screen = render(GameSceneHarness);
	await expect.element(screen.getByText('Kitchen workspace')).toBeVisible();
	await expect
		.element(screen.getByText('The fridge is bare. Your first masterpiece goes here.'))
		.toBeVisible();
});

test('non-kitchen environment renders coming soon tagline', async () => {
	const screen = render(GameSceneComingSoonHarness);
	await expect.element(screen.getByText('Level 2 — coming soon')).toBeVisible();
	expect(screen.container.textContent).not.toContain('Hidden workspace');
});
