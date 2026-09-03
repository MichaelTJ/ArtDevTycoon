<script lang="ts">
	import {
		ARTIST_CATALOG,
		canHireArtist,
		getArtistCatalogEntry,
		type ArtistCatalogEntry
	} from '$lib/data/artists';
	import { MEDIUM_TIERS } from '$lib/data/mediumTiers';
	import { artistLevel, artistLevelFill, xpToNextLevel } from '$lib/game/artistTraining';
	import { mediumSkillProgress, mediumSkillXpOf } from '$lib/game';

	interface HiredArtistRow {
		catalogId: string;
		xp: number;
		mediumSkillXp: Record<string, number>;
	}

	interface Props {
		hired: HiredArtistRow[];
		cash: number;
		reputation: number;
		onhire: (catalogId: string) => void;
		onfire: (catalogId: string) => void;
		onclose: () => void;
	}

	let { hired, cash, reputation, onhire, onfire, onclose }: Props = $props();

	const hiredIds = $derived(hired.map((a) => a.catalogId));

	function entryFor(id: string): ArtistCatalogEntry | undefined {
		return getArtistCatalogEntry(id);
	}

	function hireDisabledReason(entry: ArtistCatalogEntry): string | null {
		if (cash < entry.hireCost) return `Need $${entry.hireCost - cash} more`;
		if (reputation < entry.requiredReputation) {
			return `Need ${entry.requiredReputation - reputation} more reputation`;
		}
		return null;
	}
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Artist team"
>
	<div
		class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">Artist team</h2>
				<p class="mt-1 text-sm text-stone-500">
					Named painters you train and assign — separate from idle staff roles.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close artist team"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		{#if hired.length > 0}
			<h3 class="mt-4 text-sm font-semibold text-stone-700">Your roster</h3>
			<ul class="mt-2 space-y-3" aria-label="Hired artists">
				{#each hired as row (row.catalogId)}
					{@const entry = entryFor(row.catalogId)}
					{@const level = artistLevel(row.xp)}
					{@const fill = artistLevelFill(row.xp)}
					{@const toNext = xpToNextLevel(row.xp)}
					<li class="rounded-lg border border-amber-500 bg-amber-50 p-3">
						<div class="flex gap-3">
							<span class="text-2xl" aria-hidden="true">{entry?.portrait ?? '🎨'}</span>
							<div class="min-w-0 flex-1">
								<div class="font-medium text-stone-800">{entry?.name ?? row.catalogId}</div>
								<p class="text-xs text-stone-600">
									Level {level}
									{#if toNext > 0}
										· {toNext} XP to next
									{/if}
								</p>
								<div
									class="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"
									role="progressbar"
									aria-valuenow={Math.round(fill * 100)}
									aria-valuemin={0}
									aria-valuemax={100}
									aria-label="Training progress for {entry?.name ?? row.catalogId}"
								>
									<div class="h-full bg-amber-600" style:width="{fill * 100}%"></div>
								</div>
								<ul
									class="mt-2 space-y-0.5"
									aria-label="Medium ranks for {entry?.name ?? row.catalogId}"
								>
									{#each MEDIUM_TIERS as tier (tier.id)}
										{@const rank = mediumSkillProgress(
											tier.id,
											mediumSkillXpOf(row.mediumSkillXp, tier.id)
										)}
										<li class="text-xs text-stone-600">
											{tier.icon}
											{tier.name.split(' ')[0]} · {rank.rankLabel}
										</li>
									{/each}
								</ul>
								{#if entry?.specialisms.length}
									<p class="mt-1 text-xs text-stone-500">{entry.specialisms.join(' · ')}</p>
								{/if}
								<button
									type="button"
									class="mt-2 min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
									aria-label="Release {entry?.name ?? row.catalogId}"
									onclick={() => onfire(row.catalogId)}
								>
									Release
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<h3 class="mt-4 text-sm font-semibold text-stone-700">Available to hire</h3>
		<ul class="mt-2 space-y-3" aria-label="Artist catalog">
			{#each ARTIST_CATALOG as entry (entry.id)}
				{@const isHired = hiredIds.includes(entry.id)}
				{@const canHire =
					!isHired && canHireArtist(entry, { cash, reputation, hiredCatalogIds: hiredIds })}
				{@const disabledReason = isHired ? null : hireDisabledReason(entry)}
				<li class="rounded-lg border border-stone-200 p-3 {isHired ? 'opacity-60' : ''}">
					<div class="flex gap-3">
						<span class="text-2xl" aria-hidden="true">{entry.portrait}</span>
						<div class="min-w-0 flex-1">
							<span class="font-medium text-stone-800">{entry.name}</span>
							<p class="mt-1 text-sm text-stone-500">{entry.tagline}</p>
							<p class="mt-1 text-xs text-stone-600">
								Hire ${entry.hireCost} · {entry.requiredReputation} reputation
							</p>
							{#if !isHired}
								<button
									type="button"
									class="mt-3 min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={!canHire}
									aria-label="Hire {entry.name}"
									title={disabledReason ?? undefined}
									onclick={() => {
										if (canHire) onhire(entry.id);
									}}
								>
									{#if canHire}
										Hire
									{:else}
										{disabledReason}
									{/if}
								</button>
							{:else}
								<p class="mt-2 text-xs font-semibold text-amber-800 uppercase">On roster</p>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</div>
