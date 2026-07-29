<script lang="ts">
	import {
		ArtworkFrame,
		CapabilityNotice,
		ClientCard,
		EnginePicker,
		ErrorPanel,
		GeneratingPanel,
		HudBar,
		IdlePanel,
		LevelCompleteOverlay,
		ModelDownloadGate,
		PortfolioStrip,
		PromptComposer,
		ResultsPanel
	} from '$lib/components';
	import { engines } from '$lib/stores/engineStore.svelte';
	import { game } from '$lib/stores/gameState.svelte';
	import { LEVEL_1, type EngineId } from '$lib/types/contracts';

	let showEngineMenu = $state(false);
	let downloadGateOpen = $state(false);
	let pendingEngineId = $state<EngineId | null>(null);

	const capabilityReason = $derived(
		engines.options.find((option) => option.id !== 'mock' && !option.available)
			?.unavailableReason ??
			'Real AI models need WebGPU and a one-time download from the engine menu.'
	);

	const pendingEngine = $derived(
		pendingEngineId ? engines.options.find((option) => option.id === pendingEngineId) : null
	);

	const activeEngineLabel = $derived(
		engines.options.find((option) => option.id === engines.activeId)?.displayName ?? 'Crayon Mode'
	);

	const engineButtonLabel = $derived.by(() => {
		if (engines.state === 'loading') {
			return `Loading ${activeEngineLabel}…`;
		}
		return `Art engine · ${activeEngineLabel}`;
	});

	const loadStage = $derived.by((): 'downloading' | 'loading' | 'compiling' => {
		const status = engines.loadProgress?.status;
		if (status === 'compiling') {
			return 'compiling';
		}
		if (status === 'loading') {
			return 'loading';
		}
		if (status === 'downloading') {
			return 'downloading';
		}
		if (pendingEngine && !pendingEngine.requiresDownload) {
			return 'loading';
		}
		return 'downloading';
	});

	const downloadGateState = $derived.by((): 'prompt' | 'loading' | 'error' => {
		if (engines.loadError) {
			return 'error';
		}
		if (engines.state === 'loading' || engines.loadProgress) {
			return 'loading';
		}
		return 'prompt';
	});

	$effect(() => {
		void engines.init();
	});

	function openEngineMenu(): void {
		if (engines.switchingLocked) {
			return;
		}
		showEngineMenu = true;
	}

	function closeEngineMenu(): void {
		showEngineMenu = false;
	}

	async function handleEngineSelect(id: EngineId) {
		const option = engines.options.find((entry) => entry.id === id);
		if (!option?.available) {
			return;
		}

		if (id === engines.activeId && engines.state === 'ready') {
			showEngineMenu = false;
			return;
		}

		if (option.requiresDownload) {
			pendingEngineId = id;
			downloadGateOpen = true;
			showEngineMenu = false;
			return;
		}

		await engines.select(id);
		showEngineMenu = false;
	}

	async function confirmDownload(): Promise<void> {
		if (!pendingEngineId) {
			return;
		}
		await engines.select(pendingEngineId);
		if (engines.state === 'ready' && !engines.loadError) {
			downloadGateOpen = false;
			pendingEngineId = null;
		}
	}

	function cancelDownload(): void {
		engines.cancelLoad();
		downloadGateOpen = false;
		pendingEngineId = null;
	}
</script>

<svelte:head>
	<title>Art Gallery Tycoon — Garage Studio</title>
</svelte:head>

<main
	class="min-h-screen bg-stone-100 px-4 py-6 text-stone-800"
	data-phase={game.phase}
	data-engines-ready={engines.ready}
