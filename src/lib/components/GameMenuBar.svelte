<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ATMOSPHERE_ITEMS } from '$lib/data/galleryAtmosphere';
	import { GALLERY_LAYOUTS } from '$lib/data/galleryLayouts';
	import { GALLERY_VENUES } from '$lib/data/galleryVenues';
	import { MEDIUM_TIERS } from '$lib/data/mediumTiers';
	import { STAFF_ROLES } from '$lib/data/staffRoles';
	import { game } from '$lib/stores/gameState.svelte';
	import GalleryUpgradeShop from './GalleryUpgradeShop.svelte';
	import HudBar from './HudBar.svelte';
	import ProgressPanel from './ProgressPanel.svelte';
	import StaffOffice from './StaffOffice.svelte';
	import ToolkitShop from './ToolkitShop.svelte';

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
		notice
	}: Props = $props();

	let showToolkit = $state(false);
	let showGalleryUpgrades = $state(false);
	let showStaffOffice = $state(false);
	let showProgress = $state(false);

	const toolkitButtonLabel = $derived(
		`Medium · ${game.activeMediumTier.icon} ${game.activeMediumTier.name}`
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
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
				class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label={toolkitButtonLabel}
				onclick={() => {
					showToolkit = true;
				}}
			>
				{toolkitButtonLabel}
			</button>
			<button
				type="button"
				class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Gallery Upgrades"
				onclick={() => {
					showGalleryUpgrades = true;
				}}
			>
				🏛️ Gallery Upgrades
			</button>
			<button
				type="button"
				class="min-h-11 self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Staff Office"
				onclick={() => {
					showStaffOffice = true;
				}}
			>
				🧑‍💼 Staff Office
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
		</div>
		<div class="min-w-0 flex-1">
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
