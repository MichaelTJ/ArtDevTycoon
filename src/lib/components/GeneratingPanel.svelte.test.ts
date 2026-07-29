import { expect, test, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GeneratingPanel from './GeneratingPanel.svelte';

afterEach(() => {
	vi.useRealTimers();
});

test('renders the first message immediately', async () => {
	const screen = render(GeneratingPanel, {
		messages: ['First line', 'Second line']
	});
	await expect.element(screen.getByText('First line')).toBeVisible();
});

test('exposes role=status', async () => {
	const screen = render(GeneratingPanel, {});
	expect(screen.getByRole('status').elements().length).toBeGreaterThan(0);
});

test('advancing timers shows the second message', async () => {
	vi.useFakeTimers();
	const screen = render(GeneratingPanel, {
		messages: ['First line', 'Second line'],
		intervalMs: 1000
	});
	vi.advanceTimersByTime(1000);
	await expect.element(screen.getByText('Second line')).toBeVisible();
});

test('unmount clears the interval', async () => {
	vi.useFakeTimers();
	const screen = render(GeneratingPanel, {
		messages: ['First line', 'Second line'],
		intervalMs: 1000
	});
	expect(vi.getTimerCount()).toBeGreaterThan(0);
	screen.unmount();
	expect(vi.getTimerCount()).toBe(0);
});

test('progress 0.5 renders determinate progress showing 50%', async () => {
	const screen = render(GeneratingPanel, { progress: 0.5 });
	await expect.element(screen.getByText('50%')).toBeVisible();
	const progress = screen.getByRole('progressbar');
	expect(progress.element()).toHaveProperty('value', 0.5);
});

test('progress null renders no progress element', async () => {
	const screen = render(GeneratingPanel, { progress: null });
	expect(screen.getByRole('progressbar').elements().length).toBe(0);
});
