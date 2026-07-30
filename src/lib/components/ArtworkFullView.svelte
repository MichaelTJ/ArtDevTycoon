<script lang="ts">
	import type { GalleryEntry } from '$lib/types/contracts';
	import ArtworkFrame from './ArtworkFrame.svelte';
	import ScoreBadge from './ScoreBadge.svelte';
	import { fade, scale } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		entry: GalleryEntry;
		onclose: () => void;
	}

	let { entry, onclose }: Props = $props();

	const titleId = 'artwork-full-view-title';
	let closeButton: HTMLButtonElement | undefined = $state();

	$effect(() => {
		closeButton?.focus();
	});

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			onclose();
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
		class="w-full max-w-lg rounded-xl border border-stone-300 bg-white p-6 shadow-lg"
		in:scale={{ start: 0.95, duration: prefersReducedMotion.current ? 0 : 250 }}
		out:fade={{ duration: prefersReducedMotion.current ? 0 : 150 }}
	>
		<ArtworkFrame imageUrl={entry.imageUrl} title={entry.title} alt={entry.title} size="full" />

		<h2 id={titleId} class="mt-4 text-xl font-bold text-stone-800">{entry.title}</h2>
		<p class="mt-2 text-sm text-stone-500">For {entry.clientName}</p>

		<div class="mt-3 flex flex-wrap items-center gap-3">
			<ScoreBadge label="Score" score={entry.score} />
			<p class="text-lg font-bold text-emerald-700">+${entry.payout}</p>
		</div>

		<button
			type="button"
			bind:this={closeButton}
			class="mt-6 min-h-11 w-full rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			onclick={onclose}
		>
			Close
		</button>
	</div>
</div>
