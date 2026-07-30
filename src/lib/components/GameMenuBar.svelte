<script lang="ts">
	import type { Snippet } from 'svelte';
	import HudBar from './HudBar.svelte';

	interface Props {
		cash: number;
		levelName: string;
		commissionsCompleted: number;
		targetCommissions: number;
		targetCash: number;
		engineButtonLabel: string;
		engineMenuTitle: string;
		engineMenuDisabled: boolean;
		onopenenginemenu: () => void;
		notice?: Snippet;
	}

	let {
		cash,
		levelName,
		commissionsCompleted,
		targetCommissions,
		targetCash,
		engineButtonLabel,
		engineMenuTitle,
		engineMenuDisabled,
		onopenenginemenu,
		notice
	}: Props = $props();
</script>

<header class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<button
			type="button"
			class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
			disabled={engineMenuDisabled}
			title={engineMenuTitle}
			aria-label={engineButtonLabel}
			onclick={onopenenginemenu}
		>
			{engineButtonLabel}
		</button>
		<div class="min-w-0 flex-1">
			<HudBar
				{cash}
				{levelName}
				{commissionsCompleted}
				{targetCommissions}
				{targetCash}
				variant="compact"
			/>
		</div>
	</div>
	{#if notice}
		<div class="mt-3">{@render notice()}</div>
	{/if}
</header>
