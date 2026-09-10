<script lang="ts">
	import { blobToDataUrl, type SubmitChoice } from '$lib/game/submitChoice';
	import type { AuctionResult } from '$lib/game/auction';
	import {
		mediumSkillProgress,
		reputationGain,
		type MediumSkillProgress,
		type SkillGainPreview
	} from '$lib/game';
	import type { MumRealCritique } from '$lib/game/mumCritiquePresentation';
	import { canUnlockMediumTier, MEDIUM_TIERS, DEFAULT_MEDIUM_TIER_ID } from '$lib/data/mediumTiers';
	import { getStallStageLabel, stallMessagesForArtwork } from '$lib/data/stallMessages';
	import type { Artwork, ClientBrief, Critique, GamePhase } from '$lib/types/contracts';
	import AbstractBriefHint from './AbstractBriefHint.svelte';
	import ArtworkFrame from './ArtworkFrame.svelte';
	import AuctionResultPanel from './AuctionResultPanel.svelte';
	import ClientCard from './ClientCard.svelte';
	import ErrorPanel from './ErrorPanel.svelte';
	import GenerationReadyToast from './GenerationReadyToast.svelte';
	import GeneratingPanel from './GeneratingPanel.svelte';
	import IdlePanel from './IdlePanel.svelte';
	import PracticeDesk from './PracticeDesk.svelte';
	import PromptComposer from './PromptComposer.svelte';
	import ResultsPanel from './ResultsPanel.svelte';
	import ScoreBadge from './ScoreBadge.svelte';
	import SketchCanvas from './SketchCanvas.svelte';
	import SubmitCompareModal from './SubmitCompareModal.svelte';
	import WorkGainToast from './WorkGainToast.svelte';

	interface Props {
		phase: GamePhase;
		idleMessage: string;
		loadingMessages: string[];
		critiqueMessages: string[];
		/** Active art medium — drives critiquing stall copy (playtest P14) and painting brush (P16). */
		activeMediumTierId?: string;
		/** Unlocked medium ids for painting picker gating (Spec 25a). */
		unlockedMediumTierIds?: string[];
		cash?: number;
		reputation?: number;
		/** Sync painting medium with Toolkit active tier during briefing (before submit). */
		onselectmedium?: (id: string) => void;
		currentClient: ClientBrief | null;
		currentArtwork: Artwork | null;
		currentCritique: Critique | null;
		currentAuctionResult: AuctionResult | null;
		mumRealCritique?: MumRealCritique | null;
		errorMessage: string | null;
		generationProgress: number | null;
		draftPrompt: string;
		/** True while a client sprite is waiting and phase is still idle. */
		clientSummoned: boolean;
		/**
		 * Dev mode / e2e floor controls (Talk / Deliver). Prefer `?dev=1`;
		 * `?studioDebug=1` remains a resolveDevMode alias.
		 */
		studioDebug?: boolean;
		/**
		 * When true (studio floor), hide invite/collect buttons — timer + E interact.
		 * When false (CSS kitchen fallback), show classic buttons.
		 */
		floorInteract?: boolean;
		pendingSkillGains?: SkillGainPreview | null;
		/** True after generate completes — player picks drawing vs AI before critique. */
		pendingSubmitChoice?: boolean;
		aiGeneratedImageUrl?: string | null;
		/** Parent registers the sketch PNG exporter for submit choice. */
		onsketchexportready?: (getBlob: () => Promise<Blob | null>) => void;
		onconfirmsubmit?: (choice: SubmitChoice) => void;
		oninvite: () => void;
		ontalk: () => void;
		ondeliver: () => void;
		onsubmit: () => void;
		oncollect: () => void;
		onretry: () => void;
		ondismisserror: () => void;
		/** Briefing and generating — player skips the active commission. */
		ondecline?: () => void;
		/** Opens the parent AssignArtistModal. Briefing only; omit on CSS kitchen. */
		onassignartist?: () => void;
		/** Spec 28 — idle practice canvas in the Spec 31 viewport dialog. */
		practiceOpen?: boolean;
		skill?: MediumSkillProgress | null;
		rankUpLabel?: string | null;
		onpractice?: () => void;
		onpracticetick?: (deltaMs: number) => void;
		onexitpractice?: () => void;
		/** Spec 29 — engine is downloading/compiling. Default false. */
		modelLoading?: boolean;
		/** Spec 29 — busy/critique flavour copy for the desk card. */
		busyLine?: { speaker: string; text: string; footnote: string | null } | null;
	}

	let {
		phase,
		idleMessage,
		loadingMessages,
		critiqueMessages,
		activeMediumTierId = DEFAULT_MEDIUM_TIER_ID,
		unlockedMediumTierIds = [DEFAULT_MEDIUM_TIER_ID],
		cash = 0,
		reputation = 0,
		onselectmedium,
		currentClient,
		currentArtwork,
		currentCritique,
		currentAuctionResult,
		mumRealCritique = null,
		errorMessage,
		generationProgress,
		draftPrompt = $bindable(),
		clientSummoned,
		studioDebug = false,
		floorInteract = true,
		pendingSkillGains = null,
		pendingSubmitChoice = false,
		aiGeneratedImageUrl = null,
		onsketchexportready,
		onconfirmsubmit,
		oninvite,
		ontalk,
		ondeliver,
		onsubmit,
		oncollect,
		onretry,
		ondismisserror,
		ondecline,
		onassignartist,
		practiceOpen = false,
		skill = null,
		rankUpLabel = null,
		onpractice,
		onpracticetick,
		onexitpractice,
		modelLoading = false,
		busyLine = null
	}: Props = $props();

	let sketchHasStrokes = $state(false);
	let compareOpen = $state(false);
	let drawingImageUrl = $state<string | null>(null);
	let sketchGetBlob: (() => Promise<Blob | null>) | null = null;

	function handleSketchExportReady(getBlob: () => Promise<Blob | null>): void {
		sketchGetBlob = getBlob;
		onsketchexportready?.(getBlob);
	}

	async function openCompare(): Promise<void> {
		compareOpen = true;
		drawingImageUrl = null;
		const getBlob = sketchGetBlob;
		const blob = getBlob ? await getBlob() : null;
		drawingImageUrl = blob ? await blobToDataUrl(blob) : null;
	}

	function closeCompare(): void {
		compareOpen = false;
	}

	function confirmSubmit(choice: SubmitChoice): void {
		compareOpen = false;
		drawingImageUrl = null;
		onconfirmsubmit?.(choice);
	}

	function declineCommission(): void {
		compareOpen = false;
		drawingImageUrl = null;
		ondecline?.();
	}

	const isPracticeDialog = $derived(phase === 'idle' && practiceOpen);
	const isDeskModal = $derived(phase === 'briefing' || phase === 'generating' || isPracticeDialog);
	const clientName = $derived(currentClient?.clientName ?? 'client');
	const deskModalLabel = $derived(
		phase === 'generating' ? 'Paint while you wait' : isPracticeDialog ? 'Practice' : undefined
	);

	const pendingReputation = $derived(
		currentCritique
			? reputationGain(currentCritique.accuracyScore, currentCritique.creativityScore)
			: 0
	);

	const critiquingStallMessages = $derived(
		currentArtwork
			? stallMessagesForArtwork(activeMediumTierId, currentArtwork.id)
			: critiqueMessages
	);
	const critiquingStageLabel = $derived(getStallStageLabel(activeMediumTierId));
	const practiceSkill = $derived(skill ?? mediumSkillProgress(activeMediumTierId, 0));

	function isMediumUnlocked(id: string): boolean {
		return unlockedMediumTierIds.includes(id);
	}

	function mediumLockReason(tier: (typeof MEDIUM_TIERS)[number]): string | null {
		if (isMediumUnlocked(tier.id)) {
			return null;
		}
		if (cash < tier.unlockCost) {
			return `Need $${tier.unlockCost - cash} more`;
		}
		if (reputation < tier.requiredReputation) {
			return `Need ${tier.requiredReputation - reputation} more reputation`;
		}
		if (!canUnlockMediumTier(tier, { cash, reputation })) {
			return 'Locked in Toolkit';
		}
		return `Unlock for $${tier.unlockCost}`;
	}

	function activeMediumTier(): (typeof MEDIUM_TIERS)[number] {
		return MEDIUM_TIERS.find((tier) => tier.id === activeMediumTierId) ?? MEDIUM_TIERS[0]!;
	}

	const showPracticeButton = $derived(!clientSummoned || Boolean(busyLine) || modelLoading);
	const showReadyToast = $derived(
		phase === 'generating' && pendingSubmitChoice && Boolean(aiGeneratedImageUrl) && !compareOpen
	);
