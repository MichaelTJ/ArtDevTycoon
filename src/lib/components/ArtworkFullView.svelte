<script lang="ts">
	import type { GalleryEntry } from '$lib/types/contracts';
	import ArtworkFrame from './ArtworkFrame.svelte';
	import ScoreBadge from './ScoreBadge.svelte';
	import { adjacentGalleryEntry } from './galleryNav';
	import { fade, scale } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		entry: GalleryEntry;
		entries?: readonly GalleryEntry[];
		onclose: () => void;
		onselect?: (entry: GalleryEntry) => void;
	}

	let { entry, entries = [], onclose, onselect }: Props = $props();

	const titleId = 'artwork-full-view-title';
	let closeButton: HTMLButtonElement | undefined = $state();

	const prev = $derived(adjacentGalleryEntry(entries, entry.id, -1));
	const next = $derived(adjacentGalleryEntry(entries, entry.id, 1));
	const showArrows = $derived(prev !== null && next !== null);

	$effect(() => {
		closeButton?.focus();
	});

	function selectNeighbor(neighbor: GalleryEntry | null): void {
		if (!neighbor) return;
		onselect?.(neighbor);
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			onclose();
			return;
		}
		if (event.key === 'ArrowLeft') {
			if (!prev) return;
			event.preventDefault();
			selectNeighbor(prev);
			return;
		}
		if (event.key === 'ArrowRight') {
			if (!next) return;
			event.preventDefault();
			selectNeighbor(next);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby={titleId}
	in:fade={{ duration: prefersReducedMotion.current ? 0 : 200 }}
	out:fade={{ duration: prefersReducedMotion.current ? 0 : 150 }}
>
	<div
		class="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-stone-300 bg-white p-4 shadow-lg sm:p-6"
		in:scale={{ start: 0.95, duration: prefersReducedMotion.current ? 0 : 250 }}
		out:fade={{ duration: prefersReducedMotion.current ? 0 : 150 }}
	>
		<div class="flex min-h-0 w-full items-center gap-2">
			{#if showArrows}
				<button
					type="button"
					class="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-lg bg-stone-200 text-2xl font-medium text-stone-800 hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					aria-label="Previous artwork"
					onclick={() => selectNeighbor(prev)}
				>
					‹
				</button>
			{/if}

			<div class="max-h-[min(36dvh,18rem)] min-h-0 min-w-0 flex-1 overflow-hidden">
				<ArtworkFrame
					imageUrl={entry.imageUrl}
					title={entry.title}
					alt={entry.title}
					size="modal"
				/>
			</div>

			{#if showArrows}
				<button
					type="button"
					class="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-lg bg-stone-200 text-2xl font-medium text-stone-800 hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					aria-label="Next artwork"
					onclick={() => selectNeighbor(next)}
				>
					›
				</button>
			{/if}
		</div>

		<h2 id={titleId} class="mt-4 flex-shrink-0 text-xl font-bold text-stone-800">{entry.title}</h2>
		<p class="mt-2 flex-shrink-0 text-sm text-stone-500">For {entry.clientName}</p>

		<div class="mt-3 flex flex-shrink-0 flex-wrap items-center gap-3">
			<ScoreBadge label="Score" score={entry.score} />
			<p class="text-lg font-bold text-emerald-700">+${entry.payout}</p>
		</div>

		<button
			type="button"
			bind:this={closeButton}
			class="mt-6 min-h-11 w-full flex-shrink-0 rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			onclick={onclose}
		>
			Close
		</button>
	</div>
</div>
