<script lang="ts">
	import type { StudioBridge } from '$lib/studio/bridge';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		bridge: StudioBridge;
		/** Progressive gallery venue that selects the Phaser floor plan. */
		initialVenueId?: string;
		/** Extra classes for the game parent. */
		class?: string;
	}

	let { bridge, initialVenueId = 'fridge', class: className = '' }: Props = $props();

	let containerEl: HTMLDivElement | undefined = $state();
	let game: {
		destroy: (removeCanvas: boolean, noReturn?: boolean) => void;
		registry: { get: (key: string) => unknown };
	} | null = null;
	let bootState: 'loading' | 'ready' | 'error' = $state('loading');
	let bootError = $state('Studio failed to load.');

	const BOOT_TIMEOUT_MS = 20_000;

	onMount(() => {
		let cancelled = false;
		let settled = false;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		let pollId: ReturnType<typeof setInterval> | undefined;

		const clearTimers = () => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			if (pollId !== undefined) clearInterval(pollId);
		};

		const markReady = () => {
			if (cancelled || settled) return;
			settled = true;
			bootState = 'ready';
			clearTimers();
		};

		const markError = (message: string) => {
			if (cancelled || settled) return;
			settled = true;
			bootState = 'error';
			bootError = message;
			clearTimers();
		};

		const unsub = bridge.subscribe((event) => {
			if (event.type === 'ready') markReady();
		});

		timeoutId = setTimeout(() => {
			markError(
				'Studio took too long to load. Refresh the page, or set STUDIO_FLOOR_ENABLED to false.'
			);
		}, BOOT_TIMEOUT_MS);

		void (async () => {
			if (!containerEl) return;
			try {
				const { createPhaserGame } = await import('$lib/studio/createGame');
				if (cancelled || !containerEl) return;
				const created = createPhaserGame(containerEl, bridge, { initialVenueId });
				if (cancelled) {
					created.destroy(true);
					return;
				}
				game = created;
				pollId = setInterval(() => {
					if (game?.registry.get('studioBootFailed') === true) {
						markError('Studio assets failed to load.');
					}
				}, 100);
			} catch {
				markError('Studio could not start in this browser.');
			}
		})();

		return () => {
			cancelled = true;
			clearTimers();
			unsub();
		};
	});

	onDestroy(() => {
		game?.destroy(true);
		game = null;
	});
</script>

<div
	bind:this={containerEl}
	data-testid="studio-floor"
	class="studio-floor relative min-h-[420px] w-full overflow-hidden rounded-xl border border-stone-400 bg-stone-900 {className}"
	aria-label="Studio floor"
	aria-busy={bootState === 'loading'}
>
	{#if bootState === 'loading'}
		<p
			class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-stone-200"
			role="status"
			data-testid="studio-floor-loading"
		>
			Loading studio…
		</p>
	{:else if bootState === 'error'}
		<p
			class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm text-amber-100"
			role="alert"
			data-testid="studio-floor-error"
		>
			{bootError}
		</p>
	{/if}
</div>
