<script lang="ts">
	import { canUnlockMediumTier, getMediumTier, MEDIUM_TIERS } from '$lib/data/mediumTiers';
	import type { MediumSkillProgress } from '$lib/game';
	import ProgressMeter from './ProgressMeter.svelte';
	import SketchCanvas from './SketchCanvas.svelte';

	interface Props {
		mediumTierId: string;
		unlockedMediumTierIds: string[];
		cash: number;
		reputation: number;
		skill: MediumSkillProgress;
		onselectmedium: (id: string) => void;
		onpracticetick: (deltaMs: number) => void;
		ondone: () => void;
		rankUpLabel?: string | null;
	}

	let {
		mediumTierId,
		unlockedMediumTierIds,
		cash,
		reputation,
		skill,
		onselectmedium,
		onpracticetick,
		ondone,
		rankUpLabel = null
	}: Props = $props();

	let canvasUnavailable = $state(false);

	const mediumName = $derived(getMediumTier(skill.mediumId).name);
	const skillLine = $derived(
		skill.xpForNext === 0
			? `${mediumName} · ${skill.rankLabel} · Max level`
			: `${mediumName} · ${skill.rankLabel} · ${skill.xpIntoLevel}/${skill.xpForNext} XP`
	);

	function isMediumUnlocked(id: string): boolean {
		return unlockedMediumTierIds.includes(id);
	}

	function mediumLockReason(tier: (typeof MEDIUM_TIERS)[number]): string | null {
		if (isMediumUnlocked(tier.id)) {
			return null;
		}
		if (cash < tier.unlockCost) {
			return `Need $${tier.unlockCost - cash} more`;
		}
		if (reputation < tier.requiredReputation) {
			return `Need ${tier.requiredReputation - reputation} more reputation`;
		}
		if (!canUnlockMediumTier(tier, { cash, reputation })) {
			return 'Locked in Toolkit';
		}
		return `Unlock for $${tier.unlockCost}`;
	}

	function attachPracticeHost(el: HTMLElement) {
		const canvas = el.querySelector('canvas');
		canvasUnavailable = canvas instanceof HTMLCanvasElement && canvas.getContext('2d') === null;
	}
</script>

<div
	class="flex flex-col gap-3"
	role="region"
	aria-label="Practice desk"
	{@attach attachPracticeHost}
>
	<h2 class="text-lg font-semibold text-stone-800">Practice</h2>
	<p class="text-sm text-stone-700">{skillLine}</p>
	<ProgressMeter
		label={skill.rankLabel}
		value={skill.xpForNext === 0 ? 1 : skill.xpIntoLevel}
		max={skill.xpForNext === 0 ? 0 : skill.xpForNext}
		hint={skill.xpForNext === 0 ? 'Max level' : `${skill.xpIntoLevel}/${skill.xpForNext} XP`}
	/>

	{#if rankUpLabel}
		<p class="text-sm font-medium text-amber-900" aria-live="polite">Rank up — {rankUpLabel}</p>
	{/if}

	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Painting medium">
		<span class="text-sm font-medium text-stone-700">Medium</span>
		{#each MEDIUM_TIERS as tier (tier.id)}
			{@const unlocked = isMediumUnlocked(tier.id)}
			{@const active = tier.id === mediumTierId}
			{@const lockReason = mediumLockReason(tier)}
			<button
				type="button"
				class="min-h-10 min-w-10 rounded-lg border px-2 text-lg {active
					? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500'
					: unlocked
						? 'border-stone-300 bg-white hover:bg-stone-50'
						: 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-60'}"
				aria-label="{tier.name}{lockReason ? ` — ${lockReason}` : ''}"
				aria-pressed={active}
				disabled={!unlocked}
				title={lockReason ?? tier.name}
				onclick={() => onselectmedium(tier.id)}
			>
				<span aria-hidden="true">{tier.icon}</span>
			</button>
		{/each}
	</div>

	{#if canvasUnavailable}
		<p class="text-sm text-stone-700" role="alert">Canvas unavailable</p>
	{/if}

	<SketchCanvas {mediumTierId} {onpracticetick} ariaLabel="Practice canvas" />

	<p class="text-sm text-stone-600">Draw to train this medium. No client, no payout.</p>

	<button
		type="button"
		class="min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
		aria-label="Finish practising"
		onclick={ondone}
	>
		Done
	</button>
</div>
