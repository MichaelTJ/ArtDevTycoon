<script lang="ts">
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import type { NextUnlock } from '$lib/game';
	import ProgressMeter from './ProgressMeter.svelte';

	interface SkillSummary {
		id: string;
		label: string;
		level: number;
		fill: number;
		delta?: number;
	}

	interface Props {
		cash: number;
		levelName: string;
		commissionsCompleted: number;
		targetCommissions: number;
		targetCash: number;
		reputation: number;
		reputationMeter: NextUnlock;
		skillSummaries?: SkillSummary[];
		/** Pulse craft meters while generating / critiquing. */
		skillsEmphasize?: boolean;
		variant?: 'default' | 'compact';
	}

	let {
		cash,
		levelName,
		commissionsCompleted,
		targetCommissions,
		targetCash,
		reputation,
		reputationMeter,
		skillSummaries,
		skillsEmphasize = false,
		variant = 'default'
	}: Props = $props();

	const displayCash = Tween.of(() => cash, {
		duration: prefersReducedMotion.current ? 0 : 600,
		easing: cubicOut
	});

	const meterVariant = $derived(variant === 'compact' ? 'compact' : 'default');
</script>

{#if variant === 'compact'}
	<div class="flex min-w-0 flex-col gap-2">
		<div class="flex min-w-0 items-baseline justify-between gap-3">
			<h1 class="min-w-0 truncate text-base font-bold text-stone-800 sm:text-lg" title={levelName}>
				{levelName}
			</h1>
			<p
				class="shrink-0 text-lg font-semibold text-emerald-700 sm:text-xl"
				aria-label="Current cash"
			>
				${Math.round(displayCash.current)}
			</p>
		</div>
		<div class="grid grid-cols-1 gap-2 min-[520px]:grid-cols-3">
			<ProgressMeter
				label="Commissions"
				value={commissionsCompleted}
				max={targetCommissions}
				hint="{commissionsCompleted}/{targetCommissions}"
				variant={meterVariant}
			/>
			<ProgressMeter
				label="Cash goal"
				value={cash}
				max={targetCash}
				hint="${cash}/${targetCash}"
				variant={meterVariant}
			/>
			<ProgressMeter
				label={reputationMeter.label}
				value={reputationMeter.current}
				max={reputationMeter.target}
				hint={reputationMeter.remainingLabel}
				variant={meterVariant}
			/>
		</div>
		{#if skillSummaries && skillSummaries.length > 0}
			<div class="grid grid-cols-1 gap-2 min-[520px]:grid-cols-3" aria-label="Craft skills">
				{#each skillSummaries as skill (skill.id)}
					<ProgressMeter
						label={skill.label}
						value={Math.round(skill.fill * 100)}
						max={100}
						hint="Lv {skill.level}"
						delta={skill.delta ?? 0}
						emphasize={skillsEmphasize || (skill.delta ?? 0) > 0}
						variant="compact"
					/>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<header
		class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm sm:p-5"
		aria-label="Game status"
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<h1 class="text-lg font-bold text-stone-800">{levelName}</h1>
			<p class="text-xl font-semibold text-emerald-700" aria-label="Current cash">
				${Math.round(displayCash.current)}
			</p>
			<p class="text-sm text-stone-500" aria-label="Current reputation">
				Reputation {reputation}
			</p>
		</div>

		<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
			<ProgressMeter
				label="Commissions"
				value={commissionsCompleted}
				max={targetCommissions}
				hint="{commissionsCompleted} / {targetCommissions} commissions"
			/>
			<ProgressMeter
				label="Cash goal"
				value={cash}
				max={targetCash}
				hint="${cash} / ${targetCash} toward goal"
			/>
			<ProgressMeter
				label={reputationMeter.label}
				value={reputationMeter.current}
				max={reputationMeter.target}
				hint={reputationMeter.remainingLabel}
			/>
		</div>

		{#if skillSummaries && skillSummaries.length > 0}
			<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Craft skills">
				{#each skillSummaries as skill (skill.id)}
					<ProgressMeter
						label={skill.label}
						value={Math.round(skill.fill * 100)}
						max={100}
						hint="Lv {skill.level}"
						delta={skill.delta ?? 0}
						emphasize={skillsEmphasize || (skill.delta ?? 0) > 0}
						variant="compact"
					/>
				{/each}
			</div>
		{/if}
	</header>
{/if}
