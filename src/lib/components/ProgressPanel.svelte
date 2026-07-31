<script lang="ts">
	import type { NextUnlock, SkillProgress } from '$lib/game';
	import ProgressMeter from './ProgressMeter.svelte';

	interface Props {
		cash: number;
		reputation: number;
		commissions: NextUnlock;
		cashMeter: NextUnlock;
		reputationMeter: NextUnlock;
		skills: SkillProgress[];
		onclose: () => void;
	}

	let { cash, reputation, commissions, cashMeter, reputationMeter, skills, onclose }: Props =
		$props();

	function skillHint(skill: SkillProgress): string {
		if (skill.xpForNext === 0) return `Lv ${skill.level} · Max level`;
		return `Lv ${skill.level} · ${skill.xpIntoLevel}/${skill.xpForNext} XP`;
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
			<div>
				<h2 class="text-xl font-bold text-stone-800">Progress</h2>
				<p class="mt-1 text-sm text-stone-500">
					Cash ${cash} · Reputation {reputation}
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
			<p class="text-sm text-stone-700">Reputation: {reputation}</p>
			<ProgressMeter
				label={reputationMeter.label}
				value={reputationMeter.current}
				max={reputationMeter.target}
				hint={reputationMeter.remainingLabel}
			/>
		</section>

		<section class="mt-6 space-y-3" aria-label="Craft skills">
			<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Craft skills</h3>
			{#each skills as skill (skill.id)}
				<ProgressMeter
					label={skill.label}
					value={skill.xpIntoLevel}
					max={skill.xpForNext === 0 ? 1 : skill.xpForNext}
					hint={skillHint(skill)}
				/>
			{/each}
		</section>
	</div>
</div>
