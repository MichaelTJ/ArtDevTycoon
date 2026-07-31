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
	let game: { destroy: (removeCanvas: boolean, noReturn?: boolean) => void } | null = null;

	onMount(() => {
		let cancelled = false;
		void (async () => {
			if (!containerEl) return;
			const { createPhaserGame } = await import('$lib/studio/createGame');
			if (cancelled || !containerEl) return;
			game = createPhaserGame(containerEl, bridge, { initialVenueId });
		})();
		return () => {
			cancelled = true;
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
	class="studio-floor min-h-[420px] w-full overflow-hidden rounded-xl border border-stone-400 bg-stone-900 {className}"
	aria-label="Studio floor"
></div>
