import { expect, test } from '@playwright/test';

/** Wait for timed client arrival, then use debug Talk (avoids flaky pathfinding). */
async function waitForClientAndTalk(page: import('@playwright/test').Page) {
	await expect(page.getByTestId('studio-floor')).toBeVisible();
	await expect(page.getByTestId('studio-debug-talk')).toBeVisible({ timeout: 15_000 });
	await page.getByTestId('studio-debug-talk').click();
}

async function deliverPainting(page: import('@playwright/test').Page) {
	await expect(page.getByTestId('studio-debug-deliver')).toBeVisible({ timeout: 15_000 });
	await page.getByTestId('studio-debug-deliver').click();
}

test('a player can complete a full commission', async ({ page }) => {
	await page.goto('/?studioDebug=1');
	await expect(page.locator('main')).toHaveAttribute('data-engines-ready', 'true');
	await expect(page.getByText('Home Kitchen')).toBeVisible();
	await expect(page.getByLabel('Current cash')).toHaveText('$100');

	await waitForClientAndTalk(page);

	const prompt = page.getByLabel('Your prompt');
	await expect(prompt).toBeVisible();
	await prompt.fill('a cozy coffee cup on a wooden table');

	await page.getByRole('button', { name: 'Create Art' }).click();

	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(/press E to deliver/)).toBeVisible();

	await deliverPainting(page);

	await expect(page.getByText('1 / 5 commissions')).toBeVisible();
	await expect(page.getByRole('listitem')).toHaveCount(1);
});

test('empty prompt is rejected', async ({ page }) => {
	await page.goto('/?studioDebug=1');
	await waitForClientAndTalk(page);

	const createButton = page.getByRole('button', { name: 'Create Art' });
	await expect(createButton).toBeDisabled();

	await page.getByLabel('Your prompt').fill('a cat');
	await expect(createButton).toBeEnabled();
});

test('hidden modifiers never leak into the UI', async ({ page }) => {
	await page.goto('/?studioDebug=1');
	await waitForClientAndTalk(page);
	await page.getByLabel('Your prompt').fill('a cozy coffee cup on a wooden table');
	await page.getByRole('button', { name: 'Create Art' }).click();
	await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
	await deliverPainting(page);

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

	await page.goto('/?studioDebug=1');
	await page.waitForTimeout(1_500);

	expect(downloads).toHaveLength(0);
});

test('engine menu is disabled during a commission', async ({ page }) => {
	await page.goto('/?studioDebug=1');
	await expect(page.locator('main')).toHaveAttribute('data-engines-ready', 'true');
	await waitForClientAndTalk(page);
	await page.getByLabel('Your prompt').fill('a cozy coffee cup on a wooden table');

	const engineButton = page.getByRole('button', { name: /Art engine/ });
	await expect(engineButton).toBeEnabled();

	await Promise.all([
		page.waitForFunction(() => {
			const button = document.querySelector(
				'button[aria-label^="Art engine"]'
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
	await page.goto('/?studioDebug=1');

	await waitForClientAndTalk(page);
	await page.getByLabel('Your prompt').fill('a cozy coffee cup on a wooden table');
	await page.getByRole('button', { name: 'Create Art' }).click();
	await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
	await deliverPainting(page);

	await expect(page.getByText('1 / 5 commissions')).toBeVisible();
});
