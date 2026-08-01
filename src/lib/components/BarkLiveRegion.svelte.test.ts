import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BarkLiveRegion from './BarkLiveRegion.svelte';

test('mount with empty line keeps live region without speaker text', async () => {
	const screen = render(BarkLiveRegion, { speakerLabel: null, line: null });
	const region = screen.getByTestId('bark-live');
	await expect.element(region).toHaveAttribute('aria-live', 'polite');
	await expect.element(region).toHaveAttribute('aria-atomic', 'true');
	expect(region.element().textContent?.trim() ?? '').toBe('');
});

test('announces speaker and line for screen readers', async () => {
	const screen = render(BarkLiveRegion, {
		speakerLabel: 'Mum',
		line: 'Tea first. Then genius.'
	});
	const region = screen.getByTestId('bark-live');
	await expect.element(region).toHaveTextContent('Mum: Tea first. Then genius.');
});

test('clearing line empties the region', async () => {
	const screen = render(BarkLiveRegion, {
		speakerLabel: 'Mum',
		line: 'Tea first. Then genius.'
	});
	const region = screen.getByTestId('bark-live');
	await expect.element(region).toHaveTextContent('Mum: Tea first. Then genius.');

	await screen.rerender({ speakerLabel: null, line: null });
	expect(region.element().textContent?.trim() ?? '').toBe('');
});
