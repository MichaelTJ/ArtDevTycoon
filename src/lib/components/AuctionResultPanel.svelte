<script lang="ts">
	interface Props {
		bidderCount: number;
		bids: number[];
		winningBid: number;
		oncollect: () => void;
	}

	let { bidderCount, bids, winningBid, oncollect }: Props = $props();

	const titleId = 'auction-result-title';
	let collectButton: HTMLButtonElement | undefined = $state();

	$effect(() => {
		collectButton?.focus();
	});
</script>

<section class="rounded-xl border border-rose-200 bg-white p-5 shadow-sm" aria-labelledby={titleId}>
	<h2 id={titleId} class="text-xl font-bold text-stone-800">The gavel comes down</h2>
	<p class="mt-1 text-sm text-stone-600">
		{bidderCount} bidder{bidderCount === 1 ? '' : 's'} entered the room. Here is how the paddles fell:
	</p>

	<ul class="mt-4 space-y-2" aria-label="Auction bids">
		{#each bids as bid, index (index)}
			<li
				class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm {bid ===
				winningBid
					? 'border-rose-400 bg-rose-50 font-semibold text-rose-900'
					: 'border-stone-200 text-stone-700'}"
			>
				<span>Bidder {index + 1}</span>
				<span>${bid}{bid === winningBid ? ' — winning bid' : ''}</span>
			</li>
		{/each}
	</ul>

	<p class="mt-4 text-3xl font-bold text-emerald-700">+${winningBid}</p>

	<button
		type="button"
		bind:this={collectButton}
		class="mt-4 min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
		onclick={oncollect}
	>
		Collect Cash
	</button>
</section>
