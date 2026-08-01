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
	const compact = $derived(variant === 'compact');
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
	<div class="mb-0.5 flex min-w-0 items-center justify-between gap-2">
		<label
			for={progressId}
			class="min-w-0 truncate text-sm text-stone-600 {compact ? 'text-xs' : ''}"
			title={label}
		>
			{label}
		</label>
		<div class="flex shrink-0 items-center gap-2">
			{#if compact && hint}
				<span class="max-w-[9rem] truncate text-xs text-stone-500" title={hint}>{hint}</span>
			{/if}
			{#if delta > 0}
				<span class="text-xs font-semibold text-emerald-700" aria-live="polite">+{delta}</span>
			{/if}
		</div>
	</div>
	<progress
		id={progressId}
		aria-label={hint ? `${label}. ${hint}` : label}
		class="block w-full accent-amber-600 {compact ? 'h-2' : 'h-3'}"
		value={progressValue}
		max={safeMax}
	></progress>
	{#if hint && !compact}
		<p class="mt-0.5 truncate text-xs text-stone-500" title={hint}>{hint}</p>
	{/if}
</div>
