/**
 * Headed Edge driver for explorer2 batches. Janus needs WebGPU, so this is not
 * headless. Uses your real Edge profile so the model cache is reused.
 *
 * Close other Edge windows first (the profile lock is exclusive), then:
 *
 *   node src/lib/modifier-explorer2/autorun-round.mjs round6
 *
 * Dev server must already be running (`npm run dev`).
 */
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const round = process.argv[2] ?? 'round6';
const origin = process.argv[3] ?? 'http://localhost:5173';
const url = `${origin}/modifier-explorer2?autorun=${encodeURIComponent(round)}`;
const doneTimeoutMs = 90 * 60 * 1000;

function edgeUserDataDir() {
	if (process.env.ADT_EXPLORER_EDGE_PROFILE) {
		return process.env.ADT_EXPLORER_EDGE_PROFILE;
	}
	if (process.platform === 'win32') {
		return path.join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'Edge', 'User Data');
	}
	if (process.platform === 'darwin') {
		return path.join(os.homedir(), 'Library', 'Application Support', 'Microsoft Edge');
	}
	return path.join(os.homedir(), '.config', 'microsoft-edge');
}

const userDataDir = edgeUserDataDir();

const launchOptions = {
	headless: false,
	channel: 'msedge',
	viewport: { width: 1440, height: 960 },
	args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--profile-directory=Default']
};

let context;
try {
	context = await chromium.launchPersistentContext(userDataDir, launchOptions);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(
		`Could not launch Edge with profile:\n  ${userDataDir}\n${message}\n\nClose every Edge window (the profile can only be used by one process), then retry.`
	);
	process.exit(1);
}

const page = context.pages()[0] ?? (await context.newPage());

console.log(`Opening ${url} in Edge`);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

await page.waitForSelector('[data-run-status]', { timeout: 30_000 });
await page.waitForFunction(
	() => {
		const status = document.querySelector('[data-run-status]')?.getAttribute('data-run-status');
		return (
			status === 'loading-engine' || status === 'running' || status === 'done' || status === 'error'
		);
	},
	null,
	{ timeout: 120_000 }
);

const started = Date.now();
let lastMessage = '';

while (Date.now() - started < doneTimeoutMs) {
	let snapshot;
	try {
		snapshot = await page.evaluate(() => {
			const el = document.querySelector('[data-run-status]');
			return {
				status: el?.getAttribute('data-run-status') ?? 'missing',
				message: el?.querySelector('p')?.textContent?.trim() ?? ''
			};
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes('Execution context was destroyed')) {
			console.log('Page reloaded; waiting for the run to resume…');
			await page.waitForSelector('[data-run-status]', { timeout: 60_000 }).catch(() => undefined);
			continue;
		}
		throw error;
	}

	if (snapshot.message && snapshot.message !== lastMessage) {
		lastMessage = snapshot.message;
		console.log(`[${snapshot.status}] ${snapshot.message}`);
	}

	if (snapshot.status === 'done') {
		console.log('Round finished.');
		await context.close();
		process.exit(0);
	}
	if (snapshot.status === 'error') {
		console.error(`Round failed: ${snapshot.message}`);
		await context.close();
		process.exit(1);
	}

	await new Promise((resolve) => setTimeout(resolve, 5000));
}

console.error('Timed out waiting for the explorer run to finish.');
await context.close();
process.exit(1);
