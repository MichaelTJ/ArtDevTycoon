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

test('accepts mediumTierId for brush profile', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'pencil' });
	await expect.element(screen.getByLabelText('Sketch canvas')).toBeVisible();
});

test('colour and size controls have accessible names', async () => {
	const screen = render(SketchCanvas, {});
	await expect.element(screen.getByLabelText('Brush size')).toBeVisible();
	expect(screen.getByLabelText('Custom colour').query()).toBeNull();
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
	expect(screen.getByRole('group', { name: 'RGB colour' }).query()).toBeNull();
	expect(screen.getByRole('group', { name: 'Oil brush' }).query()).toBeNull();
});

test('crayon medium keeps eight swatches and hides custom colour', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'crayon' });
	expect(screen.getByLabelText('Custom colour').query()).toBeNull();
	await expect.element(screen.getByLabelText('Colour #dc2626')).toBeVisible();
	expect(screen.getByLabelText('Colour #ec4899').query()).toBeNull();
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

test('slow sub-2px brush move still fires onpracticetick', async () => {
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
	now = 1_200;
	el.dispatchEvent(
		new PointerEvent('pointermove', { clientX: 41, clientY: 40, bubbles: true, pointerId: 1 })
	);
	expect(onpracticetick).toHaveBeenCalledWith(200);
});

test('slow coalesced move under 2s still fires onpracticetick', async () => {
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
	now = 1_800;
	el.dispatchEvent(
		new PointerEvent('pointermove', { clientX: 80, clientY: 40, bubbles: true, pointerId: 1 })
	);
	expect(onpracticetick).toHaveBeenCalledWith(800);
});

test('tab-thaw spike above 2s does not fire onpracticetick', async () => {
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
	now = 6_000;
	el.dispatchEvent(
		new PointerEvent('pointermove', { clientX: 80, clientY: 40, bubbles: true, pointerId: 1 })
	);
	expect(onpracticetick).not.toHaveBeenCalled();
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

test('heading replaces the old optional-sketch copy', async () => {
	const screen = render(SketchCanvas, { heading: 'Practice' });
	await expect.element(screen.getByRole('heading', { name: 'Practice' })).toBeVisible();
	expect(screen.getByText(/Optional sketch/i).query()).toBeNull();
});

test('oil medium shows Oil brush kinds', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'oil' });
	await expect.element(screen.getByRole('group', { name: 'Oil brush' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Round' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Bristle' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Flat' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Palette knife' })).toBeVisible();
});

test('non-oil medium hides Oil brush kinds', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'crayon' });
	expect(screen.getByRole('group', { name: 'Oil brush' }).query()).toBeNull();
});

test('optional ariaLabel overrides the canvas name', async () => {
	const screen = render(SketchCanvas, { ariaLabel: 'Practice canvas' });
	await expect.element(screen.getByLabelText('Practice canvas')).toBeVisible();
});

test('crayon canvas hides Custom colour, RGB, and oil stroke', async () => {
	const screen = render(SketchCanvas, {});
	expect(screen.getByLabelText('Custom colour').query()).toBeNull();
	await expect.element(screen.getByLabelText('Colour #dc2626')).toBeVisible();
	expect(screen.getByLabelText('Red').query()).toBeNull();
	expect(screen.getByRole('group', { name: 'RGB colour' }).query()).toBeNull();
	expect(screen.getByRole('group', { name: 'Oil brush' }).query()).toBeNull();
});

test('pencil canvas shows fourteen swatches including pink, not Custom colour', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'pencil' });
	await expect.element(screen.getByLabelText('Colour #dc2626')).toBeVisible();
	await expect.element(screen.getByLabelText('Colour #ec4899')).toBeVisible();
	await expect.element(screen.getByLabelText('Colour #fdba74')).toBeVisible();
	expect(screen.getByLabelText('Custom colour').query()).toBeNull();
	expect(screen.getByRole('group', { name: 'RGB colour' }).query()).toBeNull();
});

test('watercolor canvas shows RGB picker and watercolour swatches', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'watercolor' });
	await expect.element(screen.getByRole('group', { name: 'RGB colour' })).toBeVisible();
	await expect.element(screen.getByLabelText('Colour well')).toBeVisible();
	await expect.element(screen.getByLabelText('Red')).toBeVisible();
	await expect.element(screen.getByLabelText('Green')).toBeVisible();
	await expect.element(screen.getByLabelText('Blue')).toBeVisible();
	await expect.element(screen.getByLabelText('Colour #3d5a80')).toBeVisible();
	expect(screen.getByLabelText('Custom colour').query()).toBeNull();
	expect(screen.getByLabelText('Colour #dc2626').query()).toBeNull();
});

test('acrylic canvas shows RGB colour and #06b6d4', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'acrylic' });
	await expect.element(screen.getByRole('group', { name: 'RGB colour' })).toBeVisible();
	await expect.element(screen.getByLabelText('Colour #06b6d4')).toBeVisible();
});

test('oil canvas shows RGB colour and Oil brush kinds', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'oil' });
	await expect.element(screen.getByRole('group', { name: 'RGB colour' })).toBeVisible();
	await expect.element(screen.getByRole('group', { name: 'Oil brush' })).toBeVisible();
	await expect.element(screen.getByText('Oil brush')).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Round' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Bristle' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Flat' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Palette knife' })).toBeVisible();
	expect(screen.getByRole('button', { name: 'Round' }).element().getAttribute('aria-pressed')).toBe(
		'true'
	);
});

test('oil Bristle press updates aria-pressed', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'oil' });
	await screen.getByRole('button', { name: 'Bristle' }).click();
	expect(
		screen.getByRole('button', { name: 'Bristle' }).element().getAttribute('aria-pressed')
	).toBe('true');
	expect(screen.getByRole('button', { name: 'Round' }).element().getAttribute('aria-pressed')).toBe(
		'false'
	);
});

test('watercolor RGB well can set #ff0000', async () => {
	const screen = render(SketchCanvas, { mediumTierId: 'watercolor' });
	await screen.getByLabelText('Red').fill('255');
	await screen.getByLabelText('Green').fill('0');
	await screen.getByLabelText('Blue').fill('0');
	await expect.element(screen.getByLabelText('Colour well')).toHaveValue('#ff0000');
	await expect.element(screen.getByLabelText('Red')).toHaveValue(255);
});