>
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<button
				type="button"
				class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={engines.switchingLocked ||
					game.phase === 'generating' ||
					game.phase === 'critiquing'}
				title={engines.switchingLocked
					? 'Finish the current commission before switching engines'
					: engineButtonLabel}
				aria-label={engineButtonLabel}
				onclick={openEngineMenu}
			>
				{engineButtonLabel}
			</button>

			<div class="min-w-0 flex-1">
				<HudBar
					cash={game.cash}
					levelName={LEVEL_1.name}
					commissionsCompleted={game.commissionsCompleted}
					targetCommissions={LEVEL_1.targetCommissions}
					targetCash={LEVEL_1.targetCash}
				/>
			</div>
		</div>

		{#if !engines.realAiSupported && !engines.noticeDismissed}
			<CapabilityNotice
				supported={engines.realAiSupported}
				reason={capabilityReason}
				ondismiss={engines.dismissNotice}
			/>
		{/if}

		<section class="flex flex-col gap-4">
			{#if game.phase === 'idle'}
				<IdlePanel oninvite={() => game.inviteClient()} />
			{:else if game.phase === 'briefing'}
				{#if game.currentClient}
					<ClientCard brief={game.currentClient} />
				{/if}
				<PromptComposer bind:value={game.draftPrompt} onsubmit={() => game.createArt()} />
			{:else if game.phase === 'generating'}
				{#if game.currentClient}
					<ClientCard brief={game.currentClient} />
				{/if}
				<GeneratingPanel progress={game.generationProgress} stageLabel="Painting" />
			{:else if game.phase === 'critiquing' && game.currentArtwork}
				{#if game.currentClient}
					<ClientCard brief={game.currentClient} />
				{/if}
				<ArtworkFrame
					imageUrl={game.currentArtwork.imageUrl}
					title="Fresh from the easel"
					alt={game.currentArtwork.playerPrompt}
					size="full"
				/>
				<GeneratingPanel
					progress={game.generationProgress}
					stageLabel="Waiting for the commissioner"
					messages={[
						'The client stepped out to look at your piece…',
						'Squinting at it from across the room…',
						'Comparing it to the brief…',
						'Drafting something diplomatic to say…'
					]}
				/>
			{:else if game.phase === 'results' && game.currentArtwork && game.currentCritique && game.currentClient}
				<ResultsPanel
					artwork={game.currentArtwork}
					critique={game.currentCritique}
					clientName={game.currentClient.clientName}
					oncollect={() => game.collectCash()}
				/>
			{:else if game.phase === 'failed'}
				{#if game.currentClient}
					<ClientCard brief={game.currentClient} />
				{/if}
				{#if game.errorMessage}
					<ErrorPanel
						message={game.errorMessage}
						onretry={() => game.retry()}
						ondismiss={() => game.dismissError()}
					/>
				{/if}
				<PromptComposer bind:value={game.draftPrompt} onsubmit={() => game.createArt()} />
			{:else if game.phase === 'levelComplete'}
				<IdlePanel disabled oninvite={() => {}} />
			{/if}
		</section>

		<PortfolioStrip entries={game.galleryHistory} />
	</div>
</main>

{#if showEngineMenu}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Engine settings"
	>
		<div class="w-full max-w-lg space-y-4">
			<EnginePicker
				options={engines.options}
				activeId={engines.activeId}
				onselect={(id) => handleEngineSelect(id as EngineId)}
			/>
			<button
				type="button"
				class="min-h-11 w-full rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300"
				onclick={closeEngineMenu}
			>
				Close
			</button>
		</div>
	</div>
{/if}

{#if downloadGateOpen && pendingEngine}
	<ModelDownloadGate
		engineName={pendingEngine.displayName}
		approxMb={pendingEngine.approxDownloadMb}
		state={downloadGateState}
		progress={engines.loadProgress?.fraction ?? 0}
		stage={loadStage}
		detail={engines.loadProgress?.file}
		errorMessage={engines.loadError}
		onconfirm={confirmDownload}
		oncancel={cancelDownload}
	/>
{/if}

{#if game.phase === 'levelComplete'}
	<LevelCompleteOverlay
		cash={game.cash}
		commissionsCompleted={game.commissionsCompleted}
		oncontinue={() => game.reset()}
	/>
{/if}
