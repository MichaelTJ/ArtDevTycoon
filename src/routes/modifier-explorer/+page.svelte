<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import {
		AXIS_DEFS,
		BROWSE_PRESETS,
		EMPTY_BROWSE_QUERY,
		EXPLORER_CASE_COUNT,
		EXPLORER_CATEGORY_LABELS,
		applyBrowsePreset,
		collectFacetOptions,
		collectLevelOptions,
		collectMoodOptions,
		computeAllEngineTimingStats,
		existingCaseIds,
		fetchManifest,
		filterTaggedResults,
		formatDuration,
		generationTagKey,
		groupTaggedResults,
		hasAnyGoodTag,
		imageUrlForResult,
		isExplorerStorageAvailable,
		isPromptTagGood,
		listGenerationTags,
		runExplorerBatch,
		setResultGoodTags,
		summarizeGoodPromptTags,
		tagResults,
		toggleAxisLevel,
		toggleGoodTagList,
		goodTagsOf,
		type AxisId,
		type AxisLevel,
		type BrowseGroupBy,
		type BrowseQuery,
		type ExplorerEngineId,
		type ExplorerManifest,
		type ExplorerResult,
		type GenerationTag,
		type RunProgress
	} from '$lib/modifier-explorer';

	const ENGINES: { id: ExplorerEngineId; label: string }[] = [
		{ id: 'janus-webgpu', label: 'Janus Pro 1B (384×384)' },
		{ id: 'sdturbo-webgpu', label: 'SD-Turbo HD (512×512)' }
	];

	const AXES: AxisId[] = ['style', 'subject', 'lighting', 'detail'];

	const GROUP_OPTIONS: { id: BrowseGroupBy; label: string }[] = [
		{ id: 'none', label: 'Flat grid' },
		{ id: 'style-level', label: 'Rows by style level' },
		{ id: 'subject-level', label: 'Rows by subject level' },
		{ id: 'lighting-level', label: 'Rows by lighting level' },
		{ id: 'detail-level', label: 'Rows by detail level' },
		{ id: 'style', label: 'Rows by style' },
		{ id: 'subject', label: 'Rows by subject' },
		{ id: 'lighting', label: 'Rows by lighting' },
		{ id: 'detail', label: 'Rows by detail' },
		{ id: 'mood', label: 'Rows by mood' }
	];

	let manifest = $state<ExplorerManifest>({ version: 1, results: [] });
	let loadError = $state<string | null>(null);
	let browse = $state<BrowseQuery>({
		...EMPTY_BROWSE_QUERY,
		keys: { style: [], subject: [], lighting: [], detail: [] },
		levels: { style: [], subject: [], lighting: [], detail: [] }
	});
	let groupBy = $state<BrowseGroupBy>('none');
	let activePresetId = $state<string | null>(null);
	let selectedResult = $state<ExplorerResult | null>(null);
	let goodMenuOpen = $state(false);
	let skipExisting = $state(true);
	let runProgress = $state<RunProgress>({
		status: 'idle',
		engineId: null,
		current: 0,
		total: 0,
		currentCaseId: null,
		message: 'Ready.',
		error: null,
		lastGenerationMs: null,
		averageGenerationMs: null,
		elapsedMs: 0
	});

	let abortController: AbortController | null = null;
	const isRunning = $derived(
		runProgress.status === 'loading-engine' || runProgress.status === 'running'
	);

	const taggedResults = $derived(tagResults(manifest.results));
	const filteredTagged = $derived(filterTaggedResults(taggedResults, browse, hasAnyGoodTag));
	const browseGroups = $derived(groupTaggedResults(filteredTagged, groupBy));
	const filteredCount = $derived(filteredTagged.length);

	const keyFacets = $derived.by(() => {
		const map: Record<AxisId, ReturnType<typeof collectFacetOptions>> = {
			style: collectFacetOptions(taggedResults, 'style'),
			subject: collectFacetOptions(taggedResults, 'subject'),
			lighting: collectFacetOptions(taggedResults, 'lighting'),
			detail: collectFacetOptions(taggedResults, 'detail')
		};
		return map;
	});
	const levelFacets = $derived.by(() => {
		const map: Record<AxisId, ReturnType<typeof collectLevelOptions>> = {
			style: collectLevelOptions(taggedResults, 'style'),
			subject: collectLevelOptions(taggedResults, 'subject'),
			lighting: collectLevelOptions(taggedResults, 'lighting'),
			detail: collectLevelOptions(taggedResults, 'detail')
		};
		return map;
	});
	const moodFacets = $derived(collectMoodOptions(taggedResults));

	const goodCount = $derived(manifest.results.filter((result) => hasAnyGoodTag(result)).length);
	const goodTagSummary = $derived(summarizeGoodPromptTags(manifest.results));

	const countsByEngine = $derived.by(() => {
		const counts: Record<ExplorerEngineId, number> = {
			'janus-webgpu': 0,
			'sdturbo-webgpu': 0
		};
		for (const result of manifest.results) {
			counts[result.engineId] += 1;
		}
		return counts;
	});

	const timingStats = $derived(computeAllEngineTimingStats(manifest.results));

	function tagsFor(result: ExplorerResult): GenerationTag[] {
		return listGenerationTags(result);
	}

	function patchResult(updated: ExplorerResult): void {
		manifest = {
			...manifest,
			results: manifest.results.map((entry) =>
				entry.engineId === updated.engineId && entry.caseId === updated.caseId ? updated : entry
			)
		};
		if (
			selectedResult?.engineId === updated.engineId &&
			selectedResult.caseId === updated.caseId
		) {
			selectedResult = updated;
		}
	}

	async function refreshManifest(): Promise<void> {
		loadError = null;
		try {
			manifest = await fetchManifest();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Could not load manifest';
		}
	}

	async function startRun(engineId: ExplorerEngineId): Promise<void> {
		if (!isExplorerStorageAvailable()) {
			runProgress = {
				...runProgress,
				status: 'error',
				error: 'Disk storage is only available in dev mode (npm run dev).'
			};
			return;
		}

		abortController = new AbortController();
		try {
			await runExplorerBatch({
				engineId,
				skipExisting,
				existingCaseIds: existingCaseIds(manifest, engineId),
				signal: abortController.signal,
				onProgress: (progress) => {
					runProgress = progress;
				}
			});
			await refreshManifest();
		} catch {
			await refreshManifest();
		} finally {
			abortController = null;
		}
	}

	async function startBoth(): Promise<void> {
		for (const engine of ENGINES) {
			if (abortController?.signal.aborted) break;
			await startRun(engine.id);
		}
	}

	function cancelRun(): void {
		abortController?.abort();
	}

	async function toggleGoodPromptTag(result: ExplorerResult, tag: GenerationTag): Promise<void> {
		if (!isExplorerStorageAvailable()) return;
		try {
			const updated = await setResultGoodTags({
				engineId: result.engineId,
				caseId: result.caseId,
				goodTags: toggleGoodTagList(goodTagsOf(result), generationTagKey(tag))
			});
			patchResult(updated);
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Could not update good tag';
		}
	}

	function engineLabel(engineId: ExplorerEngineId): string {
		return engineId === 'janus-webgpu' ? 'Janus' : 'SD-Turbo';
	}

	function selectPreset(presetId: string): void {
		const preset = BROWSE_PRESETS.find((entry) => entry.id === presetId);
		if (!preset) return;
		activePresetId = preset.id;
		browse = applyBrowsePreset(browse, preset);
		groupBy = preset.groupBy;
	}

	function clearBrowse(): void {
		activePresetId = null;
		browse = {
			...EMPTY_BROWSE_QUERY,
			keys: { style: [], subject: [], lighting: [], detail: [] },
			levels: { style: [], subject: [], lighting: [], detail: [] },
			engine: browse.engine,
			pickFilter: browse.pickFilter
		};
		groupBy = 'none';
	}

	function toggleAxisKey(axis: AxisId, id: string): void {
		activePresetId = null;
		const current = browse.keys[axis];
		const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
		browse = { ...browse, keys: { ...browse.keys, [axis]: next } };
	}

	function toggleLevel(axis: AxisId, level: AxisLevel): void {
		activePresetId = null;
		browse = toggleAxisLevel(browse, axis, level);
	}

	function toggleMood(id: string): void {
		activePresetId = null;
		const next = browse.moods.includes(id)
			? browse.moods.filter((value) => value !== id)
			: [...browse.moods, id];
		browse = { ...browse, moods: next };
	}

	onMount(() => {
		void refreshManifest();
	});
