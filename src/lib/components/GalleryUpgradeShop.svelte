<script lang="ts">
	import type { AtmosphereItem } from '$lib/data/galleryAtmosphere';
	import type { GalleryLayout } from '$lib/data/galleryLayouts';
	import type { GalleryVenue } from '$lib/data/galleryVenues';

	type ShopTab = 'venue' | 'layout' | 'atmosphere';

	interface Props {
		venues: readonly GalleryVenue[];
		layouts: readonly GalleryLayout[];
		atmosphereItems: readonly AtmosphereItem[];
		unlockedVenueId: string;
		unlockedLayoutIds: string[];
		activeLayoutId: string;
		ownedAtmosphereIds: string[];
		cash: number;
		reputation: number;
		onunlockvenue: (id: string) => void;
		onunlocklayout: (id: string) => void;
		onselectlayout: (id: string) => void;
		onbuyatmosphere: (id: string) => void;
		onclose: () => void;
	}

	let {
		venues,
		layouts,
		atmosphereItems,
		unlockedVenueId,
		unlockedLayoutIds,
		activeLayoutId,
		ownedAtmosphereIds,
		cash,
		reputation,
		onunlockvenue,
		onunlocklayout,
		onselectlayout,
		onbuyatmosphere,
		onclose
	}: Props = $props();

	let activeTab = $state<ShopTab>('venue');

	const titleId = 'gallery-upgrade-shop-title';

	const unlockedVenueIndex = $derived(venues.findIndex((v) => v.id === unlockedVenueId));

	function venueStatus(index: number): 'owned' | 'next' | 'locked' {
		if (index <= unlockedVenueIndex) return 'owned';
		if (index === unlockedVenueIndex + 1) return 'next';
		return 'locked';
	}

	function layoutOwned(id: string): boolean {
		return unlockedLayoutIds.includes(id);
	}

	function atmosphereOwned(id: string): boolean {
		return ownedAtmosphereIds.includes(id);
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby={titleId}
>
	<div
		class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-stone-300 bg-white shadow-lg"
	>
		<div class="flex items-start justify-between gap-3 border-b border-stone-200 p-5">
			<div>
				<h2 id={titleId} class="text-xl font-bold text-stone-800">Gallery Upgrades</h2>
				<p class="mt-1 text-sm text-stone-500">
					Expand the wall, refine the hang, and stack atmosphere bonuses.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		<div
			class="border-b border-stone-200 px-5"
			role="tablist"
			aria-label="Gallery upgrade categories"
		>
			{#each [{ id: 'venue' as const, label: 'Venue' }, { id: 'layout' as const, label: 'Layout' }, { id: 'atmosphere' as const, label: 'Atmosphere' }] as tab (tab.id)}
				<button
					type="button"
					role="tab"
					id="gallery-tab-{tab.id}"
					aria-selected={activeTab === tab.id}
					aria-controls="gallery-panel-{tab.id}"
					tabindex={activeTab === tab.id ? 0 : -1}
					class="min-h-11 border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 {activeTab ===
					tab.id
						? 'border-amber-600 text-amber-800'
						: 'border-transparent text-stone-600 hover:text-stone-800'}"
					onclick={() => {
						activeTab = tab.id;
					}}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="overflow-y-auto p-5">
			{#if activeTab === 'venue'}
				<div
					id="gallery-panel-venue"
					role="tabpanel"
					aria-labelledby="gallery-tab-venue"
					class="space-y-3"
				>
					{#each venues as venue, index (venue.id)}
						{@const status = venueStatus(index)}
						<article class="rounded-lg border border-stone-200 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="font-medium text-stone-800">
										<span aria-hidden="true">{venue.icon}</span>
										{venue.name}
									</p>
									<p class="mt-1 text-sm text-stone-500">{venue.tagline}</p>
									<p class="mt-1 text-sm text-stone-600">
										Capacity {venue.capacity}
										{#if venue.unlockCost > 0}
											· ${venue.unlockCost} · rep {venue.requiredReputation}+
										{/if}
									</p>
								</div>
								{#if status === 'owned'}
									<span class="rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
										Owned
									</span>
								{:else if status === 'next'}
									{@const canBuy =
										cash >= venue.unlockCost && reputation >= venue.requiredReputation}
									<button
										type="button"
										class="min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
										disabled={!canBuy}
										onclick={() => onunlockvenue(venue.id)}
									>
										{#if canBuy}
											Unlock
										{:else if cash < venue.unlockCost}
											Need ${venue.unlockCost - cash} more
										{:else}
											Need {venue.requiredReputation - reputation} more reputation
										{/if}
									</button>
								{:else}
									<span class="rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-500">
										Locked
									</span>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{:else if activeTab === 'layout'}
				<div
					id="gallery-panel-layout"
					role="tabpanel"
					aria-labelledby="gallery-tab-layout"
					class="space-y-3"
				>
					{#each layouts as layout (layout.id)}
						{@const owned = layoutOwned(layout.id)}
						{@const active = layout.id === activeLayoutId}
						<article
							class="rounded-lg border border-stone-200 p-4 {active
								? 'border-amber-400 bg-amber-50/40'
								: ''}"
						>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="font-medium text-stone-800">
										<span aria-hidden="true">{layout.icon}</span>
										{layout.name}
									</p>
									<p class="mt-1 text-sm text-stone-500">{layout.tagline}</p>
									<p class="mt-1 text-sm text-stone-600">
										×{layout.curationMultiplier.toFixed(2)} payout
										{#if layout.unlockCost > 0}
											· ${layout.unlockCost}
										{/if}
									</p>
								</div>
								{#if active}
									<span class="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
										Active
									</span>
								{:else if owned}
									<button
										type="button"
										class="min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
										onclick={() => onselectlayout(layout.id)}
									>
										Switch to this layout
									</button>
								{:else}
									{@const canBuy = cash >= layout.unlockCost}
									<button
										type="button"
										class="min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
										disabled={!canBuy}
										onclick={() => onunlocklayout(layout.id)}
									>
										{#if canBuy}
											Unlock
										{:else}
											Need ${layout.unlockCost - cash} more
										{/if}
									</button>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{:else}
				<div
					id="gallery-panel-atmosphere"
					role="tabpanel"
					aria-labelledby="gallery-tab-atmosphere"
					class="space-y-3"
				>
					{#each atmosphereItems as item (item.id)}
						{@const owned = atmosphereOwned(item.id)}
						<article class="rounded-lg border border-stone-200 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="font-medium text-stone-800">
										<span aria-hidden="true">{item.icon}</span>
										{item.name}
									</p>
									<p class="mt-1 text-sm text-stone-500">{item.tagline}</p>
									<p class="mt-1 text-sm text-stone-600">
										+{(item.payoutBonus * 100).toFixed(0)}% payout · ${item.cost}
									</p>
								</div>
								{#if owned}
									<span class="rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
										Owned
									</span>
								{:else}
									{@const canBuy = cash >= item.cost}
									<button
										type="button"
										class="min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
										disabled={!canBuy}
										onclick={() => onbuyatmosphere(item.id)}
									>
										{#if canBuy}
											Buy
										{:else}
											Need ${item.cost - cash} more
										{/if}
									</button>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
