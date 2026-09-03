<script lang="ts">
	import { getMediumTier } from '$lib/data/mediumTiers';
	import {
		SKILL_DEFS,
		type MediumSkillProgress,
		type NextUnlock,
		type SkillProgress
	} from '$lib/game';
	import ProgressMeter from './ProgressMeter.svelte';

	interface Props {
		cash: number;
		reputation: number;
		commissions: NextUnlock;
		cashMeter: NextUnlock;
		reputationMeter: NextUnlock;
		skills: SkillProgress[];
		/** One row per unlocked medium in MEDIUM_TIERS order. Rank names only — never suffixes. */
		mediumSkills: MediumSkillProgress[];
		onclose: () => void;
	}

	let {
		cash,
		reputation,
		commissions,
		cashMeter,
		reputationMeter,
		skills,
		mediumSkills,
		onclose
	}: Props = $props();

	function skillHint(skill: SkillProgress): string {
		const tagline = SKILL_DEFS.find((def) => def.id === skill.id)?.tagline ?? '';
		if (skill.xpForNext === 0) {
			return tagline
				? `${tagline} · Lv ${skill.level} · Max level`
				: `Lv ${skill.level} · Max level`;
		}
		const xpLine = `Lv ${skill.level} · ${skill.xpIntoLevel}/${skill.xpForNext} XP`;
		return tagline ? `${tagline} · ${xpLine}` : xpLine;
	}

	function mediumHint(row: MediumSkillProgress): string {
		const name = getMediumTier(row.mediumId).name;
		if (row.xpForNext === 0) {
			return `${name} · ${row.rankLabel} · Max rank`;
		}
		return `${name} · ${row.rankLabel} · ${row.xpIntoLevel}/${row.xpForNext} XP`;
	}

	function mediumLabel(row: MediumSkillProgress): string {
		const name = getMediumTier(row.mediumId).name;
		return `${name} · ${row.rankLabel}`;
	}
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Progress"
>
	<div
		class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<h2 class="text-xl font-bold text-stone-800">Progress</h2>
				<p class="mt-1 text-sm text-stone-500">
					Cash ${cash} · Reputation {reputation}
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close progress"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		<section class="mt-5 space-y-3" aria-label="Career">
			<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Career</h3>
			<ProgressMeter
				label={commissions.label}
				value={commissions.current}
				max={commissions.target}
				hint={commissions.remainingLabel}
			/>
			<ProgressMeter
				label={cashMeter.label}
				value={cashMeter.current}
				max={cashMeter.target}
				hint={cashMeter.remainingLabel}
			/>
		</section>

		<section class="mt-6 space-y-3" aria-label="Standing">
			<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Standing</h3>
			<ProgressMeter
				label="Reputation"
				value={reputationMeter.current}
				max={reputationMeter.target}
				hint="{reputationMeter.label} · {reputationMeter.remainingLabel}"
			/>
		</section>

		<section class="mt-6 space-y-3" aria-label="Craft skills">
			<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Craft skills</h3>
			{#each skills as skill (skill.id)}
				<ProgressMeter
					label={skill.label}
					value={skill.xpForNext === 0 ? 1 : skill.xpIntoLevel}
					max={skill.xpForNext === 0 ? 0 : skill.xpForNext}
					hint={skillHint(skill)}
				/>
			{/each}
		</section>

		{#if mediumSkills.length > 0}
			<section class="mt-6 space-y-3" aria-label="Medium skills">
				<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Medium skills</h3>
				{#each mediumSkills as row (row.mediumId)}
					<ProgressMeter
						label={mediumLabel(row)}
						value={row.xpForNext === 0 ? 1 : row.xpIntoLevel}
						max={row.xpForNext === 0 ? 0 : row.xpForNext}
						hint={mediumHint(row)}
					/>
				{/each}
			</section>
		{/if}
	</div>
</div>
