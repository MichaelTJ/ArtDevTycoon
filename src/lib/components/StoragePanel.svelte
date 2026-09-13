<script lang="ts">
	import type { GalleryEntry } from '$lib/types/contracts';
	import {
		canListPracticeForSale,
		clampAskingPrice,
		practiceFairValue,
		type PracticeArtwork
	} from '$lib/game';

	interface Props {
		storageName: string;
		tagline: string;
		practiceStored: PracticeArtwork[];
		practiceHung: PracticeArtwork[];
		archivedCommissions: GalleryEntry[];
		venueId: string;
		reputation: number;
		onhangpractice: (id: string, askingPrice: number) => void;
		ontakepractice: (id: string) => void;
		onclose: () => void;
	}

	let {
		storageName,
		tagline,
		practiceStored,
		practiceHung,
		archivedCommissions,
		venueId,
		reputation,
		onhangpractice,
		ontakepractice,
		onclose
	}: Props = $props();

	let pricingId = $state<string | null>(null);
	let askingInput = $state(1);

	const empty = $derived(
		practiceStored.length === 0 && practiceHung.length === 0 && archivedCommissions.length === 0
	);

	function recommendedFor(piece: PracticeArtwork): number {
		return practiceFairValue({
			mediumTierId: piece.mediumTierId,
			strokeMs: piece.strokeMs,
			coverage01: piece.coverage01,
			skillLevel: piece.skillLevel,
			venueId,
			reputation
		});
	}

	function openPrice(piece: PracticeArtwork): void {
		if (!canListPracticeForSale(piece)) return;
		pricingId = piece.id;
		askingInput = recommendedFor(piece);
	}

	function confirmHang(piece: PracticeArtwork): void {
		onhangpractice(piece.id, clampAskingPrice(askingInput));
		pricingId = null;
	}
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label={storageName}
>
	<div
		class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">{storageName}</h2>
				<p class="mt-1 text-sm text-stone-500">{tagline}</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close storage"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		{#if empty}
			<p class="mt-4 text-sm text-stone-600">Nothing stored yet.</p>
		{:else}
			<section class="mt-4" aria-label="On the wall">
				<h3 class="text-sm font-semibold text-stone-800">On the wall</h3>
				{#if practiceHung.length === 0}
					<p class="mt-1 text-sm text-stone-500">Nothing hanging.</p>
				{:else}
					<ul class="mt-2 space-y-2">
						{#each practiceHung as piece (piece.id)}
							<li class="flex items-center gap-3 rounded-lg border border-stone-200 p-2">
								<img src={piece.imageUrl} alt="" class="h-12 w-12 rounded object-cover" />
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium text-stone-800">{piece.title}</p>
									<p class="text-xs text-stone-500">Listed at ${piece.askingPrice ?? 0}</p>
								</div>
								<button
									type="button"
									class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 hover:bg-stone-50"
									aria-label="Take down {piece.title}"
									onclick={() => ontakepractice(piece.id)}
								>
									Take down
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="mt-4" aria-label="In storage">
				<h3 class="text-sm font-semibold text-stone-800">In storage</h3>
				{#if practiceStored.length === 0}
					<p class="mt-1 text-sm text-stone-500">Nothing stored.</p>
				{:else}
					<ul class="mt-2 space-y-2">
						{#each practiceStored as piece (piece.id)}
							{@const listable = canListPracticeForSale(piece)}
							{@const rec = recommendedFor(piece)}
							<li class="rounded-lg border border-stone-200 p-2">
								<div class="flex items-center gap-3">
									<img src={piece.imageUrl} alt="" class="h-12 w-12 rounded object-cover" />
									<p class="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">
										{piece.title}
									</p>
									<button
										type="button"
										class="min-h-11 rounded-lg bg-amber-600 px-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
										disabled={!listable}
										title={!listable
											? 'Too little paint for a sale — draw more, or put it in storage.'
											: undefined}
										onclick={() => openPrice(piece)}
									>
										Hang
									</button>
								</div>
								{#if !listable}
									<p class="mt-1 text-xs text-stone-500">
										Too little paint for a sale — draw more, or put it in storage.
									</p>
								{/if}
								{#if pricingId === piece.id}
									<div class="mt-2" role="group" aria-label="Set asking price">
										<p class="text-sm font-semibold text-stone-800">Recommended price: ${rec}</p>
										<input
											type="number"
											min="1"
											max="9999"
											aria-label="Asking price"
											bind:value={askingInput}
										/>
										<p class="mt-1 text-xs text-stone-500">
											Recommended ${rec}. Visitors walk away if you ask much more.
										</p>
										<button
											type="button"
											class="mt-2 min-h-11 rounded-lg bg-amber-600 px-3 text-sm font-semibold text-white"
											onclick={() => confirmHang(piece)}
										>
											Hang in gallery
										</button>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="mt-4" aria-label="Off the wall">
				<h3 class="text-sm font-semibold text-stone-800">Off the wall</h3>
				{#if archivedCommissions.length === 0}
					<p class="mt-1 text-sm text-stone-500">No archived commissions.</p>
				{:else}
					<ul class="mt-2 space-y-2">
						{#each archivedCommissions as entry (entry.id)}
							<li class="rounded-lg border border-stone-200 p-2">
								<p class="text-sm font-medium text-stone-800">{entry.title}</p>
								<p class="text-xs text-stone-500">
									Commission archive — returns when there is space.
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</div>
</div>