</script>

<svelte:head>
	<title>Modifier Explorer — Art Dev Tycoon</title>
</svelte:head>

{#snippet generationTags(result: ExplorerResult)}
	{@const chips = tagsFor(result)}
	{#if chips.length > 0}
		<div class="explorer__gentags" role="group" aria-label="Prompt tags — click to mark good">
			{#each chips as tag (`${tag.kind}:${tag.id}`)}
				<button
					type="button"
					class="explorer__gentag explorer__gentag--{tag.kind}"
					class:explorer__gentag--good={isPromptTagGood(result, tag)}
					title={isPromptTagGood(result, tag)
						? `Marked good: ${tag.label}`
						: `Mark good: ${tag.label}`}
					aria-pressed={isPromptTagGood(result, tag)}
					onclick={() => toggleGoodPromptTag(result, tag)}
				>
					{tag.label}
				</button>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet resultCard(result: ExplorerResult)}
	<article class="explorer__card" class:explorer__card--good={hasAnyGoodTag(result)}>
		<button type="button" class="explorer__card-open" onclick={() => (selectedResult = result)}>
			<img
				src={imageUrlForResult(result)}
				alt="{result.modifier} — {result.subject}"
				loading="lazy"
				width="256"
				height="256"
			/>
			<div class="explorer__card-body">
				<p class="explorer__card-engine">{engineLabel(result.engineId)}</p>
				<p class="explorer__card-modifier">{result.modifier}</p>
				<p class="explorer__card-prompt">{result.prompt}</p>
				<p class="explorer__card-category">{result.categoryLabel}</p>
				<p class="explorer__card-timing">
					{formatDuration(result.generationMs)} gen
					{#if result.saveMs}
						· {formatDuration(result.saveMs)} save
					{/if}
				</p>
			</div>
		</button>
		{@render generationTags(result)}
	</article>
{/snippet}

<main class="explorer">
	<header class="explorer__header">
		<div>
			<p class="explorer__eyebrow">Dev tool · separate from the game</p>
			<h1>Modifier Explorer</h1>
			<p class="explorer__lede">
				Batch-generate ~{EXPLORER_CASE_COUNT} curated prompts per engine, following the formula
				<em>style → subject → lighting → detail → mood</em>. Each of the first four axes runs
				novice → expert (1→5), so you can compare "beginner through to expert" on exactly one
				dimension at a time. Images save to <code>data/modifier-explorer/</code> on disk during
				<code>npm run dev</code>.
			</p>
		</div>
		<a class="explorer__back" href={resolve('/')}>← Back to game</a>
	</header>

	{#if !isExplorerStorageAvailable()}
		<p class="explorer__banner explorer__banner--warn">
			Production builds cannot persist to disk. Run <code>npm run dev</code> and open
			<code>/modifier-explorer</code>.
		</p>
	{/if}

	<section class="explorer__controls" aria-label="Generation controls">
		<div class="explorer__control-group">
			<label class="explorer__checkbox">
				<input type="checkbox" bind:checked={skipExisting} disabled={isRunning} />
				Skip cases already on disk
			</label>
		</div>

		<div class="explorer__buttons">
			{#each ENGINES as engine (engine.id)}
				<button
					type="button"
					class="explorer__btn"
					disabled={isRunning}
					onclick={() => startRun(engine.id)}
				>
					Run {engine.label}
				</button>
			{/each}
			<button
				type="button"
				class="explorer__btn explorer__btn--primary"
				disabled={isRunning}
				onclick={startBoth}
			>
				Run both engines
			</button>
			{#if isRunning}
				<button type="button" class="explorer__btn explorer__btn--danger" onclick={cancelRun}>
					Cancel
				</button>
			{/if}
		</div>

		<div class="explorer__status" aria-live="polite">
			<p>{runProgress.message}</p>
			{#if runProgress.total > 0 && isRunning}
				<progress max={runProgress.total} value={runProgress.current}></progress>
				<p class="explorer__status-detail">
					{runProgress.current}/{runProgress.total}
					{#if runProgress.currentCaseId}
						· {runProgress.currentCaseId}
					{/if}
					{#if runProgress.lastGenerationMs !== null}
						· last {formatDuration(runProgress.lastGenerationMs)}
					{/if}
					{#if runProgress.averageGenerationMs !== null}
						· avg {formatDuration(runProgress.averageGenerationMs)}
					{/if}
					· elapsed {formatDuration(runProgress.elapsedMs)}
				</p>
			{/if}
			{#if runProgress.error}
				<p class="explorer__error">{runProgress.error}</p>
			{/if}
		</div>

		<div class="explorer__stats">
			<span>Janus: {countsByEngine['janus-webgpu']}/{EXPLORER_CASE_COUNT}</span>
			<span>SD-Turbo: {countsByEngine['sdturbo-webgpu']}/{EXPLORER_CASE_COUNT}</span>
			<button type="button" class="explorer__btn explorer__btn--ghost" onclick={refreshManifest}>
				Refresh gallery
			</button>
		</div>

		{#if timingStats.length > 0}
			<div class="explorer__timing" aria-label="Generation timing summary">
				{#each timingStats as stats (stats.engineId)}
					<div class="explorer__timing-card">
						<h3>{stats.engineId === 'janus-webgpu' ? 'Janus' : 'SD-Turbo'} timing</h3>
						<dl>
							<div>
								<dt>Avg generation</dt>
								<dd>{formatDuration(stats.averageGenerationMs)}</dd>
							</div>
							<div>
								<dt>Min / max</dt>
								<dd>
									{formatDuration(stats.minGenerationMs)} / {formatDuration(stats.maxGenerationMs)}
								</dd>
							</div>
							<div>
								<dt>Avg save</dt>
								<dd>{formatDuration(stats.averageSaveMs)}</dd>
							</div>
							<div>
								<dt>Total recorded</dt>
								<dd>
									{formatDuration(stats.totalGenerationMs)} gen · {formatDuration(
										stats.totalWallMs
									)} wall
								</dd>
							</div>
						</dl>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section class="explorer__browse" aria-label="Browse gallery">
		<div class="explorer__browse-head">
			<div>
				<h2>Browse outputs</h2>
				<p class="explorer__browse-lede">
					Each image shows the prompt tags used to generate it. Click a tag to mark that facet as
					<strong>good</strong>. Use presets and facet chips below to filter the gallery.
				</p>
			</div>
			<div class="explorer__browse-actions">
				<details class="explorer__tags-menu" bind:open={goodMenuOpen}>
					<summary>
						Good tags
						{#if goodCount > 0}
							<span class="explorer__tags-menu-count">{goodCount}</span>
						{/if}
					</summary>
					<div class="explorer__tags-menu-body">
						<p class="explorer__tags-menu-lede">
							Prompt tags you’ve marked good, counted across the gallery.
						</p>
						{#if goodTagSummary.length === 0}
							<p class="explorer__tags-menu-empty">
								Nothing marked yet — click a prompt tag under an image.
							</p>
						{:else}
							<ul class="explorer__tags-summary">
								{#each goodTagSummary as row (`${row.kind}:${row.id}`)}
									<li>
										<div class="explorer__tags-summary-btn">
											<strong>{row.label}</strong>
											<span class="explorer__tags-summary-count">{row.count}</span>
										</div>
										<p class="explorer__tags-summary-hints">{row.kind}</p>
									</li>
								{/each}
							</ul>
						{/if}
						<div class="explorer__tags-menu-footer">
							<button
								type="button"
								class="explorer__btn explorer__btn--ghost"
								onclick={() => {
									browse = { ...browse, pickFilter: 'picked' };
									goodMenuOpen = false;
								}}
							>
								Show images with good tags
							</button>
						</div>
					</div>
				</details>
				<button type="button" class="explorer__btn explorer__btn--ghost" onclick={clearBrowse}>
					Clear filters
				</button>
			</div>
		</div>

		<div class="explorer__presets" aria-label="Compare presets">
			{#each BROWSE_PRESETS as preset (preset.id)}
				<button
					type="button"
					class="explorer__preset"
					class:explorer__preset--active={activePresetId === preset.id}
					title={preset.description}
					onclick={() => selectPreset(preset.id)}
				>
					{preset.label}
				</button>
			{/each}
		</div>

		<div class="explorer__browse-controls">
			<label class="explorer__search">
				Search prompt / subject
				<input
					type="search"
					placeholder="e.g. charcoal, fox, cross-hatching…"
					bind:value={browse.text}
					oninput={() => (activePresetId = null)}
				/>
			</label>

			<label>
				Engine
				<select bind:value={browse.engine}>
					<option value="all">All engines</option>
					{#each ENGINES as engine (engine.id)}
						<option value={engine.id}>{engine.label}</option>
					{/each}
				</select>
			</label>

			<label>
				Category
				<select
					bind:value={browse.category}
					onchange={() => (activePresetId = null)}
				>
					<option value="all">All categories</option>
					{#each Object.entries(EXPLORER_CATEGORY_LABELS) as [key, label] (key)}
						<option value={key}>{label}</option>
					{/each}
				</select>
			</label>

			<label>
				Good tags
				<select bind:value={browse.pickFilter}>
					<option value="all">All images</option>
					<option value="picked">Has good tags ({goodCount})</option>
					<option value="unpicked">No good tags</option>
				</select>
			</label>

			<label>
				Layout
				<select bind:value={groupBy}>
					{#each GROUP_OPTIONS as option (option.id)}
						<option value={option.id}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>

		{#each AXES as axis (axis)}
			{@const def = AXIS_DEFS.find((entry) => entry.id === axis)}
			{@const levels = levelFacets[axis]}
			{@const keys = keyFacets[axis]}
			{#if levels.length > 0}
				<div class="explorer__facets" aria-label="{def?.label} level">
					<p class="explorer__facet-label">{def?.label} — level (beginner → expert)</p>
					<div class="explorer__facet-chips">
						{#each levels as facet (facet.id)}
							<button
								type="button"
								class="explorer__chip"
								class:explorer__chip--active={browse.levels[axis].includes(
									Number(facet.id) as AxisLevel
								)}
								onclick={() => toggleLevel(axis, Number(facet.id) as AxisLevel)}
							>
								{facet.label}
								<span>{facet.count}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
			{#if keys.length > 0}
				<div class="explorer__facets" aria-label="{def?.label} options">
					<p class="explorer__facet-label">{def?.label} — exact option</p>
					<div class="explorer__facet-chips">
						{#each keys as facet (facet.id)}
							<button
								type="button"
								class="explorer__chip"
								class:explorer__chip--active={browse.keys[axis].includes(facet.id)}
								onclick={() => toggleAxisKey(axis, facet.id)}
							>
								{facet.label}
								<span>{facet.count}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/each}

		{#if moodFacets.length > 0}
			<div class="explorer__facets" aria-label="Mood facets">
				<p class="explorer__facet-label">Mood</p>
				<div class="explorer__facet-chips">
					{#each moodFacets as facet (facet.id)}
						<button
							type="button"
							class="explorer__chip"
							class:explorer__chip--active={browse.moods.includes(facet.id)}
							onclick={() => toggleMood(facet.id)}
						>
							{facet.label}
							<span>{facet.count}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<p class="explorer__filter-count">
			{filteredCount} images shown · {goodCount} with good tags · layout: {GROUP_OPTIONS.find(
				(option) => option.id === groupBy
			)?.label}
		</p>
	</section>

	{#if loadError}
		<p class="explorer__error">{loadError}</p>
	{/if}

	<section class="explorer__results" aria-label="Generated images">
		{#if filteredCount === 0}
			<p class="explorer__empty">
				{#if manifest.results.length === 0}
					No images yet. Start a batch run above — each engine generates ~{EXPLORER_CASE_COUNT} samples
					sweeping style, subject, lighting, and detail from novice to expert, plus full-mix
					combinations with technical camera cues.
				{:else}
					No images match these filters. Try a preset, clear filters, or search a different keyword.
				{/if}
			</p>
		{:else if groupBy === 'none'}
			<div class="explorer__gallery">
				{#each browseGroups[0]?.results ?? [] as result (result.engineId + result.caseId)}
					{@render resultCard(result)}
				{/each}
			</div>
		{:else}
			<div class="explorer__lanes">
				{#each browseGroups as group (group.id)}
					<section class="explorer__lane" aria-label={group.label}>
						<header class="explorer__lane-head">
							<h3>{group.label}</h3>
							<span>{group.results.length}</span>
						</header>
						<div class="explorer__lane-track">
							{#each group.results as result (result.engineId + result.caseId)}
								<div class="explorer__lane-card">
									{@render resultCard(result)}
								</div>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/if}
	</section>
</main>

{#if selectedResult}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="explorer__modal-backdrop" onclick={() => (selectedResult = null)}>
		<dialog class="explorer__modal" open onclick={(event) => event.stopPropagation()}>
			<button
				type="button"
				class="explorer__modal-close"
				aria-label="Close"
				onclick={() => (selectedResult = null)}
			>
				×
			</button>
			<img
				src={imageUrlForResult(selectedResult)}
				alt="{selectedResult.modifier} — {selectedResult.subject}"
			/>
			<div class="explorer__modal-meta">
				<p class="explorer__modal-hint explorer__modal-hint--tags">
					Click a prompt tag below to mark that part of the generation as good.
				</p>
				{@render generationTags(selectedResult)}
				<p class="explorer__modal-eyebrow">{selectedResult.categoryLabel}</p>
				<h2>{selectedResult.modifier}</h2>
				<p class="explorer__modal-hint">
					<strong>Modifier</strong> is the style/composition keyword being tested.
					<strong>Subject</strong> is the scene object. The prompt combines both.
				</p>
				<p><strong>Engine:</strong> {engineLabel(selectedResult.engineId)}</p>
				<p><strong>Subject:</strong> {selectedResult.subject}</p>
				<p class="explorer__modal-prompt">
					<strong>Full prompt</strong>
					<span>{selectedResult.prompt}</span>
				</p>
				<p><strong>Generation:</strong> {formatDuration(selectedResult.generationMs)}</p>
				<p><strong>Save to disk:</strong> {formatDuration(selectedResult.saveMs ?? 0)}</p>
				<p>
					<strong>Total wall time:</strong>
					{formatDuration(selectedResult.totalMs ?? selectedResult.generationMs)}
				</p>
				{#if selectedResult.seed !== undefined}
					<p><strong>Seed:</strong> {selectedResult.seed}</p>
				{/if}
				<p><strong>Saved:</strong> {selectedResult.generatedAt}</p>
			</div>
		</dialog>
	</div>
{/if}

<style>
	.explorer {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.explorer__header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.explorer__eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgb(120 113 108);
	}

	.explorer__header h1 {
		margin: 0 0 0.5rem;
		font-size: 1.75rem;
	}

	.explorer__lede {
		margin: 0;
		max-width: 52rem;
		color: rgb(87 83 78);
		line-height: 1.5;
	}

	.explorer__back {
		color: rgb(41 37 36);
		text-decoration: none;
		font-weight: 600;
		white-space: nowrap;
	}

	.explorer__back:hover {
		text-decoration: underline;
	}

	.explorer__banner {
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.explorer__banner--warn {
		background: rgb(254 243 199);
		border: 1px solid rgb(251 191 36);
		color: rgb(146 64 14);
	}

	.explorer__controls,
	.explorer__browse {
		background: white;
		border: 1px solid rgb(231 229 228);
		border-radius: 0.75rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.explorer__control-group {
		margin-bottom: 0.75rem;
	}

	.explorer__checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.explorer__buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.explorer__btn {
		border: 1px solid rgb(214 211 209);
		background: rgb(250 250 249);
		border-radius: 0.5rem;
		padding: 0.5rem 0.875rem;
		cursor: pointer;
		font: inherit;
	}

	.explorer__btn:hover:not(:disabled) {
		background: rgb(245 245 244);
	}

	.explorer__btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.explorer__btn--primary {
		background: rgb(41 37 36);
		color: white;
		border-color: rgb(41 37 36);
	}

	.explorer__btn--primary:hover:not(:disabled) {
		background: rgb(28 25 23);
	}

	.explorer__btn--danger {
		background: rgb(254 226 226);
		border-color: rgb(252 165 165);
		color: rgb(153 27 27);
	}

	.explorer__btn--ghost {
		background: transparent;
	}

	.explorer__modal-eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgb(120 113 108);
	}

	.explorer__modal-hint {
		margin: 0 0 0.75rem;
		padding: 0.625rem 0.75rem;
		font-size: 0.8125rem;
		line-height: 1.45;
		color: rgb(87 83 78);
		background: rgb(250 250 249);
		border-radius: 0.375rem;
	}

	.explorer__status {
		margin-bottom: 0.75rem;
	}

	.explorer__status p {
		margin: 0 0 0.25rem;
	}

	.explorer__status progress {
		width: 100%;
		height: 0.5rem;
	}

	.explorer__status-detail {
		font-size: 0.875rem;
		color: rgb(120 113 108);
	}

	.explorer__stats {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		font-size: 0.875rem;
		color: rgb(87 83 78);
	}

	.explorer__timing {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.explorer__timing-card {
		border: 1px solid rgb(231 229 228);
		border-radius: 0.5rem;
		padding: 0.75rem;
		background: rgb(250 250 249);
	}

	.explorer__timing-card h3 {
		margin: 0 0 0.5rem;
		font-size: 0.875rem;
	}

	.explorer__timing-card dl {
		margin: 0;
		display: grid;
		gap: 0.375rem;
	}

	.explorer__timing-card dl div {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.8125rem;
	}

	.explorer__timing-card dt {
		color: rgb(120 113 108);
	}

	.explorer__timing-card dd {
		margin: 0;
		font-weight: 600;
		text-align: right;
	}

	.explorer__browse-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.explorer__browse-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: flex-start;
		justify-content: flex-end;
	}

	.explorer__tags-menu {
		position: relative;
		min-width: 11rem;
	}

	.explorer__tags-menu > summary {
		list-style: none;
		cursor: pointer;
		border: 1px solid rgb(214 211 209);
		background: rgb(250 250 249);
		border-radius: 0.5rem;
		padding: 0.5rem 0.875rem;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.explorer__tags-menu > summary::-webkit-details-marker {
		display: none;
	}

	.explorer__tags-menu-count {
		font-size: 0.75rem;
		font-weight: 700;
		background: rgb(41 37 36);
		color: white;
		border-radius: 999px;
		padding: 0.1rem 0.45rem;
		font-variant-numeric: tabular-nums;
	}

	.explorer__tags-menu-body {
		position: absolute;
		right: 0;
		top: calc(100% + 0.35rem);
		z-index: 20;
		width: min(22rem, 85vw);
		background: white;
		border: 1px solid rgb(231 229 228);
		border-radius: 0.75rem;
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.12);
		padding: 0.875rem;
	}

	.explorer__tags-menu-lede,
	.explorer__tags-menu-empty {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		color: rgb(87 83 78);
		line-height: 1.4;
	}

	.explorer__tags-summary {
		margin: 0 0 0.75rem;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.5rem;
	}

	.explorer__tags-summary-btn {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		border: 1px solid rgb(231 229 228);
		background: rgb(250 250 249);
		border-radius: 0.5rem;
		padding: 0.5rem 0.625rem;
		font: inherit;
		text-align: left;
	}

	.explorer__tags-summary-count {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.explorer__tags-summary-hints {
		margin: 0.25rem 0 0;
		padding: 0 0.25rem;
		font-size: 0.75rem;
		color: rgb(120 113 108);
		line-height: 1.35;
	}

	.explorer__tags-menu-footer {
		border-top: 1px solid rgb(231 229 228);
		padding-top: 0.75rem;
		display: grid;
		gap: 0.75rem;
	}

	.explorer__browse-head h2 {
		margin: 0 0 0.25rem;
		font-size: 1.125rem;
	}

	.explorer__browse-lede {
		margin: 0;
		font-size: 0.875rem;
		color: rgb(87 83 78);
		max-width: 44rem;
		line-height: 1.45;
	}

	.explorer__presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.explorer__preset {
		border: 1px solid rgb(214 211 209);
		background: rgb(250 250 249);
		border-radius: 999px;
		padding: 0.375rem 0.75rem;
		font: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.explorer__preset:hover {
		background: rgb(245 245 244);
	}

	.explorer__preset--active {
		background: rgb(41 37 36);
		border-color: rgb(41 37 36);
		color: white;
	}

	.explorer__browse-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		align-items: end;
		margin-bottom: 0.75rem;
	}

	.explorer__browse-controls label,
	.explorer__search {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.explorer__browse-controls select,
	.explorer__search input {
		font: inherit;
		font-weight: 400;
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid rgb(214 211 209);
		min-width: 11rem;
	}

	.explorer__search {
		flex: 1 1 16rem;
	}

	.explorer__search input {
		min-width: 0;
		width: 100%;
	}

	.explorer__facets {
		margin-bottom: 0.625rem;
	}

	.explorer__facet-label {
		margin: 0 0 0.375rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgb(120 113 108);
	}

	.explorer__facet-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.explorer__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		border: 1px solid rgb(214 211 209);
		background: white;
		border-radius: 999px;
		padding: 0.25rem 0.625rem;
		font: inherit;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.explorer__chip span {
		color: rgb(120 113 108);
		font-variant-numeric: tabular-nums;
	}

	.explorer__chip--active {
		background: rgb(254 243 199);
		border-color: rgb(251 191 36);
	}

	.explorer__chip--active span {
		color: rgb(146 64 14);
	}

	.explorer__filter-count {
		margin: 0.5rem 0 0;
		font-size: 0.875rem;
		color: rgb(120 113 108);
	}

	.explorer__results {
		margin-bottom: 2rem;
	}

	.explorer__lanes {
		display: grid;
		gap: 1.25rem;
	}

	.explorer__lane {
		background: white;
		border: 1px solid rgb(231 229 228);
		border-radius: 0.75rem;
		padding: 0.75rem;
	}

	.explorer__lane-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.625rem;
		padding: 0 0.25rem;
	}

	.explorer__lane-head h3 {
		margin: 0;
		font-size: 1rem;
	}

	.explorer__lane-head span {
		font-size: 0.8125rem;
		color: rgb(120 113 108);
		font-variant-numeric: tabular-nums;
	}

	.explorer__lane-track {
		display: flex;
		gap: 0.75rem;
		overflow-x: auto;
		padding-bottom: 0.35rem;
		scroll-snap-type: x proximity;
	}

	.explorer__lane-card {
		flex: 0 0 220px;
		scroll-snap-align: start;
	}

	.explorer__lane-card .explorer__card {
		height: 100%;
	}

	.explorer__gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}

	.explorer__card {
		position: relative;
		display: flex;
		flex-direction: column;
		border: 1px solid rgb(231 229 228);
		border-radius: 0.75rem;
		overflow: hidden;
		background: white;
	}

	.explorer__card--good {
		border-color: rgb(21 128 61);
	}

	.explorer__gentags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0.5rem 0.625rem 0.625rem;
		border-top: 1px solid rgb(245 245 244);
		background: rgb(250 250 249);
	}

	.explorer__gentag {
		border: 1px solid rgb(214 211 209);
		background: white;
		border-radius: 0.375rem;
		padding: 0.2rem 0.45rem;
		font: inherit;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: rgb(87 83 78);
		cursor: pointer;
		line-height: 1.2;
	}

	.explorer__gentag:hover {
		border-color: rgb(21 128 61);
		color: rgb(21 128 61);
	}

	.explorer__gentag--good {
		background: rgb(21 128 61);
		border-color: rgb(21 128 61);
		color: white;
	}

	.explorer__gentag--good:hover {
		background: rgb(22 101 52);
		border-color: rgb(22 101 52);
		color: white;
	}

	.explorer__modal-meta .explorer__gentags {
		margin: 0 0 0.75rem;
		border: 1px solid rgb(231 229 228);
		border-radius: 0.5rem;
	}

	.explorer__modal-hint--tags {
		margin-bottom: 0.5rem;
	}

	.explorer__card-open {
		display: flex;
		flex-direction: column;
		text-align: left;
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		font: inherit;
		color: inherit;
	}

	.explorer__card-open:hover {
		background: rgb(250 250 249);
	}

	.explorer__card:has(.explorer__card-open:hover) {
		border-color: rgb(168 162 158);
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.06);
	}

	.explorer__card--good:has(.explorer__card-open:hover) {
		border-color: rgb(21 128 61);
	}

	.explorer__card img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		background: rgb(245 245 244);
	}

	.explorer__card-body {
		padding: 0.75rem;
	}

	.explorer__card-engine {
		margin: 0 0 0.25rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgb(120 113 108);
	}

	.explorer__card-modifier {
		margin: 0 0 0.25rem;
		font-weight: 600;
		font-size: 0.9375rem;
		line-height: 1.3;
	}

	.explorer__card-prompt {
		margin: 0 0 0.375rem;
		font-size: 0.8125rem;
		line-height: 1.4;
		color: rgb(68 64 60);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.explorer__card-category {
		margin: 0 0 0.25rem;
		font-size: 0.8125rem;
		color: rgb(120 113 108);
	}

	.explorer__card-timing {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: rgb(87 83 78);
	}

	.explorer__empty {
		grid-column: 1 / -1;
		padding: 2rem;
		text-align: center;
		color: rgb(120 113 108);
		background: white;
		border: 1px dashed rgb(214 211 209);
		border-radius: 0.75rem;
	}

	.explorer__error {
		color: rgb(185 28 28);
		margin: 0.5rem 0;
	}

	.explorer__modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 50;
	}

	.explorer__modal {
		position: relative;
		margin: 0;
		border: none;
		border-radius: 0.75rem;
		padding: 0;
		max-width: min(960px, 100%);
		max-height: 90vh;
		overflow: auto;
		background: white;
	}

	.explorer__modal img {
		display: block;
		width: 100%;
		max-height: 60vh;
		object-fit: contain;
		background: rgb(245 245 244);
	}

	.explorer__modal-meta {
		padding: 1rem 1.25rem 1.25rem;
	}

	.explorer__modal-meta h2 {
		margin: 0 0 0.75rem;
		font-size: 1.25rem;
	}

	.explorer__modal-meta p {
		margin: 0 0 0.375rem;
		font-size: 0.9375rem;
		line-height: 1.45;
	}

	.explorer__modal-prompt {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.75rem;
		background: rgb(250 250 249);
		border: 1px solid rgb(231 229 228);
		border-radius: 0.5rem;
	}

	.explorer__modal-prompt span {
		font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.explorer__modal-close {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.55);
		color: white;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		z-index: 1;
	}
</style>
