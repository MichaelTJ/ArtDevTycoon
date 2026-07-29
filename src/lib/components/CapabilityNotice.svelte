<script lang="ts">
	interface Props {
		supported: boolean;
		reason: string;
		ondismiss: () => void;
	}

	let { supported, reason, ondismiss }: Props = $props();
</script>

{#if !supported}
	<div
		class="mx-auto max-w-lg rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
		role="status"
	>
		<h2 class="text-lg font-semibold text-stone-800">Crayon Mode</h2>
		<p class="mt-2 text-stone-800">
			Your studio is running in <strong>Crayon Mode</strong>. Everything works — commissions,
			scoring, and payouts play exactly the same. Art is drawn procedurally instead of by an AI
			model, so you can play the full game right now.
		</p>
		<p class="mt-2 text-sm text-stone-500">{reason}</p>

		<button
			type="button"
			class="mt-4 min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			aria-label="Dismiss Crayon Mode notice"
			onclick={ondismiss}
		>
			Got it
		</button>
	</div>
{/if}
