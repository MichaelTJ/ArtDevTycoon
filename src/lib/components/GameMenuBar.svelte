<script lang="ts">
	import type { Snippet } from 'svelte';
	import { studioAudio } from '$lib/audio';
	import { ATMOSPHERE_ITEMS } from '$lib/data/galleryAtmosphere';
	import { GALLERY_LAYOUTS } from '$lib/data/galleryLayouts';
	import { GALLERY_VENUES } from '$lib/data/galleryVenues';
	import { MEDIUM_TIERS } from '$lib/data/mediumTiers';
	import { getArtistCatalogEntry } from '$lib/data/artists';
	import { STAFF_ROLES } from '$lib/data/staffRoles';
	import { buildLevel1Prompt, computeAffordabilityBadges } from '$lib/game';
	import { clearDevLatch, persistDevLatch, type DevModeReason } from '$lib/dev/devMode';
	import { game } from '$lib/stores/gameState.svelte';
	import AudioSettingsPanel from './AudioSettingsPanel.svelte';
	import DevPanel from './DevPanel.svelte';
	import GalleryUpgradeShop from './GalleryUpgradeShop.svelte';
	import HudBar from './HudBar.svelte';
	import ProgressPanel from './ProgressPanel.svelte';
	import SaveSlotsPanel from './SaveSlotsPanel.svelte';
	import StaffOffice from './StaffOffice.svelte';
	import TeamRoster from './TeamRoster.svelte';
	import MajorProjectPanel from './MajorProjectPanel.svelte';
	import ToolkitShop from './ToolkitShop.svelte';
	import WorkGainToast from './WorkGainToast.svelte';

	interface Props {
		cash: number;
		levelName: string;
		commissionsCompleted: number;
		targetCommissions: number;
		targetCash: number;
		engineButtonLabel: string;
		engineMenuTitle: string;
		engineMenuDisabled: boolean;
		onopenenginemenu: () => void;
		/** Increment to request opening the toolkit (studio floor E). */
		openToolkitNonce?: number;
		/** Fired after a slot switch/new/delete so the page can dismiss studio clients. */
		onafterslotchange?: () => void;
		/** Spec 23 — show Dev menu entry when resolveDevMode is on. */
		devEnabled?: boolean;
		devReason?: DevModeReason;
		/** Parent re-resolves Dev mode after latch write/clear. */
		onlatchchange?: () => void;
		notice?: Snippet;
	}

	let {
		cash,
		levelName,
		commissionsCompleted,
		targetCommissions,
		targetCash,
		engineButtonLabel,
		engineMenuTitle,
		engineMenuDisabled,
		onopenenginemenu,
		openToolkitNonce = 0,
		onafterslotchange,
		devEnabled = false,
		devReason = 'off',
		onlatchchange,
		notice
	}: Props = $props();

	let showToolkit = $state(false);
	let showGalleryUpgrades = $state(false);
	let showStaffOffice = $state(false);
	let showTeamRoster = $state(false);
	let showMajorProjects = $state(false);
	let showProgress = $state(false);
	let showSaves = $state(false);
	let showAudio = $state(false);
	let showDev = $state(false);
	let lastToolkitNonce = 0;

	$effect(() => {
		const n = openToolkitNonce;
		if (n > lastToolkitNonce) {
			lastToolkitNonce = n;
			showToolkit = true;
		}
	});

	const modifiedPrompt = $derived.by(() => {
		const draft = game.draftPrompt.trim();
		if (!draft) return '';
		try {
			return buildLevel1Prompt(draft);
		} catch {
			return '';
		}
	});

	function exportSaveJson(): string {
		const json = game.devExportSave();
		try {
			void navigator.clipboard?.writeText(json);
		} catch {
			// Textarea fallback in DevPanel still holds the JSON.
		}
		return json;
	}

	const savesBusy = $derived(game.phase !== 'idle');

	const majorProjectActive = $derived(
		game.majorProjectProgress && game.activeMajorProjectDef
			? {
					projectId: game.majorProjectProgress.projectId,
					beatsCompleted: game.majorProjectProgress.beatsCompleted,
					crewByBeat: game.majorProjectProgress.crewByBeat,
					activeBeatIndex: game.majorProjectProgress.activeBeatIndex,
					beatFill: game.majorProjectBeatFill,
					beatStartedAt: game.majorProjectProgress.beatStartedAt,
					beatDurationMs: game.majorProjectProgress.beatDurationMs
				}
			: null
	);

	const majorProjectCrewOptions = $derived(
		game.hiredArtists.map((row) => ({
			catalogId: row.catalogId,
			name: getArtistCatalogEntry(row.catalogId)?.name ?? row.catalogId
		}))
	);

	const toolkitButtonLabel = $derived(
		`Medium · ${game.activeMediumTier.icon} ${game.activeMediumTier.name}`
	);

	const affordabilityBadges = $derived(
		computeAffordabilityBadges({
			cash,
			reputation: game.reputation,
			unlockedMediumTierIds: game.unlockedMediumTierIds,
			unlockedVenueId: game.unlockedVenueId,
			unlockedLayoutIds: game.unlockedLayoutIds,
			ownedAtmosphereIds: game.ownedAtmosphereIds,
			hiredStaffIds: game.hiredStaffIds,
			hiredArtistCatalogIds: game.hiredArtists.map((artist) => artist.catalogId)
		})
	);

	const skillsEmphasize = $derived(game.phase === 'generating' || game.phase === 'critiquing');

	const skillSummaries = $derived(
		game.skillProgressList.map((skill) => {
			const pending = game.pendingSkillGains?.[skill.id] ?? 0;
			const collected = game.lastCollectedGains?.skills[skill.id] ?? 0;
			return {
				id: skill.id,
				label: skill.label,
				level: skill.level,
				fill: skill.fill,
				delta: pending || collected || undefined
			};
		})
	);

	$effect(() => {
		if (!game.lastCollectedGains) return;
		const handle = setTimeout(() => {
			game.clearLastCollectedGains();
		}, 1600);
		return () => clearTimeout(handle);
	});
