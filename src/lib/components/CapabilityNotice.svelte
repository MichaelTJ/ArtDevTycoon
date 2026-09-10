<script lang="ts">
	interface Props {
		supported: boolean;
		reason: string;
		canDownload?: boolean;
		ondismiss: () => void;
		ondownload?: () => void;
	}

	let { supported, reason, canDownload = false, ondismiss, ondownload }: Props = $props();

	const dialogTitleId = 'crayon-mode-notice-title';
</script>

{#if !supported}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby={dialogTitleId}
	>
		<div class="w-full max-w-md rounded-xl border border-stone-300 bg-white p-6 shadow-lg">
			<h2 id={dialogTitleId} class="text-xl font-bold text-stone-800">Crayon Mode</h2>
			<p class="mt-3 text-stone-800">
				Your studio is running in <strong>Crayon Mode</strong>. Everything works — commissions,
				scoring, and payouts play exactly the same. Art is (poorly) drawn procedurally instead of by
				an AI model, so you can play the full game right now.
			</p>
			{#if reason.trim()}
				<p class="mt-2 text-sm text-stone-500">{reason}</p>
			{/if}

			<div class="mt-6 flex flex-col gap-3 sm:flex-row">
				{#if canDownload}
					<button
						type="button"
						class="min-h-11 flex-1 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						onclick={() => ondownload?.()}
					>
						Download model
					</button>
				{/if}
				<button
					type="button"
					class="min-h-11 flex-1 rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					onclick={ondismiss}
				>
					Continue without model
				</button>
			</div>
		</div>
	</div>
{/if}
