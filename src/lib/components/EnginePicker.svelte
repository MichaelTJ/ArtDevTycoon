<script lang="ts">
	import type { EngineOption, LoadProgress } from '$lib/types/contracts';

	interface Props {
		options: EngineOption[];
		activeId: string;
		loading?: boolean;
		loadingLabel?: string;
		loadProgress?: LoadProgress | null;
		onselect: (id: string) => void;
		onconfigure?: (id: string) => void;
	}

	let {
		options,
		activeId,
		loading = false,
		loadingLabel = 'Loading art engines…',
		loadProgress = null,
		onselect,
		onconfigure
	}: Props = $props();

	function formatDownloadGb(mb: number): string {
		return (mb / 1000).toFixed(1);
	}

	const showLoadingPlaceholder = $derived(loading && options.length === 0);
	const progressPercent = $derived(loadProgress ? Math.round(loadProgress.fraction * 100) : null);
	const progressAriaLabel = $derived(
		loadProgress?.status === 'loading' || loadProgress?.status === 'compiling'
			? 'Load progress'
			: 'Download progress'
	);
</script>

<fieldset class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
	<legend class="px-1 text-base font-semibold text-stone-800">Art engine</legend>

	{#if showLoadingPlaceholder}
		<div class="mt-3 space-y-3" role="status" aria-live="polite">
			<p class="text-stone-800">{loadingLabel}</p>
			{#if loadProgress}
				<progress
					class="h-3 w-full accent-amber-600"
					value={loadProgress.fraction}
					max={1}
					aria-label={progressAriaLabel}
				></progress>
				{#if progressPercent !== null}
					<p class="text-sm text-stone-500">{progressPercent}%</p>
				{/if}
				{#if loadProgress.file}
					<p class="text-sm text-stone-500">{loadProgress.file}</p>
				{/if}
			{/if}
		</div>
	{:else}
		<div class="mt-3 space-y-3" role="radiogroup" aria-label="Art engine">
			{#each options as option (option.id)}
				<label
					class="flex cursor-pointer gap-3 rounded-lg border border-stone-200 p-3 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
				>
					<input
						type="radio"
						name="engine"
						value={option.id}
						checked={option.id === activeId}
						disabled={!option.available}
						aria-disabled={!option.available}
						class="mt-1 h-5 w-5 accent-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						onchange={() => {
							if (option.available) onselect(option.id);
						}}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex flex-wrap items-center gap-2">
							<span class="font-medium text-stone-800">{option.displayName}</span>
							{#if option.requiresDownload}
								<span
									class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
								>
									{formatDownloadGb(option.approxDownloadMb)} GB download
								</span>
							{/if}
						</span>
						<span class="mt-1 block text-sm text-stone-500">{option.description}</span>
						{#if !option.available && option.unavailableReason}
							<span class="mt-1 block text-sm text-stone-500">{option.unavailableReason}</span>
						{/if}
						{#if option.id === 'remote' && onconfigure}
							<button
								type="button"
								class="mt-2 min-h-9 rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
								onclick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									onconfigure('remote');
								}}
							>
								{option.available ? 'Change My PC server' : 'Set up My PC'}
							</button>
						{/if}
					</span>
				</label>
			{/each}
		</div>
	{/if}
</fieldset>
