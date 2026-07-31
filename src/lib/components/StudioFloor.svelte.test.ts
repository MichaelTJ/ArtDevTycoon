import { StudioBridge } from '$lib/studio/bridge';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StudioFloor from './StudioFloor.svelte';

vi.mock('$lib/studio/createGame', () => ({
	createPhaserGame: vi.fn(() => ({ destroy: vi.fn() }))
}));

test('mounts studio-floor host', async () => {
	const bridge = new StudioBridge();
	const screen = render(StudioFloor, { bridge });
	const host = screen.getByTestId('studio-floor');
	await expect.element(host).toHaveAttribute('aria-label', 'Studio floor');
	await expect.element(host).toHaveAttribute('data-testid', 'studio-floor');
});
