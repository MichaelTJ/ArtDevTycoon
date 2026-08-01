import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DevPanel from './DevPanel.svelte';

const base = {
	enabled: true,
	reason: 'query' as const,
	cash: 100,
	reputation: 2,
	lifetimeCommissions: 1,
	draftPrompt: 'a cat',
	modifiedPrompt: 'a cat, crayon texture',
	onclose: vi.fn(),
	onsetcash: vi.fn(),
	onsetreputation: vi.fn(),
	onsetcommissions: vi.fn(),
	onunlockall: vi.fn(),
	onforceidle: vi.fn(),
	onexport: vi.fn(() => '{"version":1}'),
	onimport: vi.fn(),
	onlatch: vi.fn(),
	onclearlatch: vi.fn()
};

test('renders nothing when enabled is false', async () => {
	const screen = render(DevPanel, { ...base, enabled: false });
	await expect
		.element(screen.getByRole('dialog', { name: 'Developer tools' }))
		.not.toBeInTheDocument();
});

test('shows controls and modifier peek when enabled', async () => {
	const screen = render(DevPanel, base);
	await expect.element(screen.getByRole('dialog', { name: 'Developer tools' })).toBeVisible();
	await expect.element(screen.getByText('Dev only — players never see this.')).toBeVisible();
	await expect
		.element(screen.getByTestId('dev-modified-prompt'))
		.toHaveValue('a cat, crayon texture');
	await expect.element(screen.getByTestId('dev-reason')).toHaveTextContent('query');
});

test('economy apply and unlock callbacks fire', async () => {
	const onsetcash = vi.fn();
	const onunlockall = vi.fn();
	const screen = render(DevPanel, { ...base, onsetcash, onunlockall });
	await screen.getByRole('button', { name: 'Apply cash' }).click();
	expect(onsetcash).toHaveBeenCalledWith(100);
	await screen.getByRole('button', { name: 'Unlock all progression' }).click();
	expect(onunlockall).toHaveBeenCalledTimes(1);
});

test('export fills textarea from onexport return value', async () => {
	const onexport = vi.fn(() => '{"cash":42}');
	const screen = render(DevPanel, { ...base, onexport });
	await screen.getByRole('button', { name: 'Export save' }).click();
	expect(onexport).toHaveBeenCalledTimes(1);
	await expect.element(screen.getByTestId('dev-export-area')).toHaveValue('{"cash":42}');
});

test('Open saves callback fires when provided', async () => {
	const onopensaves = vi.fn();
	const screen = render(DevPanel, { ...base, onopensaves });
	await screen.getByRole('button', { name: 'Open saves' }).click();
	expect(onopensaves).toHaveBeenCalledTimes(1);
});
