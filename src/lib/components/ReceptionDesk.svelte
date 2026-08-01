<script lang="ts">
	import type { ClientBrief } from '$lib/types/contracts';

	interface Props {
		offers: ClientBrief[];
		onaccept: (brief: ClientBrief) => void;
		onclose: () => void;
	}

	let { offers, onaccept, onclose }: Props = $props();
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Reception desk"
>
	<div
		class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">Reception desk</h2>
				<p class="mt-1 text-sm text-stone-500">
					Pick a commission from the board — the grown-up way to find work.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close reception desk"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		<ul class="mt-4 space-y-3" aria-label="Commission offers">
			{#each offers as brief (brief.id)}
				<li class="rounded-lg border border-stone-200 bg-white p-3">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-medium text-stone-800">{brief.clientName}</span>
						<span class="text-xs font-medium text-stone-500">Budget ${brief.budget}</span>
					</div>
					<p class="mt-1 text-sm text-stone-600">{brief.requestText}</p>
					<button
						type="button"
						class="mt-3 min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						aria-label="Accept commission from {brief.clientName}"
						onclick={() => onaccept(brief)}
					>
						Accept brief
					</button>
				</li>
			{/each}
		</ul>
	</div>
</div>
