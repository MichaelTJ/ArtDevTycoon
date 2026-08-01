<script lang="ts">
	import type { AuctionResult } from '$lib/game/auction';
	import { reputationGain, type SkillGainPreview } from '$lib/game';
	import type { MumRealCritique } from '$lib/game/mumCritiquePresentation';
	import type { Artwork, ClientBrief, Critique, GamePhase } from '$lib/types/contracts';
	import AbstractBriefHint from './AbstractBriefHint.svelte';
	import ArtworkFrame from './ArtworkFrame.svelte';
	import AuctionResultPanel from './AuctionResultPanel.svelte';
	import ClientCard from './ClientCard.svelte';
	import ErrorPanel from './ErrorPanel.svelte';
	import GeneratingPanel from './GeneratingPanel.svelte';
	import IdlePanel from './IdlePanel.svelte';
	import PromptComposer from './PromptComposer.svelte';
	import ResultsPanel from './ResultsPanel.svelte';
	import ScoreBadge from './ScoreBadge.svelte';
	import SketchCanvas from './SketchCanvas.svelte';
	import WorkGainToast from './WorkGainToast.svelte';

	interface Props {
		phase: GamePhase;
		idleMessage: string;
		loadingMessages: string[];
		critiqueMessages: string[];
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
		/** Parent registers the sketch PNG exporter for createArt. */
		onsketchexportready?: (getBlob: () => Promise<Blob | null>) => void;
		oninvite: () => void;
		ontalk: () => void;
		ondeliver: () => void;
		onsubmit: () => void;
		oncollect: () => void;
		onretry: () => void;
		ondismisserror: () => void;
	}

	let {
		phase,
		idleMessage,
		loadingMessages,
		critiqueMessages,
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
		onsketchexportready,
		oninvite,
		ontalk,
		ondeliver,
		onsubmit,
		oncollect,
		onretry,
		ondismisserror
	}: Props = $props();

	let sketchHasStrokes = $state(false);

	const pendingReputation = $derived(
		currentCritique
			? reputationGain(currentCritique.accuracyScore, currentCritique.creativityScore)
			: 0
	);
</script>

<aside
	class="studio-hud flex max-h-[min(70vh,640px)] flex-col gap-3 overflow-y-auto rounded-xl border border-stone-300 bg-stone-50/95 p-3 shadow-sm sm:max-h-none"
	aria-label="Commission desk"
>
	{#if phase === 'idle'}
		<p class="text-sm text-stone-600">Walk with WASD or arrows · press E to talk</p>
		{#if floorInteract}
			<div class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
				<p class="text-stone-800">
					{clientSummoned
						? 'Someone wants to talk — walk over and press E.'
						: idleMessage || 'A client will walk in shortly.'}
				</p>
			</div>
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
			<IdlePanel {oninvite} message={idleMessage} />
		{/if}
	{:else if phase === 'briefing'}
		{#if currentClient}
			<ClientCard brief={currentClient} />
			{#if (currentClient.abstractness ?? 0) >= 1}
				<AbstractBriefHint abstractness={currentClient.abstractness ?? 0} />
			{/if}
		{/if}
		<SketchCanvas bind:hasStrokes={sketchHasStrokes} onexportready={onsketchexportready} />
		<PromptComposer bind:value={draftPrompt} {onsubmit} />
	{:else if phase === 'generating'}
		{#if currentClient}
			<ClientCard brief={currentClient} />
		{/if}
		<GeneratingPanel
			progress={generationProgress}
			stageLabel="Painting"
			messages={loadingMessages}
		/>
	{:else if phase === 'critiquing' && currentArtwork}
		{#if currentClient}
			<ClientCard brief={currentClient} />
		{/if}
		<ArtworkFrame
			imageUrl={currentArtwork.imageUrl}
			title="Fresh from the easel"
			alt={currentArtwork.playerPrompt}
			size="full"
		/>
		<GeneratingPanel
			progress={generationProgress}
			stageLabel="Waiting for the commissioner"
			messages={critiqueMessages}
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
				<h2 class="text-xl font-bold text-stone-800">{currentCritique.title}</h2>
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
