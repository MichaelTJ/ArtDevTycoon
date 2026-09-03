<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import {
		BROWSE_PRESETS,
		EMPTY_BROWSE_QUERY,
		EXPLORER_CASE_COUNT,
		EXPLORER_CATEGORY_LABELS,
		ROUND1_CASE_COUNT,
		ROUND2_CASE_COUNT,
		ROUND3_CASE_COUNT,
		ROUND4_CASE_COUNT,
		ROUND5_CASE_COUNT,
		ROUND6_CASE_COUNT,
		ROUND7_CASE_COUNT,
		WORKING_SUBJECT_KEYS,
		applyBrowsePreset,
		collectRarityOptions,
		collectStyleOptions,
		collectSubjectOptions,
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
		isCustomEngineLoaded,
		listGenerationTags,
		runExplorerBatch,
		runCustomPrompt,
		setResultGoodTags,
		summarizeGoodPromptTags,
		tagResults,
		toggleGoodTagList,
		unloadCustomEngine,
		goodTagsOf,
		wipeExplorerGallery,
		type BrowseGroupBy,
		type BrowseQuery,
		type ExplorerEngineId,
		type ExplorerManifest,
		type ExplorerResult,
		type GenerationTag,
		type ModifierCategory,
		type RunProgress
	} from '$lib/modifier-explorer2';

	const ENGINES: { id: ExplorerEngineId; label: string }[] = [
		{ id: 'janus-webgpu', label: 'Janus Pro 1B' },
		{ id: 'sdturbo-webgpu', label: 'SD-Turbo HD' }
	];

	const GROUP_OPTIONS: { id: BrowseGroupBy; label: string }[] = [
		{ id: 'none', label: 'Flat grid' },
		{ id: 'rarity', label: 'Rows by rarity' },
		{ id: 'subject', label: 'Rows by subject' },
		{ id: 'style', label: 'Rows by style' },
		{ id: 'background', label: 'Rows by background' },
		{ id: 'category', label: 'Rows by category' }
	];

	const AUTORUN_CATEGORIES: Record<string, ModifierCategory[]> = {
		round1: ['round1-objects'],
		round2: ['round2-simple'],
		round3: ['round3-sketch-tiers'],
		round4: ['round4-art-tiers'],
		round5: ['round5-retries'],
		round6: ['round6-backgrounds'],
		round7: ['round7-backgrounds']
	};

	let manifest = $state<ExplorerManifest>({ version: 1, results: [] });
	let loadError = $state<string | null>(null);
	let browse = $state<BrowseQuery>({ ...EMPTY_BROWSE_QUERY });
	let groupBy = $state<BrowseGroupBy>('none');
	let activePresetId = $state<string | null>(null);
	let selectedResult = $state<ExplorerResult | null>(null);
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
	let runCategories = $state<ModifierCategory[] | null>(null);
	let customPrompt = $state('');
	let customEngineId = $state<ExplorerEngineId>('janus-webgpu');
	let warmCustomEngineId = $state<ExplorerEngineId | null>(null);

	const customPromptReady = $derived(customPrompt.trim().length > 0);
	const customModelWarm = $derived(warmCustomEngineId === customEngineId);

	const isRunning = $derived(
		runProgress.status === 'loading-engine' || runProgress.status === 'running'
	);

	const taggedResults = $derived(tagResults(manifest.results));
	const filteredTagged = $derived(filterTaggedResults(taggedResults, browse, hasAnyGoodTag));
	const browseGroups = $derived(groupTaggedResults(filteredTagged, groupBy));
	const filteredCount = $derived(filteredTagged.length);

	const subjectFacets = $derived(collectSubjectOptions(taggedResults));
	const rarityFacets = $derived(collectRarityOptions(taggedResults));
	const styleFacets = $derived(collectStyleOptions(taggedResults));

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
		if (selectedResult?.engineId === updated.engineId && selectedResult.caseId === updated.caseId) {
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

	async function wipeGallery(): Promise<void> {
		if (!isExplorerStorageAvailable()) return;
		if (!window.confirm('Delete all saved explorer2 images and reset the gallery?')) return;
		loadError = null;
		try {
			manifest = await wipeExplorerGallery();
			selectedResult = null;
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Could not wipe gallery';
		}
	}

	async function startRun(
		engineId: ExplorerEngineId,
		categories?: ModifierCategory[]
	): Promise<void> {
		if (!isExplorerStorageAvailable()) {
			runProgress = {
				...runProgress,
				status: 'error',
				error: 'Disk storage is only available in dev mode (npm run dev).'
			};
			return;
		}

		runCategories = categories ?? null;
		abortController = new AbortController();
		warmCustomEngineId = null;
		try {
			await runExplorerBatch({
				engineId,
				skipExisting,
				existingCaseIds: existingCaseIds(manifest, engineId),
				signal: abortController.signal,
				categories,
				onProgress: (progress) => {
					runProgress = progress;
				}
			});
			await refreshManifest();
		} catch {
			await refreshManifest();
		} finally {
			abortController = null;
			runCategories = null;
		}
	}

	function startRound1(): void {
		void startRun('janus-webgpu', ['round1-objects']);
	}

	function startRound2(): void {
		void startRun('janus-webgpu', ['round2-simple']);
	}

	function startRound3(): void {
		void startRun('janus-webgpu', ['round3-sketch-tiers']);
	}

	function startRound4(): void {
		void startRun('janus-webgpu', ['round4-art-tiers']);
	}

	function startRound5(): void {
		void startRun('janus-webgpu', ['round5-retries']);
	}

	function startRound6(): void {
		void startRun('janus-webgpu', ['round6-backgrounds']);
	}

	function startRound7(): void {
		void startRun('janus-webgpu', ['round7-backgrounds']);
	}

	function cancelRun(): void {
		abortController?.abort();
	}

	async function generateCustomPrompt(): Promise<void> {
		if (!isExplorerStorageAvailable() || !customPromptReady) return;

		abortController = new AbortController();
		try {
			const saved = await runCustomPrompt({
				engineId: customEngineId,
				prompt: customPrompt,
				existingCaseIds: existingCaseIds(manifest, customEngineId),
				signal: abortController.signal,
				onProgress: (progress) => {
					runProgress = progress;
				}
			});
			manifest = {
				...manifest,
				results: [...manifest.results, saved]
			};
			selectedResult = saved;
			warmCustomEngineId = isCustomEngineLoaded(customEngineId) ? customEngineId : null;
		} catch {
			await refreshManifest();
		} finally {
			abortController = null;
		}
	}

	async function unloadCustomModel(): Promise<void> {
		await unloadCustomEngine();
		warmCustomEngineId = null;
		if (runProgress.status === 'done' && runProgress.engineId === customEngineId) {
			runProgress = {
				...runProgress,
				message: 'Model unloaded.'
			};
		}
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
			engine: browse.engine,
			pickFilter: browse.pickFilter
		};
		groupBy = 'none';
	}

	function toggleSubject(id: string): void {
		activePresetId = null;
		const next = browse.subjects.includes(id)
			? browse.subjects.filter((value) => value !== id)
			: [...browse.subjects, id];
		browse = { ...browse, subjects: next };
	}

	function toggleRarity(id: string): void {
		activePresetId = null;
		const next = browse.rarities.includes(id)
			? browse.rarities.filter((value) => value !== id)
			: [...browse.rarities, id];
		browse = { ...browse, rarities: next };
	}

	function toggleStyle(id: string): void {
		activePresetId = null;
		const next = browse.styles.includes(id)
			? browse.styles.filter((value) => value !== id)
			: [...browse.styles, id];
		browse = { ...browse, styles: next };
	}

	onMount(() => {
		void (async () => {
			await refreshManifest();
			const autorun = page.url.searchParams.get('autorun');
			const categories = autorun ? AUTORUN_CATEGORIES[autorun] : undefined;
			if (categories && isExplorerStorageAvailable()) {
				void startRun('janus-webgpu', categories);
			}
		})();
		return () => {
			void unloadCustomEngine();
		};
	});