</script>

<header class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={engineMenuDisabled}
				title={engineMenuTitle}
				aria-label={engineButtonLabel}
				onclick={onopenenginemenu}
			>
				{engineButtonLabel}
			</button>
			<button
				type="button"
				class="relative min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label={toolkitButtonLabel}
				onclick={() => {
					showToolkit = true;
				}}
			>
				{toolkitButtonLabel}
				{#if affordabilityBadges.toolkit}
					<span
						class="pointer-events-none absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-600 ring-2 ring-white"
						aria-hidden="true"
					></span>
					<span class="sr-only">Upgrades available</span>
				{/if}
			</button>
			<button
				type="button"
				class="relative min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Gallery Upgrades"
				onclick={() => {
					showGalleryUpgrades = true;
				}}
			>
				🏛️ Gallery Upgrades
				{#if affordabilityBadges.gallery}
					<span
						class="pointer-events-none absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-600 ring-2 ring-white"
						aria-hidden="true"
					></span>
					<span class="sr-only">Upgrades available</span>
				{/if}
			</button>
			<button
				type="button"
				class="relative min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Artist team"
				onclick={() => {
					showTeamRoster = true;
				}}
			>
				🎨 Artist team
				{#if affordabilityBadges.team}
					<span
						class="pointer-events-none absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-600 ring-2 ring-white"
						aria-hidden="true"
					></span>
					<span class="sr-only">Upgrades available</span>
				{/if}
			</button>
			<button
				type="button"
				class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Major projects"
				onclick={() => {
					showMajorProjects = true;
				}}
			>
				📚 Major projects
			</button>
			<button
				type="button"
				class="relative min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Staff Office"
				onclick={() => {
					showStaffOffice = true;
				}}
			>
				🧑‍💼 Staff Office
				{#if affordabilityBadges.staff}
					<span
						class="pointer-events-none absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-600 ring-2 ring-white"
						aria-hidden="true"
					></span>
					<span class="sr-only">Upgrades available</span>
				{/if}
			</button>
			<button
				type="button"
				class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Progress"
				onclick={() => {
					showProgress = true;
				}}
			>
				📈 Progress
			</button>
			<button
				type="button"
				class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Audio"
				onclick={() => {
					studioAudio.unlock();
					showAudio = true;
				}}
			>
				Audio
			</button>
			<button
				type="button"
				class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Saves"
				onclick={() => {
					showSaves = true;
				}}
			>
				💾 Saves
			</button>
			{#if devEnabled}
				<button
					type="button"
					class="min-h-11 self-start rounded-lg border border-dashed border-stone-400 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					aria-label="Dev"
					onclick={() => {
						showDev = true;
					}}
				>
					Dev
				</button>
			{/if}
		</div>
		<div class="min-w-0 border-t border-stone-200 pt-3">
			<HudBar
				{cash}
				{levelName}
				{commissionsCompleted}
				{targetCommissions}
				{targetCash}
				reputation={game.reputation}
				reputationMeter={game.reputationMeter}
				{skillSummaries}
				{skillsEmphasize}
				variant="compact"
			/>
		</div>
	</div>
	{#if game.lastCollectedGains}
		<div class="mt-3">
			<WorkGainToast
				gains={game.lastCollectedGains.skills}
				reputation={game.lastCollectedGains.reputation}
				cash={game.lastCollectedGains.cash}
				mode="collected"
			/>
		</div>
	{/if}
	{#if notice}
		<div class="mt-3">{@render notice()}</div>
	{/if}
</header>

{#if showToolkit}
	<ToolkitShop
		tiers={[...MEDIUM_TIERS]}
		unlockedTierIds={game.unlockedMediumTierIds}
		activeTierId={game.activeMediumTierId}
		{cash}
		reputation={game.reputation}
		onunlock={(id) => {
			game.unlockMediumTier(id);
		}}
		onselect={(id) => {
			game.setActiveMediumTier(id);
		}}
		onclose={() => {
			showToolkit = false;
		}}
	/>
{/if}

{#if showGalleryUpgrades}
	<GalleryUpgradeShop
		venues={[...GALLERY_VENUES]}
		layouts={[...GALLERY_LAYOUTS]}
		atmosphereItems={[...ATMOSPHERE_ITEMS]}
		unlockedVenueId={game.unlockedVenueId}
		unlockedLayoutIds={game.unlockedLayoutIds}
		activeLayoutId={game.activeLayoutId}
		ownedAtmosphereIds={game.ownedAtmosphereIds}
		{cash}
		reputation={game.reputation}
		onunlockvenue={(id) => {
			game.unlockVenue(id);
		}}
		onunlocklayout={(id) => {
			game.unlockLayout(id);
		}}
		onselectlayout={(id) => {
			game.setActiveLayout(id);
		}}
		onbuyatmosphere={(id) => {
			game.buyAtmosphereItem(id);
		}}
		onclose={() => {
			showGalleryUpgrades = false;
		}}
	/>
{/if}

{#if showStaffOffice}
	<StaffOffice
		roles={[...STAFF_ROLES]}
		hiredIds={game.hiredStaffIds}
		{cash}
		reputation={game.reputation}
		onhire={(id) => {
			game.hireStaff(id);
		}}
		onclose={() => {
			showStaffOffice = false;
		}}
		onopenteam={() => {
			showStaffOffice = false;
			showTeamRoster = true;
		}}
	/>
{/if}

{#if showTeamRoster}
	<TeamRoster
		hired={game.hiredArtists}
		{cash}
		reputation={game.reputation}
		onhire={(id) => {
			game.hireArtist(id);
		}}
		onfire={(id) => {
			game.fireArtist(id);
		}}
		onclose={() => {
			showTeamRoster = false;
		}}
	/>
{/if}

{#if showMajorProjects}
	<MajorProjectPanel
		reputation={game.reputation}
		active={majorProjectActive}
		activeProject={game.activeMajorProjectDef}
		crewOptions={majorProjectCrewOptions}
		onaccept={(id) => {
			game.acceptMajorProject(id);
		}}
		onassigncrew={(beatIndex, catalogId) => {
			game.assignCrewToBeat(beatIndex, catalogId);
		}}
		onstartbeat={(beatIndex) => {
			game.startMajorProjectBeat(beatIndex);
		}}
		oncollect={() => {
			game.collectMajorProjectPayout();
		}}
		onclose={() => {
			showMajorProjects = false;
		}}
	/>
{/if}

{#if showProgress}
	<ProgressPanel
		{cash}
		reputation={game.reputation}
		commissions={game.progressMeters.commissions}
		cashMeter={game.progressMeters.cash}
		reputationMeter={game.progressMeters.reputation}
		skills={game.skillProgressList}
		onclose={() => {
			showProgress = false;
		}}
	/>
{/if}

{#if showAudio}
	<AudioSettingsPanel
		prefs={studioAudio.prefs}
		onchange={(patch) => {
			studioAudio.unlock();
			studioAudio.setPrefs(patch);
		}}
		onclose={() => {
			showAudio = false;
		}}
	/>
{/if}

{#if showSaves}
	<SaveSlotsPanel
		slots={game.saveSlotsList}
		activeId={game.activeSaveSlotId}
		busy={savesBusy}
		onswitch={(id) => {
			game.switchToSlot(id);
			onafterslotchange?.();
		}}
		onnew={(id) => {
			game.newGameInSlot(id);
			onafterslotchange?.();
		}}
		ondelete={(id) => {
			game.deleteSaveSlot(id);
			onafterslotchange?.();
		}}
		onrename={(id, name) => {
			game.renameSaveSlot(id, name);
		}}
		oncopy={(from, to) => {
			game.copySaveSlot(from, to);
		}}
		onclose={() => {
			showSaves = false;
		}}
	/>
{/if}

{#if showDev && devEnabled}
	<DevPanel
		enabled={true}
		reason={devReason}
		{cash}
		reputation={game.reputation}
		lifetimeCommissions={commissionsCompleted}
		draftPrompt={game.draftPrompt}
		{modifiedPrompt}
		onclose={() => {
			showDev = false;
		}}
		onsetcash={(n) => game.devSetCash(n)}
		onsetreputation={(n) => game.devSetReputation(n)}
		onsetcommissions={(n) => game.devSetLifetimeCommissions(n)}
		onunlockall={() => game.devUnlockAllProgression()}
		onforceidle={() => {
			game.devForceIdle();
			onafterslotchange?.();
		}}
		onexport={exportSaveJson}
		onimport={(raw) => {
			const result = game.devImportSave(raw);
			if (result.ok) {
				onafterslotchange?.();
			}
		}}
		onlatch={() => {
			persistDevLatch({ version: 1, latched: true });
			onlatchchange?.();
		}}
		onclearlatch={() => {
			clearDevLatch();
			onlatchchange?.();
			showDev = false;
		}}
		onopensaves={() => {
			showDev = false;
			showSaves = true;
		}}
	/>
{/if}

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
