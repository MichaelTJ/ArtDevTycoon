import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GenerationReadyToast from './GenerationReadyToast.svelte';

test('mount click fires onopen once', async () => {
	const onopen = vi.fn();
	const screen = render(GenerationReadyToast, { onopen });
	await expect
		.element(screen.getByRole('button', { name: 'Your painting is ready' }))
		.toBeVisible();
	await expect.element(screen.getByText('Compare your drawing and the AI image')).toBeVisible();
	await screen.getByRole('button', { name: 'Your painting is ready' }).click();
	expect(onopen).toHaveBeenCalledTimes(1);
});
