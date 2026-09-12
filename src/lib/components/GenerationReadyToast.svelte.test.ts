import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GenerationReadyToast from './GenerationReadyToast.svelte';

test('mount click fires onopen once', async () => {
	const onopen = vi.fn();
	const screen = render(GenerationReadyToast, { onopen });
	await expect
		.element(screen.getByRole('button', { name: /Finished! Click here to compare drawings/ }))
		.toBeVisible();
	await screen.getByRole('button', { name: /Finished! Click here to compare drawings/ }).click();
	expect(onopen).toHaveBeenCalledTimes(1);
});
