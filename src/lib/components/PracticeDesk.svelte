<script lang="ts">
	import { canUnlockMediumTier, getMediumTier, MEDIUM_TIERS } from '$lib/data/mediumTiers';
	import {
		canListPracticeForSale,
		clampAskingPrice,
		paintCoverage01,
		practiceFairValue,
		type MediumSkillProgress
	} from '$lib/game';
	import { blobToDataUrl } from '$lib/game/submitChoice';
	import ProgressMeter from './ProgressMeter.svelte';
	import SketchCanvas from './SketchCanvas.svelte';

	interface Props {
		mediumTierId: string;
		unlockedMediumTierIds: string[];
		cash: number;
		reputation: number;
		skill: MediumSkillProgress;
		practiceStrokeMs: number;
		venueId: string;
		skillLevel: number;
		onselectmedium: (id: string) => void;
		onpracticetick: (deltaMs: number) => void;
		onscrap: () => void;
		onkeep: (payload: {
			destination: 'gallery' | 'storage';
			askingPrice: number | null;
			imageUrl: string;
			coverage01: number;
		}) => void;
		rankUpLabel?: string | null;
		/** Fill the paint dialog. Leave false in unconstrained tests. */
		fill?: boolean;
		/** Test seam when blob decode is flaky in Chromium. */
		coverageOverride?: number;
	}

	let {
		mediumTierId,
		unlockedMediumTierIds,
		cash,
		reputation,
		skill,
		practiceStrokeMs,
		venueId,
		skillLevel,
		onselectmedium,
		onpracticetick,
		onscrap,
		onkeep,
		rankUpLabel = null,
		fill = false,
		coverageOverride
	}: Props = $props();

	let canvasUnavailable = $state(false);
	let hasStrokes = $state(false);
	let step = $state<'draw' | 'keep' | 'price'>('draw');
	let coverage01 = $state(0);
	let imageUrl = $state('');
	let askingInput = $state('1');
	let getBlob: (() => Promise<Blob | null>) | null = $state(null);

	const mediumName = $derived(getMediumTier(skill.mediumId).name);
	const skillLine = $derived(
		skill.xpForNext === 0
			? `${mediumName} · ${skill.rankLabel} · Max level`
			: `${mediumName} · ${skill.rankLabel} · ${skill.xpIntoLevel}/${skill.xpForNext} XP`
	);
	const effectiveCoverage = $derived(
		coverageOverride !== undefined ? coverageOverride : coverage01
	);
	const canKeep = $derived(
		hasStrokes ||
			(coverageOverride !== undefined && coverageOverride >= 0.005) ||
			effectiveCoverage >= 0.005
	);
	const canList = $derived(
		canListPracticeForSale({ strokeMs: practiceStrokeMs, coverage01: effectiveCoverage })
	);
	const recommended = $derived(
		practiceFairValue({
			mediumTierId,
			strokeMs: practiceStrokeMs,
			coverage01: effectiveCoverage,
			skillLevel,
			venueId,
			reputation
		})
	);

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

	function attachPracticeHost(el: HTMLElement) {
		const canvas = el.querySelector('canvas');
		canvasUnavailable = canvas instanceof HTMLCanvasElement && canvas.getContext('2d') === null;
	}

	async function coverageFromBlob(blob: Blob): Promise<number> {
		const bitmap = await createImageBitmap(blob);
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return 0;
		ctx.drawImage(bitmap, 0, 0);
		return paintCoverage01(ctx.getImageData(0, 0, canvas.width, canvas.height));
	}

	async function captureCanvas(): Promise<void> {
		if (coverageOverride !== undefined) {
			coverage01 = coverageOverride;
			imageUrl = imageUrl || 'data:image/png;base64,aa';
			const blob = getBlob ? await getBlob() : null;
			if (blob) imageUrl = await blobToDataUrl(blob);
			return;
		}
		const blob = getBlob ? await getBlob() : null;
		if (!blob) {
			coverage01 = 0;
			imageUrl = '';
			return;
		}
		imageUrl = await blobToDataUrl(blob);
		coverage01 = await coverageFromBlob(blob);
	}

	async function goKeep(): Promise<void> {
		await captureCanvas();
		if (!canKeep) return;
		step = 'keep';
	}

	function putInStorage(): void {
		onkeep({
			destination: 'storage',
			askingPrice: null,
			imageUrl,
			coverage01: effectiveCoverage
		});
	}

	function goPrice(): void {
		if (!canList) return;
		askingInput = String(recommended);
		step = 'price';
	}

	function hangInGallery(): void {
		onkeep({
			destination: 'gallery',
			askingPrice: clampAskingPrice(Number(askingInput)),
			imageUrl,
			coverage01: effectiveCoverage
		});
	}
</script>

<div
	class={['desk', fill && 'desk-fill']}
	role="region"
	aria-label="Practice desk"
	{@attach attachPracticeHost}
