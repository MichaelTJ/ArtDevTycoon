import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { modifierExplorerPlugin } from './src/lib/modifier-explorer/vite-plugin';
import { modifierExplorer2Plugin } from './src/lib/modifier-explorer2/vite-plugin';

export default defineConfig({
	plugins: [
		modifierExplorerPlugin(),
		modifierExplorer2Plugin(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// The whole game is a static bundle: inference runs in the player's browser,
			// so there is no server to deploy and it hosts anywhere as a plain CDN drop.
			adapter: adapter({ fallback: '404.html' }),
			paths: {
				base: process.argv.includes('build') && process.env.BASE_PATH ? process.env.BASE_PATH : ''
			},
			prerender: {
				handleHttpError: 'warn',
				handleUnseenRoutes: 'ignore'
			}
		})
	],
	// These ship their own WASM and worker assets. Letting Vite pre-bundle them rewrites
	// the URLs those assets are fetched from, and inference then fails at runtime.
	optimizeDeps: { exclude: ['onnxruntime-web', '@huggingface/transformers'] },
	worker: { format: 'es' },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'node',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
