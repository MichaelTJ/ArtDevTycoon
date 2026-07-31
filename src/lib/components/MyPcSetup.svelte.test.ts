import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MyPcSetup from './MyPcSetup.svelte';

test('renders URL and API key fields', async () => {
	const screen = render(MyPcSetup, {
		baseUrl: 'https://pc.example.ts.net',
		apiKey: 'k'.repeat(32),
		testState: 'idle',
		testError: null,
		ontest: vi.fn(),
		onconnect: vi.fn(),
		oncancel: vi.fn()
	});

	await expect.element(screen.getByLabelText('PC Tailscale URL')).toBeVisible();
	await expect.element(screen.getByLabelText('API key')).toBeVisible();
});

test('Connect is disabled until test succeeds', async () => {
	const screen = render(MyPcSetup, {
		baseUrl: 'https://pc.example.ts.net',
		apiKey: 'k'.repeat(32),
		testState: 'idle',
		testError: null,
		ontest: vi.fn(),
		onconnect: vi.fn(),
		oncancel: vi.fn()
	});

	const connect = screen.getByRole('button', { name: 'Connect', exact: true });
	expect(connect.element()).toHaveProperty('disabled', true);
});

test('Connect is enabled after success', async () => {
	const screen = render(MyPcSetup, {
		baseUrl: 'https://pc.example.ts.net',
		apiKey: 'k'.repeat(32),
		testState: 'success',
		testError: null,
		ontest: vi.fn(),
		onconnect: vi.fn(),
		oncancel: vi.fn()
	});

	const connect = screen.getByRole('button', { name: 'Connect', exact: true });
	expect(connect.element()).toHaveProperty('disabled', false);
});

test('Test connection fires ontest', async () => {
	const ontest = vi.fn();
	const screen = render(MyPcSetup, {
		baseUrl: 'https://pc.example.ts.net',
		apiKey: 'k'.repeat(32),
		testState: 'idle',
		testError: null,
		ontest,
		onconnect: vi.fn(),
		oncancel: vi.fn()
	});

	await screen.getByRole('button', { name: 'Test connection' }).click();
	expect(ontest).toHaveBeenCalledOnce();
});

test('onconnect and oncancel fire', async () => {
	const onconnect = vi.fn();
	const oncancel = vi.fn();
	const screen = render(MyPcSetup, {
		baseUrl: 'https://pc.example.ts.net',
		apiKey: 'k'.repeat(32),
		testState: 'success',
		testError: null,
		ontest: vi.fn(),
		onconnect,
		oncancel
	});

	await screen.getByRole('button', { name: 'Connect', exact: true }).click();
	await screen.getByRole('button', { name: 'Cancel' }).click();
	expect(onconnect).toHaveBeenCalledOnce();
	expect(oncancel).toHaveBeenCalledOnce();
});

test('shows error alert when test fails', async () => {
	const screen = render(MyPcSetup, {
		baseUrl: 'https://pc.example.ts.net',
		apiKey: 'k'.repeat(32),
		testState: 'error',
		testError: 'Could not reach host',
		ontest: vi.fn(),
		onconnect: vi.fn(),
		oncancel: vi.fn()
	});

	await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not reach host');
});
