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
	await expect.element(screen.getByText(/Brush feel follows your painting medium/i)).toBeVisible();
});

test('accepts mediumTierId for brush profile', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'pencil' });
	await expect.element(screen.getByLabelText('Sketch canvas')).toBeVisible();
});

test('colour and size controls have accessible names', async () => {
	const screen = render(SketchCanvas, {});
	await expect.element(screen.getByLabelText('Brush size')).toBeVisible();
	await expect.element(screen.getByLabelText('Custom colour')).toBeVisible();
	await expect.element(screen.getByLabelText('Colour #1c1917')).toBeVisible();
	await expect.element(screen.getByLabelText('Colour #ffffff')).toBeVisible();
	await expect.element(screen.getByRole('group', { name: 'Tool' })).toBeVisible();
});

test('ink medium shows only black and white swatches without custom colour', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'ink' });
	await expect.element(screen.getByLabelText('Colour #0a0a0a')).toBeVisible();
	await expect.element(screen.getByLabelText('Colour #fafaf9')).toBeVisible();
	expect(screen.getByLabelText('Custom colour').query()).toBeNull();
	expect(screen.getByLabelText('Colour #dc2626').query()).toBeNull();
});

test('non-ink medium keeps full palette and custom colour input', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'crayon' });
	await expect.element(screen.getByLabelText('Custom colour')).toBeVisible();
	await expect.element(screen.getByLabelText('Colour #dc2626')).toBeVisible();
});

test('clear resets hasStrokes after a stroke', async () => {
	let hasStrokes = false;
	const screen = render(SketchCanvas, {
		get hasStrokes() {
			return hasStrokes;
		},
		set hasStrokes(value: boolean) {
			hasStrokes = value;
		}
	});
	const canvas = screen.getByLabelText('Sketch canvas');
	const el = canvas.element() as HTMLCanvasElement;
	el.dispatchEvent(
		new PointerEvent('pointerdown', { clientX: 40, clientY: 40, bubbles: true, pointerId: 1 })
	);
	el.dispatchEvent(
		new PointerEvent('pointerup', { clientX: 50, clientY: 50, bubbles: true, pointerId: 1 })
	);
	expect(hasStrokes).toBe(true);

	await screen.getByRole('button', { name: 'Clear' }).click();
	expect(hasStrokes).toBe(false);
});

test('prefers-reduced-motion: no obligatory animation', async () => {
	const screen = render(SketchCanvas, {});
	const root = screen.getByLabelText('Sketch pad').element();
	const style = getComputedStyle(root);
	expect(style.animationName === 'none' || style.animationName === '').toBe(true);
	expect(style.transitionDuration === '0s' || style.transitionDuration === '').toBe(true);
});

function mockCanvasRect(el: HTMLCanvasElement): void {
	el.getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			right: 384,
			bottom: 384,
			width: 384,
			height: 384,
			toJSON() {
				return {};
			}
		}) as DOMRect;
}

test('brush move of at least 2px fires onpracticetick with dt', async () => {
	let now = 1_000;
	const onpracticetick = vi.fn();
	const screen = render(SketchCanvas, {
		nowMs: () => now,
		onpracticetick
	});
	const el = screen.getByLabelText('Sketch canvas').element() as HTMLCanvasElement;
	mockCanvasRect(el);

	el.dispatchEvent(
		new PointerEvent('pointerdown', { clientX: 40, clientY: 40, bubbles: true, pointerId: 1 })
	);
	expect(onpracticetick).not.toHaveBeenCalled();
	now = 1_050;
	el.dispatchEvent(
		new PointerEvent('pointermove', { clientX: 50, clientY: 40, bubbles: true, pointerId: 1 })
	);
	expect(onpracticetick).toHaveBeenCalledWith(50);
});

test('eraser move does not fire onpracticetick', async () => {
	let now = 1_000;
	const onpracticetick = vi.fn();
	const screen = render(SketchCanvas, {
		nowMs: () => now,
		onpracticetick
	});
	await screen.getByRole('button', { name: 'Eraser' }).click();
	const el = screen.getByLabelText('Sketch canvas').element() as HTMLCanvasElement;
	mockCanvasRect(el);

	el.dispatchEvent(
		new PointerEvent('pointerdown', { clientX: 40, clientY: 40, bubbles: true, pointerId: 1 })
	);
	now = 1_050;
	el.dispatchEvent(
		new PointerEvent('pointermove', { clientX: 80, clientY: 80, bubbles: true, pointerId: 1 })
	);
	expect(onpracticetick).not.toHaveBeenCalled();
});

test('disabled canvas does not fire onpracticetick', async () => {
	let now = 1_000;
	const onpracticetick = vi.fn();
	const screen = render(SketchCanvas, {
		disabled: true,
		nowMs: () => now,
		onpracticetick
	});
	const el = screen.getByLabelText('Sketch canvas').element() as HTMLCanvasElement;
	mockCanvasRect(el);

	el.dispatchEvent(
		new PointerEvent('pointerdown', { clientX: 40, clientY: 40, bubbles: true, pointerId: 1 })
	);
	now = 1_050;
	el.dispatchEvent(
		new PointerEvent('pointermove', { clientX: 80, clientY: 80, bubbles: true, pointerId: 1 })
	);
	expect(onpracticetick).not.toHaveBeenCalled();
});

test('optional ariaLabel overrides the canvas name', async () => {
	const screen = render(SketchCanvas, { ariaLabel: 'Practice canvas' });
	await expect.element(screen.getByLabelText('Practice canvas')).toBeVisible();
});
