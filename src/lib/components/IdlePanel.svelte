<script lang="ts">
	interface Props {
		oninvite: () => void;
		disabled?: boolean;
		message?: string;
	}

	let {
		oninvite,
		disabled = false,
		message = 'The studio is quiet. Dust floats in the window light.'
	}: Props = $props();
</script>

<div class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
	<p class="text-stone-800">{message}</p>

	<button
		type="button"
		class="mt-4 min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
		{disabled}
		onclick={oninvite}
	>
		Wait for a Client
	</button>
</div>
