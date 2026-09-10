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
		/** Fill the paint dialog. Leave false in unconstrained tests. */
		fill?: boolean;
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
		rankUpLabel = null,
		fill = false
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
	class={['desk', fill && 'desk-fill']}
	role="region"
	aria-label="Practice desk"
	{@attach attachPracticeHost}
>
	<SketchCanvas
		heading="Practice"
		{mediumTierId}
		{onpracticetick}
		ariaLabel="Practice canvas"
		{fill}
	>
		{#snippet extraTools()}
			<div class="flex flex-col items-center gap-2" role="group" aria-label="Painting medium">
				<span class="text-sm font-medium text-stone-700">Medium</span>
				<div class="flex flex-wrap justify-center gap-2">
					{#each MEDIUM_TIERS as tier (tier.id)}
						{@const unlocked = isMediumUnlocked(tier.id)}
						{@const active = tier.id === mediumTierId}
						{@const lockReason = mediumLockReason(tier)}
						<button
							type="button"
							class="min-h-9 min-w-9 rounded-lg border px-2 text-lg {active
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
			</div>
		{/snippet}
	</SketchCanvas>

	{#if canvasUnavailable}
		<p class="text-sm text-stone-700" role="alert">Canvas unavailable</p>
	{/if}

	<div class="footer">
		<div class="progress">
			<p class="text-sm text-stone-700">{skillLine}</p>
			<ProgressMeter
				label="Medium progress"
				variant="compact"
				value={skill.xpForNext === 0 ? 1 : skill.xpIntoLevel}
				max={skill.xpForNext === 0 ? 0 : skill.xpForNext}
				hint={skill.xpForNext === 0 ? 'Max level' : `${skill.xpIntoLevel}/${skill.xpForNext} XP`}
			/>
			{#if rankUpLabel}
				<p class="text-sm font-medium text-amber-900" aria-live="polite">Rank up — {rankUpLabel}</p>
			{/if}
		</div>
		<button type="button" class="done" aria-label="Finish practising" onclick={ondone}>
			Done
		</button>
	</div>
</div>

<style>
	.desk {
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 0.75rem;
	}

	.desk-fill {
		flex: 1 1 0;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}

	.footer {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 1rem;
		border-top: 1px solid #e7e5e4;
		padding-top: 0.75rem;
	}

	.progress {
		flex: 1 1 auto;
		min-width: 0;
	}

	.done {
		flex: 0 0 auto;
		min-height: 2.75rem;
		border-radius: 0.5rem;
		background: #d97706;
		padding: 0.5rem 1.5rem;
		font-weight: 600;
		color: #fff;
	}

	.done:hover {
		background: #b45309;
	}

	.done:focus-visible {
		outline: 2px solid #d97706;
		outline-offset: 2px;
	}
</style>
