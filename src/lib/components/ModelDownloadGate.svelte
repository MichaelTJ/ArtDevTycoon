<script lang="ts">
	interface Props {
		engineName: string;
		approxMb: number;
		state?: 'prompt' | 'loading' | 'error';
		progress?: number;
		stage?: 'downloading' | 'loading' | 'compiling' | 'ready';
		detail?: string | null;
		errorMessage?: string | null;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		engineName,
		approxMb,
		state: gateState = 'prompt',
		progress = 0,
		stage = 'downloading',
		detail = null,
		errorMessage = null,
		onconfirm,
		oncancel
	}: Props = $props();

	const dialogTitleId = 'model-download-gate-title';
	let primaryButton: HTMLButtonElement | undefined = $state();

	const approxGb = $derived((approxMb / 1000).toFixed(1));
	const progressPercent = $derived(Math.round(progress * 100));
	const stageLabel = $derived.by(() => {
		if (stage === 'compiling') {
			return 'Preparing the model — this can take a few seconds. The progress bar may not move while shaders compile; that is normal.';
		}
		if (stage === 'loading') {
			return 'Loading model into memory…';
		}
		return 'Downloading model files…';
	});
	const progressAriaLabel = $derived(stage === 'loading' ? 'Load progress' : 'Download progress');

	$effect(() => {
		primaryButton?.focus();
	});
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby={dialogTitleId}
>
	<div class="w-full max-w-md rounded-xl border border-stone-300 bg-white p-6 shadow-lg">
		<h2 id={dialogTitleId} class="text-xl font-bold text-stone-800">{engineName}</h2>

		{#if gateState === 'prompt'}
			<p class="mt-3 text-stone-800">
				This will download about {approxGb} GB once, then works offline. On mobile data, that can use
				a lot of your plan — only continue if you are on Wi‑Fi or happy to use the data.
			</p>
			<div class="mt-6 flex flex-col gap-3 sm:flex-row">
				<button
					type="button"
					bind:this={primaryButton}
					class="min-h-11 flex-1 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					onclick={onconfirm}
				>
					Download and Play
				</button>
				<button
					type="button"
					class="min-h-11 flex-1 rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					onclick={oncancel}
				>
					Continue without model
				</button>
			</div>
		{:else if gateState === 'loading'}
			<p class="mt-3 text-stone-800">{stageLabel}</p>

			<progress
				class="mt-4 h-3 w-full accent-amber-600"
				value={progress}
				max={1}
				aria-label={progressAriaLabel}
			></progress>
			<p class="mt-1 text-sm text-stone-500">{progressPercent}%</p>
			{#if detail}
				<p class="mt-2 text-sm text-stone-500">{detail}</p>
			{/if}

			<button
				type="button"
				bind:this={primaryButton}
				class="mt-4 min-h-11 rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				onclick={oncancel}
			>
				Cancel
			</button>
		{:else}
			<p class="mt-3 text-red-800">
				{errorMessage ?? 'Something went wrong while loading the model.'}
			</p>
			<div class="mt-6 flex flex-col gap-3 sm:flex-row">
				<button
					type="button"
					bind:this={primaryButton}
					class="min-h-11 flex-1 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					onclick={onconfirm}
				>
					Try Again
				</button>
				<button
					type="button"
					class="min-h-11 flex-1 rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					onclick={oncancel}
				>
					Continue without model
				</button>
			</div>
		{/if}
	</div>
</div>
