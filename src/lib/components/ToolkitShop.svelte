<script lang="ts">
	import { canUnlockMediumTier, type MediumTier } from '$lib/data/mediumTiers';

	interface Props {
		tiers: MediumTier[];
		unlockedTierIds: string[];
		activeTierId: string;
		cash: number;
		reputation: number;
		onunlock: (id: string) => void;
		onselect: (id: string) => void;
		onclose: () => void;
	}

	let {
		tiers,
		unlockedTierIds,
		activeTierId,
		cash,
		reputation,
		onunlock,
		onselect,
		onclose
	}: Props = $props();

	function isUnlocked(id: string): boolean {
		return unlockedTierIds.includes(id);
	}

	function unlockDisabledReason(tier: MediumTier): string | null {
		if (cash < tier.unlockCost) {
			return `Need $${tier.unlockCost - cash} more`;
		}
		if (reputation < tier.requiredReputation) {
			return `Need ${tier.requiredReputation - reputation} more reputation`;
		}
		return null;
	}
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Artist's Toolkit"
>
	<div
		class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">Artist's Toolkit</h2>
				<p class="mt-1 text-sm text-stone-500">
					Unlock better mediums permanently. Switch freely among anything you own.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close toolkit"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		<ul class="mt-4 space-y-3" aria-label="Medium tiers">
			{#each tiers as tier (tier.id)}
				{@const unlocked = isUnlocked(tier.id)}
				{@const active = tier.id === activeTierId}
				{@const disabledReason = unlocked ? null : unlockDisabledReason(tier)}
				{@const canUnlock = !unlocked && canUnlockMediumTier(tier, { cash, reputation })}
				<li
					class="rounded-lg border p-3 {active
						? 'border-amber-500 bg-amber-50'
						: 'border-stone-200 bg-white'}"
					aria-current={active ? 'true' : undefined}
				>
					<div class="flex gap-3">
						<span class="text-2xl" aria-hidden="true">{tier.icon}</span>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-medium text-stone-800">{tier.name}</span>
								{#if active}
									<span class="text-xs font-semibold tracking-wide text-amber-800 uppercase"
										>Active</span
									>
								{:else if unlocked}
									<span class="text-xs font-semibold tracking-wide text-stone-500 uppercase"
										>Owned</span
									>
								{/if}
							</div>
							<p class="mt-1 text-sm text-stone-500">{tier.tagline}</p>
							{#if !unlocked}
								<p class="mt-1 text-sm text-stone-600">
									Unlock for ${tier.unlockCost} · {tier.requiredReputation} reputation
								</p>
							{/if}
							{#if active}
								<!-- Active tier: highlighted, no action button -->
							{:else if unlocked}
								<button
									type="button"
									class="mt-3 min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
									aria-label="Switch to {tier.name}"
									onclick={() => onselect(tier.id)}
								>
									Switch to this medium
								</button>
							{:else}
								<button
									type="button"
									class="mt-3 min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
									aria-label="Unlock {tier.name}"
									disabled={!canUnlock}
									aria-disabled={!canUnlock}
									title={disabledReason ?? undefined}
									onclick={() => {
										if (canUnlock) onunlock(tier.id);
									}}
								>
									{#if canUnlock}
										Unlock
									{:else}
										{disabledReason}
									{/if}
								</button>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</div>
