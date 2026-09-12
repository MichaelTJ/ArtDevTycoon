<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		messages?: string[];
		intervalMs?: number;
		progress?: number | null;
		stageLabel?: string;
		/** Narrow sidebar next to the paint canvas — no image placeholder. */
		compact?: boolean;
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
		stageLabel = 'Painting',
		compact = false
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

<div class={['panel', compact && 'panel-compact']} role="status" aria-live="polite">
	<p class="label">{stageLabel}</p>

	{#if showDeterminateProgress}
		<div class="meter">
			<progress class="bar" value={progress} max={1} aria-label={stageLabel}></progress>
			<p class="percent">{progressPercent}%</p>
		</div>
	{:else}
		<div class="spinner" role="presentation" aria-hidden="true"></div>
	{/if}

	<p class="message">{currentMessage}</p>
</div>

<style>
	.panel {
		border: 1px solid #d6d3d1;
		border-radius: 0.75rem;
		background: #fff;
		padding: 1.25rem;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
	}

	.panel-compact {
		box-sizing: border-box;
		width: 12.5rem;
		padding: 0.75rem;
		box-shadow: none;
	}

	.label {
		margin: 0 0 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #292524;
	}

	.meter {
		margin-bottom: 0.5rem;
	}

	.bar {
		display: block;
		width: 100%;
		height: 0.5rem;
		accent-color: #d97706;
	}

	.panel-compact .bar {
		height: 0.375rem;
	}

	.percent {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		color: #78716c;
	}

	.spinner {
		display: inline-block;
		width: 1.5rem;
		height: 1.5rem;
		margin-bottom: 0.5rem;
		border: 3px solid #e7e5e4;
		border-top-color: #d97706;
		border-radius: 9999px;
		animation: spin 0.8s linear infinite;
	}

	.panel-compact .spinner {
		width: 1.25rem;
		height: 1.25rem;
		border-width: 2px;
	}

	.message {
		margin: 0;
		color: #292524;
	}

	.panel-compact .message {
		font-size: 0.875rem;
		line-height: 1.35;
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
