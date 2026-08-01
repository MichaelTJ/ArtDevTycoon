<script lang="ts">
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		label: string;
		value: number;
		max: number;
		hint?: string;
		delta?: number;
		emphasize?: boolean;
		variant?: 'default' | 'compact';
	}

	let {
		label,
		value,
		max,
		hint,
		delta = 0,
		emphasize = false,
		variant = 'default'
	}: Props = $props();

	const displayValue = Tween.of(() => value, {
		duration: prefersReducedMotion.current ? 0 : 500,
		easing: cubicOut
	});

	/** Spec: max 0 means "full" (capped meters), not an empty 0/1 bar. */
	const safeMax = $derived(max <= 0 ? 1 : max);
	const progressValue = $derived(max <= 0 ? safeMax : Math.min(displayValue.current, safeMax));
	const progressId = $derived(`progress-${label.replace(/\s+/g, '-').toLowerCase()}`);
</script>

<div
	class="min-w-0"
	class:rounded-md={emphasize}
	class:bg-amber-50={emphasize}
	class:px-1={emphasize}
	class:py-0.5={emphasize}
	class:ring-1={emphasize}
	class:ring-amber-200={emphasize}
>
	<div class="mb-0.5 flex items-baseline justify-between gap-2">
		<label for={progressId} class="text-sm text-stone-600 {variant === 'compact' ? 'text-xs' : ''}">
			{label}
		</label>
		{#if delta > 0}
			<span class="text-xs font-semibold text-emerald-700" aria-live="polite">+{delta}</span>
		{/if}
	</div>
	<progress
		id={progressId}
		aria-label={label}
		class="w-full accent-amber-600 {variant === 'compact' ? 'h-2' : 'h-3'}"
		value={progressValue}
		max={safeMax}
	></progress>
	{#if hint}
		<p class="mt-0.5 text-xs text-stone-500">{hint}</p>
	{/if}
</div>
