import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ErrorPanel from './ErrorPanel.svelte';

test('shows the message', async () => {
	const screen = render(ErrorPanel, {
		message: 'Generation failed.',
		onretry: vi.fn()
	});
	await expect.element(screen.getByText('Generation failed.')).toBeVisible();
});

test('role=alert is present', async () => {
	const screen = render(ErrorPanel, {
		message: 'Generation failed.',
		onretry: vi.fn()
	});
	expect(screen.getByRole('alert').elements().length).toBeGreaterThan(0);
});

test('Try Again calls onretry', async () => {
	const onretry = vi.fn();
	const screen = render(ErrorPanel, { message: 'Oops', onretry });
	await screen.getByRole('button', { name: 'Try Again' }).click();
	expect(onretry).toHaveBeenCalledTimes(1);
});

test('Dismiss is absent when ondismiss is omitted', async () => {
	const screen = render(ErrorPanel, {
		message: 'Oops',
		onretry: vi.fn()
	});
	expect(screen.getByRole('button', { name: 'Dismiss' }).elements().length).toBe(0);
});
