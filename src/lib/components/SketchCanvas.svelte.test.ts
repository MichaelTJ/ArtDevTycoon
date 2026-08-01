import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SketchCanvas from './SketchCanvas.svelte';

test('renders brush, eraser, size, and clear controls', async () => {
	const screen = render(SketchCanvas, {});
	await expect.element(screen.getByRole('button', { name: 'Brush' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Eraser' })).toBeVisible();
	await expect.element(screen.getByLabelText('Brush size')).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Clear' })).toBeVisible();
	await expect.element(screen.getByLabelText('Sketch canvas')).toBeVisible();
});

test('registers export callback via onexportready', async () => {
	const onexportready = vi.fn();
	render(SketchCanvas, { onexportready });
	expect(onexportready).toHaveBeenCalledOnce();
	const getBlob = onexportready.mock.calls[0]?.[0] as () => Promise<Blob | null>;
	await expect(getBlob()).resolves.toBeNull();
});

test('help copy mentions paint tools', async () => {
	const screen = render(SketchCanvas, {});
	await expect.element(screen.getByText(/Brush, eraser, size, and colour/i)).toBeVisible();
});
