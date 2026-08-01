<script lang="ts">
	interface ArtistOption {
		catalogId: string;
		name: string;
		portrait: string;
		level: number;
	}

	interface Props {
		artists: ArtistOption[];
		clientName: string;
		assignmentFill: number | null;
		onassign: (catalogId: string) => void;
		onclose: () => void;
	}

	let { artists, clientName, assignmentFill, onassign, onclose }: Props = $props();

	const busy = $derived(assignmentFill != null);
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Assign artist"
>
	<div class="w-full max-w-md rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">Assign to artist</h2>
				<p class="mt-1 text-sm text-stone-500">
					Hand {clientName}'s brief to someone on your roster — or keep painting yourself.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close assign artist"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		{#if busy && assignmentFill != null}
			<p class="mt-4 text-sm text-stone-600" role="status">
				Artist working… {Math.round(assignmentFill * 100)}%
			</p>
			<div
				class="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"
				role="progressbar"
				aria-valuenow={Math.round(assignmentFill * 100)}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label="Artist work progress"
			>
				<div class="h-full bg-amber-600" style:width="{assignmentFill * 100}%"></div>
			</div>
		{:else if artists.length === 0}
			<p class="mt-4 text-sm text-stone-600">Hire an artist from the Team panel first.</p>
		{:else}
			<ul class="mt-4 space-y-2" aria-label="Artists available to assign">
				{#each artists as artist (artist.catalogId)}
					<li>
						<button
							type="button"
							class="flex min-h-11 w-full items-center gap-3 rounded-lg border border-stone-200 px-3 py-2 text-left hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
							aria-label="Assign to {artist.name}, level {artist.level}"
							onclick={() => onassign(artist.catalogId)}
						>
							<span class="text-xl" aria-hidden="true">{artist.portrait}</span>
							<span>
								<span class="font-medium text-stone-800">{artist.name}</span>
								<span class="block text-xs text-stone-500">Level {artist.level}</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
