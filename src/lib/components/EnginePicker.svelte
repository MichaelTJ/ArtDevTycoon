<script lang="ts">
	import type { EngineOption } from '$lib/types/contracts';

	interface Props {
		options: EngineOption[];
		activeId: string;
		onselect: (id: string) => void;
	}

	let { options, activeId, onselect }: Props = $props();

	function formatDownloadGb(mb: number): string {
		return (mb / 1000).toFixed(1);
	}
</script>

<fieldset class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
	<legend class="px-1 text-base font-semibold text-stone-800">Art engine</legend>

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
				</span>
			</label>
		{/each}
	</div>
</fieldset>
