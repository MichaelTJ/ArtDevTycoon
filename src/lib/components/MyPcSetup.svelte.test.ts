import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MyPcSetup from './MyPcSetup.svelte';

const baseProps = {
	baseUrl: 'https://pc.example.ts.net',
	apiKey: 'k'.repeat(32),
	testState: 'idle' as const,
	testError: null,
	onrefreshmodels: vi.fn(),
	ontest: vi.fn(),
	onconnect: vi.fn(),
	oncancel: vi.fn()
};

test('renders provider select and URL fields', async () => {
	const screen = render(MyPcSetup, { ...baseProps, provider: 'januslink' });

	await expect.element(screen.getByLabelText('Provider')).toBeVisible();
	await expect.element(screen.getByLabelText('PC Tailscale URL')).toBeVisible();
	await expect.element(screen.getByLabelText('API key')).toBeVisible();
});

test('januslink hides model fields', async () => {
	const screen = render(MyPcSetup, { ...baseProps, provider: 'januslink' });
	await expect.element(screen.getByLabelText('Generation model')).not.toBeInTheDocument();
});

test('ollama shows both model fields', async () => {
	const screen = render(MyPcSetup, {
		...baseProps,
		provider: 'ollama',
		baseUrl: 'http://localhost:11434',
		generateModel: 'flux',
		critiqueModel: 'llava'
	});
	await expect.element(screen.getByLabelText('Generation model')).toBeVisible();
	await expect.element(screen.getByLabelText('Critique model')).toBeVisible();
});

test('automatic1111 shows critique provider fields', async () => {
	const screen = render(MyPcSetup, {
		...baseProps,
		provider: 'automatic1111',
		baseUrl: 'http://127.0.0.1:7860',
		critiqueProvider: 'ollama',
		critiqueBaseUrl: 'http://localhost:11434',
		critiqueModel: 'llava'
	});
	await expect.element(screen.getByLabelText('Critique provider')).toBeVisible();
	await expect.element(screen.getByLabelText('Critique base URL')).toBeVisible();
	await expect.element(screen.getByLabelText('Critique model')).toBeVisible();
});

test('Connect is disabled until test succeeds', async () => {
	const screen = render(MyPcSetup, { ...baseProps });
	const connect = screen.getByRole('button', { name: 'Connect', exact: true });
	expect(connect.element()).toHaveProperty('disabled', true);
});

test('Connect is enabled after success', async () => {
	const screen = render(MyPcSetup, { ...baseProps, testState: 'success' });
	const connect = screen.getByRole('button', { name: 'Connect', exact: true });
	expect(connect.element()).toHaveProperty('disabled', false);
});

test('Test connection fires ontest', async () => {
	const ontest = vi.fn();
	const screen = render(MyPcSetup, { ...baseProps, ontest });
	await screen.getByRole('button', { name: 'Test connection' }).click();
	expect(ontest).toHaveBeenCalledOnce();
});

test('onconnect and oncancel fire', async () => {
	const onconnect = vi.fn();
	const oncancel = vi.fn();
	const screen = render(MyPcSetup, {
		...baseProps,
		testState: 'success',
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
		...baseProps,
		testState: 'error',
		testError: 'Could not reach host'
	});
	await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not reach host');
});

test('JanusLink setup help mentions Tailscale and JANUS_ALLOWED_ORIGINS', async () => {
	const screen = render(MyPcSetup, { ...baseProps, provider: 'januslink' });
	await screen.getByRole('button', { name: 'Setup help' }).click();
	await expect.element(screen.getByText(/same Tailscale/i)).toBeVisible();
	await expect.element(screen.getByText(/JANUS_ALLOWED_ORIGINS/)).toBeVisible();
});

test('Refresh models fires callback', async () => {
	const onrefreshmodels = vi.fn();
	const screen = render(MyPcSetup, {
		...baseProps,
		provider: 'ollama',
		baseUrl: 'http://localhost:11434',
		generateModel: 'flux',
		critiqueModel: 'llava',
		onrefreshmodels
	});
	await screen.getByRole('button', { name: 'Refresh models' }).click();
	expect(onrefreshmodels).toHaveBeenCalledOnce();
});

test('openrouter shows API key warning; Coming soon omits cloud vendors', async () => {
	const screen = render(MyPcSetup, {
		...baseProps,
		provider: 'openrouter',
		baseUrl: 'https://openrouter.ai/api/v1',
		apiKey: 'test-key-not-real-00000000',
		generateModel: 'flux',
		critiqueModel: 'gpt-4o'
	});
	await expect.element(screen.getByText(/stored in this browser's localStorage/i)).toBeVisible();
	const comingSoon = screen.getByText('Coming soon').element().parentElement;
	expect(comingSoon?.textContent ?? '').toMatch(/ComfyUI/);
	expect(comingSoon?.textContent ?? '').not.toMatch(/OpenRouter/);
	expect(comingSoon?.textContent ?? '').not.toMatch(/OpenAI/);
});
