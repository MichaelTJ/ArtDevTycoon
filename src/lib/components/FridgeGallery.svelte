<script lang="ts">
	import type { GalleryEntry } from '$lib/types/contracts';
	import ArtworkFrame from './ArtworkFrame.svelte';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		entries: GalleryEntry[];
		label?: string;
		emptyMessage?: string;
		/** CSS class from the active `GalleryLayout.gridClassName`. Defaults to today's look. */
		layoutClassName?: string;
		onselect: (entry: GalleryEntry) => void;
	}

	let {
		entries,
		label = 'Fridge',
		emptyMessage = 'Your finished pieces will hang here.',
		layoutClassName = 'layout-cluttered',
		onselect
	}: Props = $props();

	/** Preserve caller order (store already curator- or recency-sorted). */
	const displayEntries = $derived(entries);

	/** Messy fridge tilt for cluttered/rows; nicer layouts hang straight. */
	const tiltEnabled = $derived(
		layoutClassName === 'layout-cluttered' || layoutClassName === 'layout-rows'
	);

	function tiltDegrees(index: number): number {
		if (!tiltEnabled) return 0;
		return ((index % 5) - 2) * 3;
	}
</script>

<section
	aria-label={label}
	class="fridge-door rounded-3xl border-4 border-stone-200 bg-white/90 p-4 shadow-inner"
>
	<div class="mb-2 h-2 w-full rounded bg-stone-100" aria-hidden="true"></div>
	{#if displayEntries.length === 0}
		<p class="text-stone-500">{emptyMessage}</p>
	{:else}
		<ul class="gallery-strip flex gap-4 overflow-x-auto pb-2 {layoutClassName}">
			{#each displayEntries as entry, i (entry.id)}
				<li
					class="min-w-[7rem] shrink-0"
					animate:flip={{ duration: prefersReducedMotion.current ? 0 : 300 }}
				>
					<button
						type="button"
						class="block rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						style="transform: rotate({tiltDegrees(i)}deg)"
						aria-label="{entry.title}, score {entry.score}. View full size."
						onclick={() => onselect(entry)}
					>
						<ArtworkFrame
							imageUrl={entry.imageUrl}
							title={entry.title}
							alt={entry.title}
							size="thumb"
						/>
					</button>
					<p class="mt-1 truncate text-sm font-medium text-stone-800">{entry.title}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	:global(ul.layout-rows) {
		flex-wrap: wrap;
		overflow-x: visible;
	}

	:global(ul.layout-salon) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		gap: 0.75rem;
		overflow-x: visible;
	}

	:global(ul.layout-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		gap: 0.5rem;
		overflow-x: visible;
	}

	:global(ul.layout-minimalist) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: 1.5rem;
		overflow-x: visible;
		justify-items: center;
	}
</style>
