import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EngineLoadSpinner from './EngineLoadSpinner.svelte';

test('renders nothing when hidden', async () => {
	const screen = render(EngineLoadSpinner, {
		visible: false,
		label: 'Loading Janus Pro…'
	});
	await expect.element(screen.getByRole('status')).not.toBeInTheDocument();
});

test('exposes a polite status named after the label', async () => {
	const screen = render(EngineLoadSpinner, {
		visible: true,
		label: 'Loading Janus Pro…'
	});
	await expect.element(screen.getByRole('status', { name: /Loading Janus Pro/ })).toBeVisible();
	await expect.element(screen.getByText('Loading Janus Pro…')).toBeVisible();
});
