import { StudioBridge } from '$lib/studio/bridge';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StudioFloor from './StudioFloor.svelte';

const destroy = vi.fn();
const registrySet = vi.fn();
const createPhaserGame = vi.fn(() => ({
	destroy,
	registry: { get: () => undefined, set: registrySet }
}));

vi.mock('$lib/studio/createGame', () => ({
	createPhaserGame
}));

test('mounts studio-floor host with loading state and bark live region', async () => {
	const bridge = new StudioBridge();
	const screen = render(StudioFloor, { bridge });
	const host = screen.getByTestId('studio-floor');
	await expect.element(host).toHaveAttribute('aria-label', 'Studio floor');
	await expect.element(host).toHaveAttribute('data-testid', 'studio-floor');
	await expect.element(host).toHaveAttribute('aria-busy', 'true');
	await expect.element(screen.getByTestId('studio-floor-loading')).toBeVisible();
	await expect.element(screen.getByText('Loading studio…')).toBeVisible();
	const live = screen.getByTestId('bark-live');
	await expect.element(live).toHaveAttribute('aria-live', 'polite');
});

test('ready bridge event clears loading state', async () => {
	const bridge = new StudioBridge();
	const screen = render(StudioFloor, { bridge });
	bridge.emit({ type: 'ready' });
	await expect.element(screen.getByTestId('studio-floor-loading')).not.toBeInTheDocument();
	await expect.element(screen.getByTestId('studio-floor')).toHaveAttribute('aria-busy', 'false');
});

test('destroys Phaser game on unmount', async () => {
	destroy.mockClear();
	createPhaserGame.mockClear();
	registrySet.mockClear();
	const bridge = new StudioBridge();
	const screen = render(StudioFloor, { bridge });
	await vi.waitFor(() => {
		expect(createPhaserGame).toHaveBeenCalled();
	});
	await vi.waitFor(() => {
		expect(registrySet).toHaveBeenCalledWith('onBark', expect.any(Function));
	});
	screen.unmount();
	expect(destroy).toHaveBeenCalledWith(true);
});
