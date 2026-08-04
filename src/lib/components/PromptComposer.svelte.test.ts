import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import PromptComposer from './PromptComposer.svelte';

test('typing updates the character counter', async () => {
	const screen = render(PromptComposer, { value: '' });
	const textarea = screen.getByLabelText('My idea');
	await userEvent.fill(textarea, 'hello');
	await expect.element(screen.getByText('5 / 500')).toBeVisible();
});

test('submit button is disabled for empty input', async () => {
	const screen = render(PromptComposer, { value: '' });
	await expect.element(screen.getByRole('button', { name: 'Create Art' })).toBeDisabled();
});

test('submit button is disabled for whitespace-only input', async () => {
	const screen = render(PromptComposer, { value: '   ' });
	await expect.element(screen.getByRole('button', { name: 'Create Art' })).toBeDisabled();
});

test('clicking submit calls onsubmit with trimmed value', async () => {
	const onsubmit = vi.fn();
	const screen = render(PromptComposer, { value: '  a cat  ', onsubmit });
	await screen.getByRole('button', { name: 'Create Art' }).click();
	expect(onsubmit).toHaveBeenCalledTimes(1);
	expect(onsubmit).toHaveBeenCalledWith('a cat');
});

test('submit button is disabled when disabled prop is true', async () => {
	const screen = render(PromptComposer, { value: 'a cat', disabled: true });
	await expect.element(screen.getByRole('button', { name: 'Create Art' })).toBeDisabled();
});

test('Ctrl+Enter submits', async () => {
	const onsubmit = vi.fn();
	const screen = render(PromptComposer, { value: 'dragon', onsubmit });
	const textarea = screen.getByLabelText('My idea');
	await userEvent.click(textarea);
	await userEvent.keyboard('{Control>}{Enter}{/Control}');
	expect(onsubmit).toHaveBeenCalledTimes(1);
	expect(onsubmit).toHaveBeenCalledWith('dragon');
});