>
	<SketchCanvas
		heading="Practice"
		{mediumTierId}
		{onpracticetick}
		ariaLabel="Practice canvas"
		bind:hasStrokes
		onexportready={(fn) => {
			getBlob = fn;
		}}
		{fill}
	>
		{#snippet extraTools()}
			<div class="flex flex-col items-center gap-2" role="group" aria-label="Painting medium">
				<span class="text-sm font-medium text-stone-700">Medium</span>
				<div class="flex flex-wrap justify-center gap-2">
					{#each MEDIUM_TIERS as tier (tier.id)}
						{@const unlocked = isMediumUnlocked(tier.id)}
						{@const active = tier.id === mediumTierId}
						{@const lockReason = mediumLockReason(tier)}
						<button
							type="button"
							class="min-h-9 min-w-9 rounded-lg border px-2 text-lg {active
								? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500'
								: unlocked
									? 'border-stone-300 bg-white hover:bg-stone-50'
									: 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-60'}"
							aria-label="{tier.name}{lockReason ? ` — ${lockReason}` : ''}"
							aria-pressed={active}
							disabled={!unlocked}
							title={lockReason ?? tier.name}
							onclick={() => onselectmedium(tier.id)}
						>
							<span aria-hidden="true">{tier.icon}</span>
						</button>
					{/each}
				</div>
			</div>
		{/snippet}
	</SketchCanvas>

	{#if canvasUnavailable}
		<p class="text-sm text-stone-700" role="alert">Canvas unavailable</p>
	{/if}

	<div class="footer">
		<div class="progress">
			<p class="text-sm text-stone-700">{skillLine}</p>
			<ProgressMeter
				label="Medium progress"
				variant="compact"
				value={skill.xpForNext === 0 ? 1 : skill.xpIntoLevel}
				max={skill.xpForNext === 0 ? 0 : skill.xpForNext}
				hint={skill.xpForNext === 0 ? 'Max level' : `${skill.xpIntoLevel}/${skill.xpForNext} XP`}
			/>
			{#if rankUpLabel}
				<p class="text-sm font-medium text-amber-900" aria-live="polite">Rank up — {rankUpLabel}</p>
			{/if}
		</div>
		{#if step === 'draw'}
			<div class="actions">
				<button
					type="button"
					class="scrap"
					aria-label="Scrap this practice painting"
					onclick={onscrap}
				>
					Scrap
				</button>
				<button
					type="button"
					class="keep"
					aria-label="Keep this practice painting"
					disabled={!canKeep}
					title={!canKeep ? 'Draw something first.' : undefined}
					onclick={() => void goKeep()}
				>
					Keep
				</button>
			</div>
			{#if !canKeep}
				<p class="hint">Draw something first.</p>
			{/if}
		{:else if step === 'keep'}
			<div class="actions" role="group" aria-label="Keep practice painting">
				<button
					type="button"
					class="keep"
					aria-label="Add to gallery"
					disabled={!canList}
					title={!canList
						? 'Too little paint for a sale — draw more, or put it in storage.'
						: undefined}
					onclick={goPrice}
				>
					Add to gallery
				</button>
				<button type="button" class="scrap" aria-label="Put in storage" onclick={putInStorage}>
					Put in storage
				</button>
				<button type="button" class="back" onclick={() => (step = 'draw')}>Back</button>
			</div>
			{#if !canList}
				<p class="hint">Too little paint for a sale — draw more, or put it in storage.</p>
			{/if}
		{:else}
			<div class="price" role="group" aria-label="Set asking price">
				<p class="recommend">Recommended price: ${recommended}</p>
				<label class="price-field">
					<span class="sr-only">Asking price</span>
					<input
						type="number"
						min="1"
						max="9999"
						aria-label="Asking price"
						bind:value={askingInput}
					/>
				</label>
				<p class="hint">Recommended ${recommended}. Visitors walk away if you ask much more.</p>
				<div class="actions">
					<button type="button" class="keep" onclick={hangInGallery}>Hang in gallery</button>
					<button type="button" class="back" onclick={() => (step = 'keep')}>Back</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.desk {
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 0.75rem;
	}

	.desk-fill {
		flex: 1 1 0;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}

	.footer {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		border-top: 1px solid #e7e5e4;
		padding-top: 0.75rem;
	}

	.progress {
		flex: 1 1 auto;
		min-width: 0;
	}

	.actions {
		display: flex;
		flex: 0 0 auto;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.keep,
	.scrap,
	.back {
		flex: 0 0 auto;
		min-height: 2.75rem;
		border-radius: 0.5rem;
		padding: 0.5rem 1.25rem;
		font-weight: 600;
	}

	.keep {
		background: #d97706;
		color: #fff;
	}

	.keep:hover:not(:disabled) {
		background: #b45309;
	}

	.keep:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.keep:focus-visible {
		outline: 2px solid #d97706;
		outline-offset: 2px;
	}

	.scrap,
	.back {
		border: 1px solid #d6d3d1;
		background: #fff;
		color: #44403c;
	}

	.scrap:hover,
	.back:hover {
		background: #f5f5f4;
	}

	.hint {
		flex-basis: 100%;
		margin: 0;
		font-size: 0.875rem;
		color: #57534e;
	}

	.price {
		display: flex;
		flex: 1 1 16rem;
		flex-direction: column;
		gap: 0.35rem;
	}

	.recommend {
		margin: 0;
		font-weight: 600;
		color: #1c1917;
	}

	.price-field input {
		min-height: 2.75rem;
		width: 8rem;
		border: 1px solid #d6d3d1;
		border-radius: 0.5rem;
		padding: 0.25rem 0.5rem;
	}

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
