<script lang="ts">
	import type { GalleryEntry } from '$lib/types/contracts';
	import ArtworkFrame from './ArtworkFrame.svelte';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		entries: GalleryEntry[];
		label?: string;
		emptyMessage?: string;
		onselect: (entry: GalleryEntry) => void;
	}

	let {
		entries,
		label = 'Fridge',
		emptyMessage = 'Your finished pieces will hang here.',
		onselect
	}: Props = $props();

	const sortedEntries = $derived([...entries].sort((a, b) => b.completedAt - a.completedAt));
</script>

<section
	aria-label={label}
	class="fridge-door rounded-3xl border-4 border-stone-200 bg-white/90 p-4 shadow-inner"
>
	<div class="mb-2 h-2 w-full rounded bg-stone-100" aria-hidden="true"></div>
	{#if sortedEntries.length === 0}
		<p class="text-stone-500">{emptyMessage}</p>
	{:else}
		<ul class="flex gap-4 overflow-x-auto pb-2">
			{#each sortedEntries as entry, i (entry.id)}
				<li
					class="min-w-[7rem] shrink-0"
					animate:flip={{ duration: prefersReducedMotion.current ? 0 : 300 }}
				>
					<button
						type="button"
						class="block rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						style="transform: rotate({((i % 5) - 2) * 3}deg)"
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
