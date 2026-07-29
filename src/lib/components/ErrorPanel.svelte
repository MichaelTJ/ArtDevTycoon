<script lang="ts">
	interface Props {
		message: string;
		onretry: () => void;
		ondismiss?: () => void;
	}

	let { message, onretry, ondismiss }: Props = $props();
</script>

<div class="rounded-xl border border-red-300 bg-red-50 p-5 text-red-800" role="alert">
	<p>{message}</p>
	<p class="mt-2 text-sm">Your prompt has been kept — you can try again without retyping.</p>

	<div class="mt-4 flex flex-wrap gap-3">
		<button
			type="button"
			class="min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			onclick={onretry}
		>
			Try Again
		</button>
		{#if ondismiss}
			<button
				type="button"
				class="min-h-11 rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				onclick={ondismiss}
			>
				Dismiss
			</button>
		{/if}
	</div>
</div>
