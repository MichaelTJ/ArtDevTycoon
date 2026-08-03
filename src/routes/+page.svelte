<script lang="ts">
	import {
		ArtworkFullView,
		CapabilityNotice,
		EnginePicker,
		FridgeGallery,
		GameMenuBar,
		GameScene,
		IdleEarningsModal,
		LevelCompleteOverlay,
		ModelDownloadGate,
		MyPcSetup,
		StudioFloor,
		StudioHudOverlay
	} from '$lib/components';
	import {
		attachAudioUnlock,
		skillXpBeforeCollect,
		skillsThatLeveledUp,
		studioAudio
	} from '$lib/audio';
	import { getEnvironmentForLevel } from '$lib/data/environments';
	import { getLayout } from '$lib/data/galleryLayouts';
	import { getStaffRole } from '$lib/data/staffRoles';
	import { STUDIO_FLOOR_ENABLED } from '$lib/studio/config';
	import { StudioBridge } from '$lib/studio/bridge';
	import { getRoomForVenue } from '$lib/studio/venueRooms';
	import { queryPrefersReducedMotion } from '$lib/studio/vfx';
	import { loadDevLatch, resolveDevMode } from '$lib/dev/devMode';
	import { engines } from '$lib/stores/engineStore.svelte';
	import { game } from '$lib/stores/gameState.svelte';
	import type { SubmitChoice } from '$lib/game/submitChoice';
	import { artistLevel } from '$lib/game/artistTraining';
	import { getArtistCatalogEntry } from '$lib/data/artists';
	import { AssignArtistModal, ReceptionDesk } from '$lib/components';
	import {
		LEVEL_1,
		type ClientBrief,
		type EngineId,
		type GalleryEntry
	} from '$lib/types/contracts';
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';

	let showEngineMenu = $state(false);
	let downloadGateOpen = $state(false);
	let pendingEngineId = $state<EngineId | null>(null);
	let selectedEntry: GalleryEntry | null = $state(null);
	let clientSummoned = $state(false);
	let sketchExporter: (() => Promise<Blob | null>) | null = $state(null);
	/** Bumped when Phaser emits open-shop / toolkit (spec 21b). */
	let openToolkitNonce = $state(0);
	/** Spec 21d — OS/browser prefers-reduced-motion → Phaser skips floor particles. */
	let reducedVfx = $state(false);
	/** Bumped after Dev latch write/clear so resolveDevMode re-reads localStorage. */
	let latchTick = $state(0);
	/** Identity of last collect toast that already fired stingers (avoid replay on clear). */
	let lastStingerGains: typeof game.lastCollectedGains = null;
	let showReceptionDesk = $state(false);
	let boardOffers = $state<ClientBrief[]>([]);
	let showAssignArtist = $state(false);

	async function submitCommission(): Promise<void> {
		await game.createArt();
	}

	async function confirmSubmitChoice(choice: SubmitChoice): Promise<void> {
		const blob = choice === 'drawing' && sketchExporter ? await sketchExporter() : null;
		await game.confirmSubmitChoice(choice, blob);
	}

	const studioBridge = new StudioBridge();
	const viteDev = import.meta.env.DEV;
	const dev = $derived.by(() => {
		void latchTick;
		return resolveDevMode({
			searchParams: page.url.searchParams,
			viteDev,
			latch: loadDevLatch()
		});
	});
	/** Floor Talk/Deliver — same gate as Dev mode (`?studioDebug=1` still aliases). */
	const studioDebug = $derived(dev.enabled);

	const environment = $derived(getEnvironmentForLevel(LEVEL_1.id));
	const galleryLayoutClassName = $derived(getLayout(game.effectiveLayoutId).gridClassName);

	const autoInviteArmed = $derived(
		game.hiredStaffIds.some((id) => (getStaffRole(id)?.autoInviteSpeedMultiplier ?? 1) > 1)
	);

	const kitchenHasMum = $derived(
		getRoomForVenue(game.unlockedVenueId).residents.some((r) => r.clientName === 'Mum')
	);

	const capabilityReason = $derived(
		engines.realAiSupported
			? 'Pick a real art engine from the menu above when you are ready.'
			: (engines.options.find((option) => option.id !== 'mock' && !option.available)
					?.unavailableReason ??
					'Real AI needs WebGPU in the browser, or My PC (JanusLink) from the engine menu.')
	);

	const pendingEngine = $derived(
		pendingEngineId ? engines.options.find((option) => option.id === pendingEngineId) : null
	);

	const activeEngineLabel = $derived(engines.activeDisplayName);

	const engineButtonLabel = $derived.by(() => {
		if (engines.isBusy) {
			return `Loading ${activeEngineLabel}…`;
		}
		return `Art engine · ${activeEngineLabel}`;
	});

	const engineMenuLoadingLabel = $derived(
		engines.isBusy ? `Loading ${activeEngineLabel}…` : 'Loading art engines…'
	);

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

	function syncStudio(): void {
		const client = game.currentClient;
		studioBridge.sync({
			phase: game.phase,
			client: client
				? {
						id: client.id,
						clientName: client.clientName,
						avatarUrl: client.avatarUrl,
						tier: client.tier ?? 'walk-in'
					}
				: null,
			displayedEntries: game.displayedGalleryEntries,
			activeVenueId: game.unlockedVenueId,
			autoInviteArmed,
			estimatedWorkMs: game.lastWorkDurationMs,
			workStartedAt: game.workStartedAt,
			residentClientArmed: clientSummoned && kitchenHasMum && game.phase === 'idle',
			hiredRoleIds: game.hiredStaffIds,
			reducedVfx,
			receptionistVisible: game.receptionistAvailable
		});
	}

	function summonClient(): void {
		if (game.phase !== 'idle' || clientSummoned) return;
		clientSummoned = true;
		studioBridge.send({ type: 'summon-client' });
		syncStudio();
	}

	function talkToClient(): void {
		if (game.phase !== 'idle') return;
		game.inviteClient();
		clientSummoned = false;
		syncStudio();
		if (kitchenHasMum && game.currentClient?.clientName !== 'Mum') {
			studioBridge.send({ type: 'spawn-visitor' });
		}
	}

	function openReceptionDesk(): void {
		if (!game.receptionistAvailable || game.phase !== 'idle') return;
		boardOffers = game.pickCommissionBoardOffers(3);
		showReceptionDesk = true;
	}

	function acceptBoardBrief(brief: ClientBrief): void {
		game.acceptBoardBrief(brief);
		showReceptionDesk = false;
		clientSummoned = false;
		syncStudio();
		if (game.currentClient?.clientName !== 'Mum') {
			studioBridge.send({ type: 'spawn-visitor' });
		}
	}

	function declineClient(): void {
		if (game.phase !== 'briefing') return;
		game.declineClient();
		showAssignArtist = false;
		clientSummoned = false;
		studioBridge.send({ type: 'dismiss-client' });
		syncStudio();
	}

	const assignArtistOptions = $derived(
		game.hiredArtists.map((row) => {
			const entry = getArtistCatalogEntry(row.catalogId);
			return {
				catalogId: row.catalogId,
				name: entry?.name ?? row.catalogId,
				portrait: entry?.portrait ?? '🎨',
				level: artistLevel(row.xp)
			};
		})
	);

	async function deliverToClient(): Promise<void> {
		if (game.phase !== 'results') return;
		await game.collectCash();
		clientSummoned = false;
		studioBridge.send({ type: 'dismiss-client' });
		syncStudio();
	}

	function dismissError(): void {
		game.dismissError();
		clientSummoned = false;
		studioBridge.send({ type: 'dismiss-client' });
		syncStudio();
	}

	$effect(() => {
		void engines.init();
	});

	$effect(() => {
		studioAudio.syncMusicForVenue(game.unlockedVenueId);
	});

	$effect(() => {
		studioAudio.onPhase(game.phase);
	});

	$effect(() => {
		const gains = game.lastCollectedGains;
		if (!gains || gains === lastStingerGains) return;
		lastStingerGains = gains;
		studioAudio.playCashStinger();
		const before = skillXpBeforeCollect(game.skillXp, gains.skills);
		if (skillsThatLeveledUp(before, game.skillXp).length > 0) {
			studioAudio.playLevelUpStinger();
		}
	});

	$effect(() => {
		void game.phase;
		void game.currentClient;
		void game.displayedGalleryEntries;
		void game.unlockedVenueId;
		void autoInviteArmed;
		void game.lastWorkDurationMs;
		void game.workStartedAt;
		void game.hiredStaffIds;
		void game.receptionistAvailable;
		void clientSummoned;
		void kitchenHasMum;
		void reducedVfx;
		syncStudio();
		if (game.phase !== 'idle') {
			clientSummoned = false;
		}
	});

	onMount(() => {
		reducedVfx = queryPrefersReducedMotion();
		const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		const onMotionChange = () => {
			reducedVfx = queryPrefersReducedMotion();
		};
		motionQuery.addEventListener('change', onMotionChange);

		const detachUnlock = attachAudioUnlock(studioAudio);
		studioAudio.syncMusicForVenue(game.unlockedVenueId);
		const stopIncome = game.startIncomeTicker();
		game.setAutoInviteAction(() => summonClient());
		const unsub = studioBridge.subscribe((event) => {
			if (event.type === 'ready') {
				syncStudio();
				return;
			}
			if (event.type === 'talk-to-client') {
				talkToClient();
				return;
			}
			if (event.type === 'open-reception') {
				openReceptionDesk();
				return;
			}
			if (event.type === 'deliver-to-client') {
				void deliverToClient();
				return;
			}
			if (event.type === 'open-gallery-entry') {
				const entry = game.displayedGalleryEntries.find((e) => e.id === event.entryId);
				if (entry) openFullView(entry);
				return;
			}
			if (event.type === 'open-shop' && event.shop === 'toolkit') {
				openToolkitNonce += 1;
				return;
			}
			// prop-bark: Phaser already shows fridge feedback; toast optional in v1
		});
		return () => {
			motionQuery.removeEventListener('change', onMotionChange);
			detachUnlock();
			stopIncome();
			unsub();
			game.setAutoInviteAction(() => game.inviteClient());
		};
	});

	onDestroy(() => {
		studioBridge.setCommandHandler(null);
		studioAudio.dispose();
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

	function openFullView(entry: GalleryEntry): void {
		selectedEntry = entry;
	}

	function closeFullView(): void {
		selectedEntry = null;
	}

	async function handleEngineSelect(id: EngineId) {
		const option = engines.options.find((entry) => entry.id === id);
		if (!option) {
			return;
		}

		if (id === 'remote' && !option.available) {
			showEngineMenu = false;
			engines.openRemoteSetup();
			return;
		}

		if (!option.available) {
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

	function handleEngineConfigure(id: string): void {
		if (id === 'remote') {
			showEngineMenu = false;
			engines.openRemoteSetup();
		}
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
	<title>Art Gallery Tycoon ΓÇö {environment.levelDisplayName}</title>
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
			{openToolkitNonce}
			onafterslotchange={() => {
				clientSummoned = false;
				studioBridge.send({ type: 'dismiss-client' });
				syncStudio();
			}}
			devEnabled={dev.enabled}
			devReason={dev.reason}
			onlatchchange={() => {
				latchTick += 1;
			}}
		>
			{#snippet notice()}
				{#if engines.showCrayonNotice}
					<CapabilityNotice
						supported={false}
						reason={capabilityReason}
						ondismiss={engines.dismissNotice}
					/>
				{/if}
			{/snippet}
		</GameMenuBar>

		{#if STUDIO_FLOOR_ENABLED && environment.id === 'home-kitchen'}
			<div class="studio-shell grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
				<div class="flex flex-col gap-3">
					<StudioFloor bridge={studioBridge} initialVenueId={game.unlockedVenueId} />
					<FridgeGallery
						entries={game.displayedGalleryEntries}
						label={environment.galleryLabel}
						emptyMessage={environment.emptyGalleryMessage}
						layoutClassName={galleryLayoutClassName}
						onselect={openFullView}
					/>
				</div>
				<StudioHudOverlay
					phase={game.phase}
					idleMessage={environment.idleMessage}
					loadingMessages={environment.loadingMessages}
					critiqueMessages={environment.critiqueMessages}
					activeMediumTierId={game.activeMediumTierId}
					unlockedMediumTierIds={game.unlockedMediumTierIds}
					cash={game.cash}
					reputation={game.reputation}
					onselectmedium={(id) => game.setActiveMediumTier(id)}
					currentClient={game.currentClient}
					currentArtwork={game.currentArtwork}
					currentCritique={game.currentCritique}
					currentAuctionResult={game.currentAuctionResult}
					mumRealCritique={game.mumRealCritique}
					errorMessage={game.errorMessage}
					generationProgress={game.generationProgress}
					bind:draftPrompt={game.draftPrompt}
					{clientSummoned}
					{studioDebug}
					floorInteract={true}
					pendingSkillGains={game.pendingSkillGains}
					pendingSubmitChoice={game.pendingSubmitChoice}
					aiGeneratedImageUrl={game.aiGeneratedImageUrl}
					onsketchexportready={(fn) => {
						sketchExporter = fn;
					}}
					onconfirmsubmit={(choice) => void confirmSubmitChoice(choice)}
					oninvite={summonClient}
					ontalk={talkToClient}
					ondeliver={() => void deliverToClient()}
					onsubmit={() => void submitCommission()}
					oncollect={() => void deliverToClient()}
					onretry={() => game.retry()}
					ondismisserror={dismissError}
					ondecline={declineClient}
				/>
				{#if game.phase === 'briefing' && game.currentClient}
					<button
						type="button"
						class="min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						aria-label="Assign commission to artist"
						onclick={() => {
							showAssignArtist = true;
						}}
					>
						Assign to artist…
					</button>
				{/if}
			</div>
		{:else}
			<GameScene
				{environment}
				galleryEntries={game.displayedGalleryEntries}
				{galleryLayoutClassName}
				onselectentry={openFullView}
			>
				{#snippet workspace()}
					<StudioHudOverlay
						phase={game.phase}
						idleMessage={environment.idleMessage}
						loadingMessages={environment.loadingMessages}
						critiqueMessages={environment.critiqueMessages}
						activeMediumTierId={game.activeMediumTierId}
						unlockedMediumTierIds={game.unlockedMediumTierIds}
						cash={game.cash}
						reputation={game.reputation}
						onselectmedium={(id) => game.setActiveMediumTier(id)}
						currentClient={game.currentClient}
						currentArtwork={game.currentArtwork}
						currentCritique={game.currentCritique}
						currentAuctionResult={game.currentAuctionResult}
						mumRealCritique={game.mumRealCritique}
						errorMessage={game.errorMessage}
						generationProgress={game.generationProgress}
						bind:draftPrompt={game.draftPrompt}
						clientSummoned={false}
						{studioDebug}
						floorInteract={false}
						pendingSkillGains={game.pendingSkillGains}
						pendingSubmitChoice={game.pendingSubmitChoice}
						aiGeneratedImageUrl={game.aiGeneratedImageUrl}
						onsketchexportready={(fn) => {
							sketchExporter = fn;
						}}
						onconfirmsubmit={(choice) => void confirmSubmitChoice(choice)}
						oninvite={() => game.inviteClient()}
						ontalk={() => game.inviteClient()}
						ondeliver={() => void game.collectCash()}
						onsubmit={() => void submitCommission()}
						oncollect={() => void game.collectCash()}
						onretry={() => game.retry()}
						ondismisserror={() => game.dismissError()}
						ondecline={declineClient}
					/>
				{/snippet}
			</GameScene>
		{/if}
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
				loading={engines.isBusy}
				loadingLabel={engineMenuLoadingLabel}
				loadProgress={engines.loadProgress}
				onselect={(id) => handleEngineSelect(id as EngineId)}
				onconfigure={handleEngineConfigure}
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

{#if engines.showRemoteSetup}
	<MyPcSetup
		bind:provider={engines.remoteProvider}
		bind:baseUrl={engines.remoteBaseUrl}
		bind:apiKey={engines.remoteApiKey}
		bind:generateModel={engines.remoteGenerateModel}
		bind:critiqueModel={engines.remoteCritiqueModel}
		bind:critiqueProvider={engines.remoteCritiqueProvider}
		bind:critiqueBaseUrl={engines.remoteCritiqueBaseUrl}
		availableModels={engines.remoteAvailableModels}
		testState={engines.remoteTestState}
		testError={engines.remoteTestError}
		onproviderchange={(p) => engines.setRemoteProvider(p)}
		onrefreshmodels={() => void engines.refreshRemoteModels()}
		ontest={() => void engines.testRemoteConnection()}
		onconnect={() => void engines.connectRemote()}
		oncancel={() => engines.closeRemoteSetup()}
	/>
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
		oncontinue={() => game.acknowledgeCareerMilestone()}
	/>
{/if}

{#if game.idleEarningsToShow}
	<IdleEarningsModal
		amount={game.idleEarningsToShow}
		ondismiss={() => game.dismissIdleEarnings()}
	/>
{/if}

{#if showReceptionDesk}
	<ReceptionDesk
		offers={boardOffers}
		onaccept={acceptBoardBrief}
		onclose={() => {
			showReceptionDesk = false;
		}}
	/>
{/if}

{#if showAssignArtist && game.currentClient}
	<AssignArtistModal
		artists={assignArtistOptions}
		clientName={game.currentClient.clientName}
		assignmentFill={game.artistAssignmentFill}
		onassign={(id) => {
			game.assignBriefToArtist(id);
		}}
		onclose={() => {
			showAssignArtist = false;
		}}
	/>
{/if}
