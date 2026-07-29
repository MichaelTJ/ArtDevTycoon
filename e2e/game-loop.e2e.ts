import { expect, test } from '@playwright/test';

test('a player can complete a full commission', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('main')).toHaveAttribute('data-engines-ready', 'true');
	await expect(page.getByText('Garage Studio')).toBeVisible();
	await expect(page.getByLabel('Current cash')).toHaveText('$100');

	await page.getByRole('button', { name: 'Wait for a Client' }).click();

	const prompt = page.getByLabel('Your prompt');
	await expect(prompt).toBeVisible();
	await prompt.fill('a cozy coffee cup on a wooden table');

	await page.getByRole('button', { name: 'Create Art' }).click();

	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible({ timeout: 15_000 });

	await page.getByRole('button', { name: 'Collect Cash' }).click();

	await expect(page.getByText('1 / 5 commissions')).toBeVisible();
	await expect(page.getByRole('listitem')).toHaveCount(1);
});

test('empty prompt is rejected', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Wait for a Client' }).click();

	const createButton = page.getByRole('button', { name: 'Create Art' });
	await expect(createButton).toBeDisabled();

	await page.getByLabel('Your prompt').fill('a cat');
	await expect(createButton).toBeEnabled();
});

test('hidden modifiers never leak into the UI', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Wait for a Client' }).click();
	await page.getByLabel('Your prompt').fill('a cozy coffee cup on a wooden table');
	await page.getByRole('button', { name: 'Create Art' }).click();
	await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: 'Collect Cash' }).click();

	await expect(page.getByText('crayon texture')).toHaveCount(0);
});

test('nothing downloads on its own', async ({ page }) => {
	const downloads: string[] = [];
	await page.route('**/*', (route) => {
		const url = route.request().url();
		if (/huggingface\.co|\.onnx$/.test(url)) {
			downloads.push(url);
		}
		void route.continue();
	});

	await page.goto('/');
	await page.waitForTimeout(1_500);

	expect(downloads).toHaveLength(0);
});

test('engine menu is disabled during a commission', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('main')).toHaveAttribute('data-engines-ready', 'true');
	await page.getByRole('button', { name: 'Wait for a Client' }).click();
	await page.getByLabel('Your prompt').fill('a cozy coffee cup on a wooden table');

	const engineButton = page.getByRole('button', { name: 'Art engine' });
	await expect(engineButton).toBeEnabled();

	await Promise.all([
		page.waitForFunction(() => {
			const button = document.querySelector(
				'button[aria-label="Art engine"]'
			) as HTMLButtonElement | null;
			return button?.disabled === true;
		}),
		page.getByRole('button', { name: 'Create Art' }).click()
	]);

	await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
	await expect(engineButton).toBeEnabled();
});

test('mobile viewport supports the happy path', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 740 });
	await page.goto('/');

	await page.getByRole('button', { name: 'Wait for a Client' }).click();
	await page.getByLabel('Your prompt').fill('a cozy coffee cup on a wooden table');
	await page.getByRole('button', { name: 'Create Art' }).click();
	await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: 'Collect Cash' }).click();

	await expect(page.getByText('1 / 5 commissions')).toBeVisible();
});