</script>

<svelte:head>
	<title>Modifier Explorer 2 — Art Dev Tycoon</title>
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
			<p class="explorer__eyebrow">Dev tool · fresh prompt series</p>
			<h1>Modifier Explorer 2</h1>
			<p class="explorer__lede">
				Round 1 = {ROUND1_CASE_COUNT} object shots; Round 2 = {ROUND2_CASE_COUNT} style-modifier shots;
				Round 3 = {ROUND3_CASE_COUNT} sketch-tier shots; Round 4 = {ROUND4_CASE_COUNT}
				medium-tier shots; Round 5 = {ROUND5_CASE_COUNT} failed-tier retries; Round 6 =
				{ROUND6_CASE_COUNT} background shots; Round 7 = {ROUND7_CASE_COUNT} background v2 shots;
				total {EXPLORER_CASE_COUNT}. Provisional Round 2 subjects:
				<code>{WORKING_SUBJECT_KEYS.join(', ')}</code>. Images save to
				<code>data/modifier-explorer2/</code> during <code>npm run dev</code>.
			</p>
		</div>
		<div class="explorer__nav">
			<a class="explorer__back" href={resolve('/modifier-explorer')}>← Explorer 1</a>
			<a class="explorer__back" href={resolve('/')}>← Back to game</a>
		</div>
	</header>

	{#if !isExplorerStorageAvailable()}
		<p class="explorer__banner explorer__banner--warn">
			Production builds cannot persist to disk. Run <code>npm run dev</code> and open
			<code>/modifier-explorer2</code>.
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
			<button type="button" class="explorer__btn" disabled={isRunning} onclick={startRound1}>
				Run Round 1 (Janus)
			</button>
			<button type="button" class="explorer__btn" disabled={isRunning} onclick={startRound2}>
				Run Round 2 (Janus)
			</button>
			<button type="button" class="explorer__btn" disabled={isRunning} onclick={startRound3}>
				Run Round 3 (Janus)
			</button>
			<button type="button" class="explorer__btn" disabled={isRunning} onclick={startRound4}>
				Run Round 4 (Janus)
			</button>
			<button type="button" class="explorer__btn" disabled={isRunning} onclick={startRound5}>
				Run Round 5 (Janus)
			</button>
			<button type="button" class="explorer__btn" disabled={isRunning} onclick={startRound6}>
				Run Round 6 (Janus)
			</button>
			<button type="button" class="explorer__btn" disabled={isRunning} onclick={startRound7}>
				Run Round 7 (Janus)
			</button>
			<button
				type="button"
				class="explorer__btn explorer__btn--primary"
				disabled={isRunning}
				onclick={() => startRun('janus-webgpu')}
			>
				Run all (Janus)
			</button>
			<button
				type="button"
				class="explorer__btn"
				disabled={isRunning}
				onclick={() => startRun('sdturbo-webgpu')}
			>
				Run all (SD-Turbo)
			</button>
			{#if isRunning}
				<button type="button" class="explorer__btn explorer__btn--danger" onclick={cancelRun}>
					Cancel
				</button>
			{/if}
		</div>

		<div class="explorer__status" aria-live="polite" data-run-status={runProgress.status}>
			<p>{runProgress.message}</p>
			{#if runCategories}
				<p class="explorer__status-detail">
					Scope: {runCategories.map((c) => EXPLORER_CATEGORY_LABELS[c]).join(', ')}
				</p>
			{/if}
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
			<span>Good tags: {goodCount}</span>
			<button type="button" class="explorer__btn explorer__btn--ghost" onclick={refreshManifest}>
				Refresh gallery
			</button>
			<button
				type="button"
				class="explorer__btn explorer__btn--danger"
				disabled={isRunning}
				onclick={wipeGallery}
			>
				Wipe gallery
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

		{#if goodTagSummary.length > 0}
			<div class="explorer__good-summary" aria-label="Good tag summary">
				{#each goodTagSummary as row (`${row.kind}:${row.id}`)}
					<span class="explorer__good-pill">
						{row.label}
						<strong>{row.count}</strong>
					</span>
				{/each}
			</div>
		{/if}
	</section>

	<section class="explorer__custom" aria-label="Custom prompt">
		<div class="explorer__custom-head">
			<h2>Custom prompt</h2>
			<p>
				Type any prompt and generate a one-off image. Saved to the gallery as <strong>Custom</strong
				>.
			</p>
		</div>
		<label class="explorer__custom-field">
			<span class="explorer__custom-label">Prompt</span>
			<textarea
				class="explorer__custom-input"
				rows="3"
				placeholder="e.g. a red apple on a white background"
				bind:value={customPrompt}
				disabled={isRunning}></textarea>
		</label>
		<div class="explorer__custom-actions">
			<label>
				Engine
				<select bind:value={customEngineId} disabled={isRunning}>
					{#each ENGINES as engine (engine.id)}
						<option value={engine.id}>{engine.label}</option>
					{/each}
				</select>
			</label>
			<button
				type="button"
				class="explorer__btn explorer__btn--primary"
				disabled={isRunning || !customPromptReady}
				onclick={() => generateCustomPrompt()}
			>
				Generate
			</button>
			{#if isRunning}
				<button type="button" class="explorer__btn explorer__btn--danger" onclick={cancelRun}>
					Cancel
				</button>
			{:else if customModelWarm}
				<button
					type="button"
					class="explorer__btn explorer__btn--ghost"
					onclick={() => unloadCustomModel()}
				>
					Unload model
				</button>
			{/if}
		</div>
		{#if customModelWarm}
			<p class="explorer__custom-warm">Model loaded — next generate skips reload.</p>
		{:else if warmCustomEngineId}
			<p class="explorer__custom-warm explorer__custom-warm--switch">
				Different engine loaded — next generate will reload the model.
			</p>
		{/if}
	</section>

	<section class="explorer__browse" aria-label="Browse gallery">
		<div class="explorer__browse-head">
			<div>
				<h2>Browse outputs</h2>
				<p class="explorer__browse-lede">
					Click a generation tag to mark it good. Use presets and facet chips to filter.
				</p>
			</div>
			<button type="button" class="explorer__btn explorer__btn--ghost" onclick={clearBrowse}>
				Clear filters
			</button>
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
					placeholder="e.g. apple, wireframe, common…"
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
				<select bind:value={browse.category} onchange={() => (activePresetId = null)}>
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

		{#if subjectFacets.length > 0}
			<div class="explorer__facets" aria-label="Subject filters">
				<p class="explorer__facet-label">Subject</p>
				<div class="explorer__facet-chips">
					{#each subjectFacets as facet (facet.id)}
						<button
							type="button"
							class="explorer__chip"
							class:explorer__chip--active={browse.subjects.includes(facet.id)}
							onclick={() => toggleSubject(facet.id)}
						>
							{facet.label}
							<span>{facet.count}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if rarityFacets.length > 0}
			<div class="explorer__facets" aria-label="Rarity filters">
				<p class="explorer__facet-label">Rarity</p>
				<div class="explorer__facet-chips">
					{#each rarityFacets as facet (facet.id)}
						<button
							type="button"
							class="explorer__chip"
							class:explorer__chip--active={browse.rarities.includes(facet.id)}
							onclick={() => toggleRarity(facet.id)}
						>
							{facet.label}
							<span>{facet.count}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if styleFacets.length > 0}
			<div class="explorer__facets" aria-label="Style filters">
				<p class="explorer__facet-label">Style</p>
				<div class="explorer__facet-chips">
					{#each styleFacets as facet (facet.id)}
						<button
							type="button"
							class="explorer__chip"
							class:explorer__chip--active={browse.styles.includes(facet.id)}
							onclick={() => toggleStyle(facet.id)}
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
					No images yet. Run Round 1 or Round 2 above — Round 1 finds objects the engine knows;
					Round 2 tests simple style words on working subjects.
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
		color: rgb(28 25 23);
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

	.explorer__nav {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.35rem;
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
	.explorer__custom,
	.explorer__browse {
		background: rgb(250 250 249);
		border: 1px solid rgb(214 211 209);
		border-radius: 0.75rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.explorer__custom-head h2 {
		margin: 0 0 0.35rem;
		font-size: 1.05rem;
	}

	.explorer__custom-head p {
		margin: 0 0 0.75rem;
		color: rgb(87 83 78);
		font-size: 0.9rem;
	}

	.explorer__custom-field {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
	}

	.explorer__custom-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: rgb(68 64 60);
	}

	.explorer__custom-input,
	.explorer__custom-actions select {
		width: 100%;
		border: 1px solid rgb(214 211 209);
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		font: inherit;
		background: white;
	}

	.explorer__custom-input {
		resize: vertical;
		min-height: 4.5rem;
	}

	.explorer__custom-input:disabled,
	.explorer__custom-actions select:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.explorer__custom-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.75rem;
	}

	.explorer__custom-actions label {
		display: grid;
		gap: 0.25rem;
		font-size: 0.85rem;
		min-width: 12rem;
	}

	.explorer__custom-warm {
		margin: 0.65rem 0 0;
		font-size: 0.85rem;
		color: rgb(22 101 52);
	}

	.explorer__custom-warm--switch {
		color: rgb(146 64 14);
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
		background: white;
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
		background: rgb(245 245 244);
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
		background: white;
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

	.explorer__good-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.75rem;
	}

	.explorer__good-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid rgb(187 247 208);
		background: rgb(220 252 231);
		border-radius: 999px;
		padding: 0.2rem 0.55rem;
		font-size: 0.75rem;
		color: rgb(22 101 52);
	}

	.explorer__browse-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.75rem;
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
		background: white;
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
		background: white;
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
		background: rgb(250 250 249);
		border: 1px solid rgb(214 211 209);
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
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.75rem;
	}

	.explorer__lane-card {
		min-width: 0;
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
		border: 1px solid rgb(214 211 209);
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
		background: rgb(250 250 249);
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
