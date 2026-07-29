<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		messages?: string[];
		intervalMs?: number;
		progress?: number | null;
		stageLabel?: string;
	}

	let {
		messages = [
			'Sharpening the crayons…',
			'Mixing colours in the garage…',
			'Squinting at the brief…',
			'Arguing with the muse…',
			'Blending, badly…'
		],
		intervalMs = 2200,
		progress = null,
		stageLabel = 'Painting'
	}: Props = $props();

	let messageIndex = $state(0);

	const currentMessage = $derived(messages[messageIndex] ?? messages[0] ?? '');
	const showDeterminateProgress = $derived(progress !== null && progress >= 0 && progress <= 1);
	const progressPercent = $derived(showDeterminateProgress ? Math.round((progress ?? 0) * 100) : 0);

	$effect(() => {
		if (prefersReducedMotion.current || messages.length <= 1) {
			messageIndex = 0;
			return;
		}

		let index = 0;
		const timer = setInterval(() => {
			index = (index + 1) % messages.length;
			messageIndex = index;
		}, intervalMs);

		return () => clearInterval(timer);
	});
</script>

<div
	class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	role="status"
	aria-live="polite"
>
	<p class="mb-1 text-sm font-medium text-stone-800">{stageLabel}</p>

	<div class="skeleton mb-4 h-48 w-full max-w-[512px] rounded-lg" aria-hidden="true"></div>

	{#if showDeterminateProgress}
		<div class="mb-4">
			<progress class="h-3 w-full accent-amber-600" value={progress} max={1} aria-label={stageLabel}
			></progress>
			<p class="mt-1 text-sm text-stone-500">{progressPercent}%</p>
		</div>
	{:else}
		<div
			class="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-amber-600 motion-reduce:animate-none"
			role="presentation"
			aria-hidden="true"
		></div>
	{/if}

	<p class="text-stone-800">{currentMessage}</p>
</div>

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			rgb(231 229 228) 25%,
			rgb(245 245 244) 50%,
			rgb(231 229 228) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
			background: rgb(231 229 228);
		}
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
