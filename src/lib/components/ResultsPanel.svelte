<script lang="ts">
	import type { Artwork, Critique } from '$lib/types/contracts';
	import ArtworkFrame from './ArtworkFrame.svelte';
	import ScoreBadge from './ScoreBadge.svelte';
	import { fade, scale } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		artwork: Artwork;
		critique: Critique;
		clientName: string;
		oncollect: () => void;
	}

	let { artwork, critique, clientName, oncollect }: Props = $props();

	const titleId = 'results-panel-title';
	let collectButton: HTMLButtonElement | undefined = $state();

	$effect(() => {
		collectButton?.focus();
	});
</script>

<div
	class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	role="dialog"
	aria-modal="true"
	aria-labelledby={titleId}
	in:scale={{ start: 0.95, duration: prefersReducedMotion.current ? 0 : 250 }}
	out:fade={{ duration: prefersReducedMotion.current ? 0 : 200 }}
>
	<ArtworkFrame
		imageUrl={artwork.imageUrl}
		title={critique.title}
		alt={critique.title}
		size="full"
	/>

	<h2 id={titleId} class="mt-4 text-xl font-bold text-stone-800">{critique.title}</h2>

	<div class="mt-3 flex flex-wrap gap-2">
		<ScoreBadge label="Accuracy" score={critique.accuracyScore} />
		<ScoreBadge label="Creativity" score={critique.creativityScore} />
	</div>

	<blockquote class="mt-4 border-l-4 border-stone-300 pl-4 text-stone-800">
		<p>{critique.criticReview}</p>
		<footer class="mt-2 text-sm text-stone-500">— {clientName}</footer>
	</blockquote>

	<p class="mt-4 text-3xl font-bold text-emerald-700">+${critique.finalPayout}</p>

	<button
		type="button"
		bind:this={collectButton}
		class="mt-4 min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
		onclick={oncollect}
	>
		Collect Cash
	</button>
</div>
