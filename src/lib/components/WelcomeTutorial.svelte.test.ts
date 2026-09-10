import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WelcomeTutorial from './WelcomeTutorial.svelte';

test('renders the welcome title', async () => {
	const screen = render(WelcomeTutorial, { oncontinue: vi.fn() });
	await expect.element(screen.getByText('Welcome to the studio')).toBeVisible();
});

test('renders the practice line', async () => {
	const screen = render(WelcomeTutorial, { oncontinue: vi.fn() });
	await expect.element(screen.getByText(/Practice makes perfect/)).toBeVisible();
});

test('renders the reputation line', async () => {
	const screen = render(WelcomeTutorial, { oncontinue: vi.fn() });
	await expect
		.element(screen.getByText(/Grow your reputation, grow your commissions/))
		.toBeVisible();
});

test('renders the AI-assisted drawing line', async () => {
	const screen = render(WelcomeTutorial, { oncontinue: vi.fn() });
	await expect.element(screen.getByText(/AI-assisted drawing/)).toBeVisible();
	await expect.element(screen.getByText(/You explain the concept, AI creates it/)).toBeVisible();
	const text = screen.container.textContent ?? '';
	expect(text).not.toContain('Download Janus');
	expect(text).not.toContain('Wi-Fi');
	expect(text).not.toContain('Crayon Mode is a full game');
});

test("Let's go calls oncontinue", async () => {
	const oncontinue = vi.fn();
	const screen = render(WelcomeTutorial, { oncontinue });
	await screen.getByRole('button', { name: "Let's go" }).click();
	expect(oncontinue).toHaveBeenCalledTimes(1);
});

test('exposes role=dialog', async () => {
	const screen = render(WelcomeTutorial, { oncontinue: vi.fn() });
	expect(screen.getByRole('dialog').elements().length).toBeGreaterThan(0);
});
