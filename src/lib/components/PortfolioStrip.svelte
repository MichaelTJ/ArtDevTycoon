<script lang="ts">
	import type { GalleryEntry } from '$lib/types/contracts';
	import ArtworkFrame from './ArtworkFrame.svelte';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		entries: GalleryEntry[];
		emptyMessage?: string;
	}

	let { entries, emptyMessage = 'Your finished pieces will hang here.' }: Props = $props();

	const sortedEntries = $derived([...entries].sort((a, b) => b.completedAt - a.completedAt));
</script>

<section class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm" aria-label="Portfolio">
	{#if sortedEntries.length === 0}
		<p class="text-stone-500">{emptyMessage}</p>
	{:else}
		<ul class="flex gap-4 overflow-x-auto pb-2">
			{#each sortedEntries as entry (entry.id)}
				<li
					class="min-w-[7rem] shrink-0"
					animate:flip={{ duration: prefersReducedMotion.current ? 0 : 300 }}
				>
					<ArtworkFrame
						imageUrl={entry.imageUrl}
						title={entry.title}
						alt={entry.title}
						size="thumb"
					/>
					<p class="mt-1 truncate text-sm font-medium text-stone-800">{entry.title}</p>
					<p class="text-sm text-emerald-700">+${entry.payout}</p>
					<p class="text-xs text-stone-500">Score {entry.score}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>
