<script lang="ts">
	import {
		MAJOR_PROJECTS,
		canAcceptMajorProject,
		type MajorProjectDef
	} from '$lib/data/majorProjects';
	import { getArtistCatalogEntry } from '$lib/data/artists';
	import { payoutReady } from '$lib/game/majorProjectProgress';

	import type { MajorProjectProgress } from '$lib/game/majorProjectProgress';

	interface CrewOption {
		catalogId: string;
		name: string;
	}

	interface ActiveProgress {
		projectId: string;
		beatsCompleted: number;
		crewByBeat: string[];
		activeBeatIndex: number | null;
		beatFill: number | null;
		beatStartedAt: number | null;
		beatDurationMs: number | null;
	}

	interface Props {
		reputation: number;
		active: ActiveProgress | null;
		activeProject: MajorProjectDef | null;
		crewOptions: CrewOption[];
		onaccept: (projectId: string) => void;
		onassigncrew: (beatIndex: number, catalogId: string) => void;
		onstartbeat: (beatIndex: number) => void;
		oncollect: () => void;
		onclose: () => void;
	}

	let {
		reputation,
		active,
		activeProject,
		crewOptions,
		onaccept,
		onassigncrew,
		onstartbeat,
		oncollect,
		onclose
	}: Props = $props();

	const readyForPayout = $derived(
		active && activeProject ? payoutReady(active as MajorProjectProgress, activeProject) : false
	);
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Major projects"
>
	<div
		class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">Major projects</h2>
				<p class="mt-1 text-sm text-stone-500">
					Comics and animated series — crew beats, big payouts.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close major projects"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		{#if active && activeProject}
			<section
				class="mt-4 rounded-lg border border-amber-500 bg-amber-50 p-3"
				aria-label="Active project"
			>
				<h3 class="font-medium text-stone-800">{activeProject.title}</h3>
				<p class="text-sm text-stone-600">
					Beat {active.beatsCompleted} / {activeProject.beatCount} · ${activeProject.basePayout} on complete
				</p>
				{#if active.beatFill != null && active.activeBeatIndex != null}
					<p class="mt-2 text-sm text-stone-600">
						Working {activeProject.beatLabels[active.activeBeatIndex] ?? 'beat'}…
						{Math.round(active.beatFill * 100)}%
					</p>
				{/if}
				<ul class="mt-3 space-y-2" aria-label="Project beats">
					{#each activeProject.beatLabels as label, index (index)}
						{@const crewId = active.crewByBeat[index] ?? ''}
						{@const crew = crewId ? getArtistCatalogEntry(crewId) : null}
						{@const done = index < active.beatsCompleted}
						<li class="rounded border border-stone-200 bg-white p-2 text-sm">
							<div class="font-medium text-stone-800">
								{label}
								{#if done}
									<span class="text-xs text-green-700"> · done</span>
								{/if}
							</div>
							{#if !done && index === active.beatsCompleted && active.activeBeatIndex == null}
								<label class="mt-1 block text-xs text-stone-600">
									Crew
									<select
										class="mt-1 block w-full rounded border border-stone-300 px-2 py-1"
										value={crewId}
										aria-label="Crew for {label}"
										onchange={(e) => {
											const target = e.currentTarget;
											onassigncrew(index, target.value);
										}}
									>
										<option value="">Pick artist…</option>
										{#each crewOptions as opt (opt.catalogId)}
											<option value={opt.catalogId}>{opt.name}</option>
										{/each}
									</select>
								</label>
								<button
									type="button"
									class="mt-2 min-h-11 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
									disabled={!crewId}
									aria-label="Start {label}"
									onclick={() => onstartbeat(index)}
								>
									Start beat
								</button>
							{:else if crew}
								<p class="text-xs text-stone-500">{crew.name}</p>
							{/if}
						</li>
					{/each}
				</ul>
				{#if readyForPayout}
					<button
						type="button"
						class="mt-3 min-h-11 w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
						aria-label="Collect project payout"
						onclick={oncollect}
					>
						Collect ${activeProject.basePayout}
					</button>
				{/if}
			</section>
		{:else}
			<ul class="mt-4 space-y-3" aria-label="Available major projects">
				{#each MAJOR_PROJECTS as project (project.id)}
					{@const canAccept = canAcceptMajorProject(project, { reputation, activeProjectId: null })}
					<li class="rounded-lg border border-stone-200 p-3">
						<div class="font-medium text-stone-800">{project.title}</div>
						<p class="text-sm text-stone-500">{project.tagline}</p>
						<p class="mt-1 text-xs text-stone-600">
							{project.beatCount} beats · ${project.basePayout} · {project.requiredReputation} rep
						</p>
						<button
							type="button"
							class="mt-3 min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
							disabled={!canAccept}
							aria-label="Accept {project.title}"
							onclick={() => onaccept(project.id)}
						>
							{#if canAccept}
								Accept project
							{:else}
								Need {project.requiredReputation} reputation
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
