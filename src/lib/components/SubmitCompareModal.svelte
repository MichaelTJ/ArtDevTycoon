<script lang="ts">
	interface Props {
		drawingImageUrl: string | null;
		aiImageUrl: string;
		canSubmitDrawing: boolean;
		onsubmitai: () => void;
		onsubmitdrawing: () => void;
		onback: () => void;
	}

	let {
		drawingImageUrl,
		aiImageUrl,
		canSubmitDrawing,
		onsubmitai,
		onsubmitdrawing,
		onback
	}: Props = $props();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Compare paintings"
>
	<div
		class="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-stone-300 bg-white p-6 shadow-lg"
	>
		<div class="grid gap-4 md:grid-cols-2">
			<figure class="flex flex-col gap-2">
				<figcaption class="text-sm font-medium text-stone-700">Your drawing</figcaption>
				{#if drawingImageUrl}
					<img
						src={drawingImageUrl}
						alt="Your drawing"
						class="w-full rounded-lg border border-stone-200 bg-stone-100 object-contain"
					/>
				{:else}
					<p class="text-sm text-stone-600">No drawing yet</p>
				{/if}
			</figure>
			<figure class="flex flex-col gap-2">
				<figcaption class="text-sm font-medium text-stone-700">AI image</figcaption>
				<img
					src={aiImageUrl}
					alt="Generated art from your idea"
					class="w-full rounded-lg border border-stone-200 bg-stone-100 object-contain"
				/>
			</figure>
		</div>
		<div class="mt-6 flex flex-col gap-2">
			<button
				type="button"
				class="min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				onclick={onsubmitai}
			>
				Submit AI image
			</button>
			<button
				type="button"
				class="min-h-11 rounded-lg border border-stone-400 bg-white px-4 py-2 font-semibold text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!canSubmitDrawing}
				onclick={onsubmitdrawing}
			>
				Submit your drawing
			</button>
			<button
				type="button"
				class="min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				onclick={onback}
			>
				Back to painting
			</button>
		</div>
	</div>
</div>
