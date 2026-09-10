import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RgbColourPicker from './RgbColourPicker.svelte';

test('RgbColourPicker value="#112233" shows Red 17, Green 34, Blue 51', async () => {
	const screen = render(RgbColourPicker, { value: '#112233', onchange: vi.fn() });
	await expect.element(screen.getByRole('group', { name: 'RGB colour' })).toBeVisible();
	await expect.element(screen.getByLabelText('Colour well')).toBeVisible();
	const red = screen.getByLabelText('Red').element() as HTMLInputElement;
	const green = screen.getByLabelText('Green').element() as HTMLInputElement;
	const blue = screen.getByLabelText('Blue').element() as HTMLInputElement;
	const well = screen.getByLabelText('Colour well').element() as HTMLInputElement;
	expect(red.value).toBe('17');
	expect(green.value).toBe('34');
	expect(blue.value).toBe('51');
	expect(well.value).toBe('#112233');
});

test('changing Red to 255 emits #ff2233', async () => {
	const onchange = vi.fn();
	const screen = render(RgbColourPicker, { value: '#112233', onchange });
	const red = screen.getByLabelText('Red').element() as HTMLInputElement;
	red.value = '255';
	red.dispatchEvent(new Event('input', { bubbles: true }));
	expect(onchange).toHaveBeenCalledWith('#ff2233');
});

test('does not emit onchange when composed hex equals current value', async () => {
	const onchange = vi.fn();
	const screen = render(RgbColourPicker, { value: '#112233', onchange });
	const red = screen.getByLabelText('Red').element() as HTMLInputElement;
	red.value = '17';
	red.dispatchEvent(new Event('input', { bubbles: true }));
	expect(onchange).not.toHaveBeenCalled();
});

test('disabled greys out the well and RGB number inputs', async () => {
	const screen = render(RgbColourPicker, { value: '#112233', disabled: true, onchange: vi.fn() });
	expect((screen.getByLabelText('Colour well').element() as HTMLInputElement).disabled).toBe(true);
	expect((screen.getByLabelText('Red').element() as HTMLInputElement).disabled).toBe(true);
	expect((screen.getByLabelText('Green').element() as HTMLInputElement).disabled).toBe(true);
	expect((screen.getByLabelText('Blue').element() as HTMLInputElement).disabled).toBe(true);
});
