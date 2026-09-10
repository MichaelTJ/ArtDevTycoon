import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SubmitCompareModal from './SubmitCompareModal.svelte';

test('drawingImageUrl null shows No drawing yet and Back fires onback', async () => {
	const onback = vi.fn();
	const screen = render(SubmitCompareModal, {
		drawingImageUrl: null,
		aiImageUrl: 'data:image/svg+xml,%3Csvg/%3E',
		canSubmitDrawing: false,
		onsubmitai: vi.fn(),
		onsubmitdrawing: vi.fn(),
		onback
	});
	await expect.element(screen.getByRole('dialog', { name: 'Compare paintings' })).toBeVisible();
	await expect.element(screen.getByText('No drawing yet')).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Submit your drawing' })).toBeDisabled();
	await screen.getByRole('button', { name: 'Back to painting' }).click();
	expect(onback).toHaveBeenCalledTimes(1);
});