</script>

{#snippet busyCopy(line: { speaker: string; text: string; footnote: string | null })}
	<p class="text-sm font-medium text-stone-700">{line.speaker}</p>
	<p class="text-stone-800">{line.text}</p>
	{#if line.footnote}
		<p class="text-sm text-stone-500">{line.footnote}</p>
	{/if}
{/snippet}

{#snippet mediumPicker(locked: boolean)}
	<div
		class="flex flex-col items-center gap-2"
		role="group"
		aria-label={locked ? 'Painting medium (locked for this piece)' : 'Painting medium'}
	>
		<span class="text-sm font-medium text-stone-700">Medium</span>
		{#if locked}
			<span class="text-center text-sm text-stone-600">
				<span aria-hidden="true">{activeMediumTier().icon}</span>
				{activeMediumTier().name}
			</span>
		{:else}
			<div class="flex flex-wrap justify-center gap-2">
				{#each MEDIUM_TIERS as tier (tier.id)}
					{@const unlocked = isMediumUnlocked(tier.id)}
					{@const active = tier.id === activeMediumTierId}
					{@const lockReason = mediumLockReason(tier)}
					<button
						type="button"
						class="min-h-10 min-w-10 rounded-lg border px-2 text-lg {active
							? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500'
							: unlocked
								? 'border-stone-300 bg-white hover:bg-stone-50'
								: 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-60'}"
						aria-label="{tier.name}{lockReason ? ` — ${lockReason}` : ''}"
						aria-pressed={active}
						disabled={!unlocked}
						title={lockReason ?? tier.name}
						onclick={() => onselectmedium?.(tier.id)}
					>
						<span aria-hidden="true">{tier.icon}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

{#if isDeskModal}
	<div
		class="backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby={phase === 'briefing' ? 'commission-briefing-title' : undefined}
		aria-label={deskModalLabel}
	>
		<div class={['dialog', phase === 'briefing' ? 'dialog-briefing' : 'dialog-paint']}>
			{#if phase === 'briefing'}
				<h2 id="commission-briefing-title" class="text-2xl font-bold text-stone-800">
					Talk to {clientName}
				</h2>
				{#if currentClient}
					<ClientCard brief={currentClient} />
					{#if (currentClient.abstractness ?? 0) >= 1}
						<AbstractBriefHint abstractness={currentClient.abstractness ?? 0} />
					{/if}
				{/if}
				{@render mediumPicker(false)}
				<PromptComposer bind:value={draftPrompt} {onsubmit} />
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					aria-label="Skip this commission"
					onclick={declineCommission}
				>
					Skip
				</button>
				{#if onassignartist}
					<button
						type="button"
						class="min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						aria-label="Assign to artist…"
						onclick={onassignartist}
					>
						Assign to artist…
					</button>
				{/if}
			{:else if phase === 'generating'}
				<SketchCanvas
					heading={draftPrompt.trim() || 'Your idea'}
					bind:hasStrokes={sketchHasStrokes}
					mediumTierId={activeMediumTierId}
					onexportready={handleSketchExportReady}
					fill
				>
					{#snippet extraTools()}
						{@render mediumPicker(true)}
					{/snippet}
				</SketchCanvas>
				<div class="paint-footer">
					<div class="paint-footer-main">
						{#if !pendingSubmitChoice}
							<GeneratingPanel
								progress={generationProgress}
								stageLabel="Painting"
								messages={loadingMessages}
							/>
						{/if}
					</div>
					<button
						type="button"
						class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						aria-label="Skip this commission"
						onclick={declineCommission}
					>
						Skip
					</button>
				</div>
			{:else}
				<PracticeDesk
					mediumTierId={activeMediumTierId}
					{unlockedMediumTierIds}
					{cash}
					{reputation}
					skill={practiceSkill}
					{rankUpLabel}
					fill
					onselectmedium={(id) => onselectmedium?.(id)}
					onpracticetick={(deltaMs) => onpracticetick?.(deltaMs)}
					ondone={() => onexitpractice?.()}
				/>
			{/if}
		</div>
		{#if showReadyToast}
			<GenerationReadyToast onopen={() => void openCompare()} />
		{/if}
		{#if pendingSubmitChoice && compareOpen && aiGeneratedImageUrl}
			<SubmitCompareModal
				{drawingImageUrl}
				aiImageUrl={aiGeneratedImageUrl}
				canSubmitDrawing={sketchHasStrokes}
				onsubmitai={() => confirmSubmit('ai')}
				onsubmitdrawing={() => confirmSubmit('drawing')}
				onback={closeCompare}
			/>
		{/if}
	</div>
{:else}
	<aside
		class="studio-hud flex max-h-[min(70vh,640px)] flex-col gap-3 overflow-y-auto rounded-xl border border-stone-300 bg-stone-50/95 p-3 shadow-sm sm:max-h-none"
		aria-label="Commission desk"
	>
		{#if phase === 'idle'}
			<p class="text-sm text-stone-600">Walk with WASD or arrows · press E to talk</p>
			{#if floorInteract}
				<div class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
					{#if busyLine}
						{@render busyCopy(busyLine)}
					{:else}
						<p class="text-stone-800">
							{clientSummoned
								? 'Someone wants to talk — walk over and press E.'
								: idleMessage || 'A client will walk in shortly.'}
						</p>
					{/if}
				</div>
				{#if showPracticeButton}
					<button
						type="button"
						class="min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						aria-label="Practice at the desk"
						onclick={() => onpractice?.()}
					>
						Practice
					</button>
				{/if}
				{#if studioDebug && clientSummoned}
					<button
						type="button"
						data-testid="studio-debug-talk"
						class="min-h-11 rounded-lg border border-amber-700 bg-amber-100 px-4 py-2 font-semibold text-amber-950"
						onclick={ontalk}
					>
						Talk to client
					</button>
				{/if}
			{:else}
				<IdlePanel {oninvite} {onpractice} message={busyLine?.text ?? idleMessage} />
				{#if busyLine?.footnote}
					<p class="text-sm text-stone-500">{busyLine.footnote}</p>
				{/if}
			{/if}
		{:else if phase === 'critiquing' && currentArtwork}
			{#if currentClient}
				<ClientCard brief={currentClient} />
			{/if}
			{#if busyLine}
				<div class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
					{@render busyCopy(busyLine)}
				</div>
			{/if}
			<ArtworkFrame
				imageUrl={currentArtwork.imageUrl}
				title="Fresh from the easel"
				alt={currentArtwork.playerPrompt}
				size="full"
			/>
			<GeneratingPanel
				progress={generationProgress}
				stageLabel={critiquingStageLabel}
				messages={critiquingStallMessages}
			/>
		{:else if phase === 'results' && currentArtwork && currentCritique && currentClient}
			{#if floorInteract}
				<p class="text-sm font-medium text-amber-900">
					Walk to the client and press E to deliver their painting.
				</p>
			{/if}
			{#if currentAuctionResult}
				<div class="flex flex-col gap-4">
					<ClientCard brief={currentClient} />
					<ArtworkFrame
						imageUrl={currentArtwork.imageUrl}
						title={currentCritique.title}
						alt={currentCritique.title}
						size="full"
					/>
					<h2
						class="text-xl leading-snug font-bold break-words text-stone-800"
						title={currentCritique.title}
					>
						{currentCritique.title}
					</h2>
					<div class="flex flex-wrap gap-2">
						<ScoreBadge label="Accuracy" score={currentCritique.accuracyScore} />
						<ScoreBadge label="Creativity" score={currentCritique.creativityScore} />
					</div>
					<AuctionResultPanel
						bidderCount={currentAuctionResult.bidderCount}
						bids={currentAuctionResult.bids}
						winningBid={currentAuctionResult.winningBid}
						{oncollect}
						showCollectButton={!floorInteract}
					/>
					{#if pendingSkillGains}
						<WorkGainToast
							gains={pendingSkillGains}
							reputation={pendingReputation}
							cash={currentCritique.finalPayout}
							mode="pending"
						/>
					{/if}
				</div>
			{:else}
				<ResultsPanel
					artwork={currentArtwork}
					critique={currentCritique}
					clientName={currentClient.clientName}
					{mumRealCritique}
					{oncollect}
					showCollectButton={!floorInteract}
					{pendingSkillGains}
					{pendingReputation}
				/>
			{/if}
			{#if studioDebug && floorInteract}
				<button
					type="button"
					data-testid="studio-debug-deliver"
					class="min-h-11 rounded-lg border border-amber-700 bg-amber-100 px-4 py-2 font-semibold text-amber-950"
					onclick={ondeliver}
				>
					Deliver painting
				</button>
			{/if}
		{:else if phase === 'failed'}
			{#if currentClient}
				<ClientCard brief={currentClient} />
			{/if}
			{#if errorMessage}
				<ErrorPanel message={errorMessage} {onretry} ondismiss={ondismisserror} />
			{/if}
			<PromptComposer bind:value={draftPrompt} {onsubmit} />
		{:else if phase === 'levelComplete'}
			<IdlePanel disabled oninvite={() => {}} message={idleMessage} />
		{/if}
	</aside>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		padding: 1rem;
		background: rgb(28 25 23 / 0.6);
	}

	.dialog {
		box-sizing: border-box;
		width: min(72rem, 100%);
		min-width: 0;
		min-height: 0;
		border: 1px solid #d6d3d1;
		border-radius: 0.75rem;
		background: #fff;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
	}

	.dialog-briefing {
		display: flex;
		max-height: 100%;
		flex-direction: column;
		gap: 0.75rem;
		overflow: auto;
		padding: 1.5rem;
	}

	.dialog-paint {
		display: flex;
		height: min(52rem, 100%);
		max-height: 100%;
		flex-direction: column;
		gap: 0.75rem;
		overflow: hidden;
		padding: 1rem 1.25rem;
	}

	.paint-footer {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 1rem;
		border-top: 1px solid #e7e5e4;
		padding-top: 0.75rem;
	}

	.paint-footer-main {
		flex: 1 1 auto;
		min-width: 0;
	}
</style>
