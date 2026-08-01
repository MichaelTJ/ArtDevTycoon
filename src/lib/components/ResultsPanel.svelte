<script lang="ts">
	import type { SkillGainPreview } from '$lib/game';
	import {
		MUM_DISPLAY_SCORE,
		pickMumPraiseLine,
		praiseSeedFromArtworkId,
		type MumRealCritique
	} from '$lib/game/mumCritiquePresentation';
	import type { Artwork, Critique } from '$lib/types/contracts';
	import ArtworkFrame from './ArtworkFrame.svelte';
	import ScoreBadge from './ScoreBadge.svelte';
	import WorkGainToast from './WorkGainToast.svelte';
	import { fade, scale } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		artwork: Artwork;
		critique: Critique;
		clientName: string;
		oncollect: () => void;
		/** When false, hide Collect Cash — studio floor delivers via interact. Default true. */
		showCollectButton?: boolean;
		pendingSkillGains?: SkillGainPreview | null;
		pendingReputation?: number;
		/** When set, default to toddler praise and hide this engine verdict until reveal. */
		mumRealCritique?: MumRealCritique | null;
	}

	let {
		artwork,
		critique,
		clientName,
		oncollect,
		showCollectButton = true,
		pendingSkillGains = null,
		pendingReputation = 0,
		mumRealCritique = null
	}: Props = $props();

	const titleId = 'results-panel-title';
	let collectButton: HTMLButtonElement | undefined = $state();
	let realCritiqueRevealed = $state(false);

	const praiseLine = $derived(
		mumRealCritique ? pickMumPraiseLine(praiseSeedFromArtworkId(artwork.id)) : null
	);

	const displayTitle = $derived(
		mumRealCritique && realCritiqueRevealed ? mumRealCritique.title : critique.title
	);

	const displayAccuracy = $derived(
		mumRealCritique && !realCritiqueRevealed
			? MUM_DISPLAY_SCORE
			: mumRealCritique && realCritiqueRevealed
				? mumRealCritique.accuracyScore
				: critique.accuracyScore
	);

	const displayCreativity = $derived(
		mumRealCritique && !realCritiqueRevealed
			? MUM_DISPLAY_SCORE
			: mumRealCritique && realCritiqueRevealed
				? mumRealCritique.creativityScore
				: critique.creativityScore
	);

	const displayReview = $derived(
		mumRealCritique && !realCritiqueRevealed
			? (praiseLine ?? critique.criticReview)
			: mumRealCritique && realCritiqueRevealed
				? mumRealCritique.criticReview
				: critique.criticReview
	);

	$effect(() => {
		if (showCollectButton) {
			collectButton?.focus();
		}
	});

	$effect(() => {
		void mumRealCritique;
		realCritiqueRevealed = false;
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
	<ArtworkFrame imageUrl={artwork.imageUrl} title={displayTitle} alt={displayTitle} size="full" />

	<h2 id={titleId} class="mt-4 text-xl font-bold text-stone-800">{displayTitle}</h2>

	<div class="mt-3 flex flex-wrap gap-2">
		<ScoreBadge label="Accuracy" score={displayAccuracy} />
		<ScoreBadge label="Creativity" score={displayCreativity} />
	</div>

	<blockquote class="mt-4 border-l-4 border-stone-300 pl-4 text-stone-800">
		<p>{displayReview}</p>
		<footer class="mt-2 text-sm text-stone-500">— {clientName}</footer>
	</blockquote>

	{#if mumRealCritique && !realCritiqueRevealed}
		<button
			type="button"
			class="mt-4 min-h-11 rounded-lg border border-stone-400 bg-stone-100 px-4 py-2 font-semibold text-stone-800 hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			aria-label="Ask for real critique from the art critic"
			onclick={() => {
				realCritiqueRevealed = true;
			}}
		>
			Ask for real critique
		</button>
	{:else if mumRealCritique && realCritiqueRevealed}
		<p class="mt-4 text-sm text-stone-500" role="status" aria-live="polite">
			Real critic feedback shown.
		</p>
	{/if}

	<p class="mt-4 text-3xl font-bold text-emerald-700">+${critique.finalPayout}</p>

	{#if pendingSkillGains}
		<div class="mt-3">
			<WorkGainToast
				gains={pendingSkillGains}
				reputation={pendingReputation}
				cash={critique.finalPayout}
				mode="pending"
			/>
		</div>
	{/if}

	{#if showCollectButton}
		<button
			type="button"
			bind:this={collectButton}
			class="mt-4 min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			onclick={oncollect}
		>
			Collect Cash
		</button>
	{/if}
</div>
