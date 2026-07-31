<script lang="ts">
	import {
		ArtworkFrame,
		ArtworkFullView,
		AuctionResultPanel,
		CapabilityNotice,
		ClientCard,
		EnginePicker,
		ErrorPanel,
		GameMenuBar,
		GameScene,
		GeneratingPanel,
		IdleEarningsModal,
		IdlePanel,
		LevelCompleteOverlay,
		ModelDownloadGate,
		PromptComposer,
		ResultsPanel,
		ScoreBadge
	} from '$lib/components';
	import { getEnvironmentForLevel } from '$lib/data/environments';
	import { getLayout } from '$lib/data/galleryLayouts';
	import { engines } from '$lib/stores/engineStore.svelte';
	import { game } from '$lib/stores/gameState.svelte';
	import { LEVEL_1, type EngineId, type GalleryEntry } from '$lib/types/contracts';
	import { onMount } from 'svelte';

	let showEngineMenu = $state(false);
	let downloadGateOpen = $state(false);
	let pendingEngineId = $state<EngineId | null>(null);
	let selectedEntry: GalleryEntry | null = $state(null);

	const environment = $derived(getEnvironmentForLevel(LEVEL_1.id));
	const galleryLayoutClassName = $derived(getLayout(game.effectiveLayoutId).gridClassName);

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

	onMount(() => game.startIncomeTicker());

	function openEngineMenu(): void {
		if (engines.switchingLocked) {
			return;
		}
		showEngineMenu = true;
	}

	function closeEngineMenu(): void {
		showEngineMenu = false;
	}

	function openFullView(entry: GalleryEntry): void {
		selectedEntry = entry;
	}

	function closeFullView(): void {
		selectedEntry = null;
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
	<title>Art Gallery Tycoon — {environment.levelDisplayName}</title>
</svelte:head>

<main
	class="min-h-screen bg-stone-100 px-4 py-6 text-stone-800"
	data-phase={game.phase}
	data-engines-ready={engines.ready}
>
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<GameMenuBar
			cash={game.cash}
			levelName={environment.levelDisplayName}
			commissionsCompleted={game.commissionsCompleted}
			targetCommissions={LEVEL_1.targetCommissions}
			targetCash={LEVEL_1.targetCash}
			{engineButtonLabel}
			engineMenuTitle={engines.switchingLocked
				? 'Finish the current commission before switching engines'
				: engineButtonLabel}
			engineMenuDisabled={engines.switchingLocked ||
				game.phase === 'generating' ||
				game.phase === 'critiquing'}
			onopenenginemenu={openEngineMenu}
		>
			{#snippet notice()}
				{#if !engines.realAiSupported && !engines.noticeDismissed}
					<CapabilityNotice
						supported={engines.realAiSupported}
						reason={capabilityReason}
						ondismiss={engines.dismissNotice}
					/>
				{/if}
			{/snippet}
		</GameMenuBar>

		<GameScene
			{environment}
			galleryEntries={game.displayedGalleryEntries}
			{galleryLayoutClassName}
			onselectentry={openFullView}
		>
			{#snippet workspace()}
				<div class="flex flex-col gap-4">
					{#if game.phase === 'idle'}
						<IdlePanel oninvite={() => game.inviteClient()} message={environment.idleMessage} />
					{:else if game.phase === 'briefing'}
						{#if game.currentClient}
							<ClientCard brief={game.currentClient} />
						{/if}
						<PromptComposer bind:value={game.draftPrompt} onsubmit={() => game.createArt()} />
					{:else if game.phase === 'generating'}
						{#if game.currentClient}
							<ClientCard brief={game.currentClient} />
						{/if}
						<GeneratingPanel
							progress={game.generationProgress}
							stageLabel="Painting"
							messages={environment.loadingMessages}
						/>
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
							messages={environment.critiqueMessages}
						/>
					{:else if game.phase === 'results' && game.currentArtwork && game.currentCritique && game.currentClient}
						{#if game.currentAuctionResult}
							<div class="flex flex-col gap-4">
								{#if game.currentClient}
									<ClientCard brief={game.currentClient} />
								{/if}
								<ArtworkFrame
									imageUrl={game.currentArtwork.imageUrl}
									title={game.currentCritique.title}
									alt={game.currentCritique.title}
									size="full"
								/>
								<h2 class="text-xl font-bold text-stone-800">{game.currentCritique.title}</h2>
								<div class="flex flex-wrap gap-2">
									<ScoreBadge label="Accuracy" score={game.currentCritique.accuracyScore} />
									<ScoreBadge label="Creativity" score={game.currentCritique.creativityScore} />
								</div>
								<AuctionResultPanel
									bidderCount={game.currentAuctionResult.bidderCount}
									bids={game.currentAuctionResult.bids}
									winningBid={game.currentAuctionResult.winningBid}
									oncollect={() => void game.collectCash()}
								/>
							</div>
						{:else}
							<ResultsPanel
								artwork={game.currentArtwork}
								critique={game.currentCritique}
								clientName={game.currentClient.clientName}
								oncollect={() => void game.collectCash()}
							/>
						{/if}
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
						<IdlePanel disabled oninvite={() => {}} message={environment.idleMessage} />
					{/if}
				</div>
			{/snippet}
		</GameScene>
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

{#if selectedEntry}
	<ArtworkFullView entry={selectedEntry} onclose={closeFullView} />
{/if}

{#if game.phase === 'levelComplete'}
	<LevelCompleteOverlay
		cash={game.cash}
		commissionsCompleted={game.commissionsCompleted}
		message={environment.winMessage}
		oncontinue={() => game.reset()}
	/>
{/if}

{#if game.idleEarningsToShow}
	<IdleEarningsModal
		amount={game.idleEarningsToShow}
		ondismiss={() => game.dismissIdleEarnings()}
	/>
{/if}
