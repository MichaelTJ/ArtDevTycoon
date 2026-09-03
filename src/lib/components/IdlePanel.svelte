<script lang="ts">
	interface Props {
		oninvite: () => void;
		disabled?: boolean;
		message?: string;
		/** Spec 28 — CSS kitchen fallback; when set, show Practice next to invite. */
		onpractice?: () => void;
	}

	let {
		oninvite,
		disabled = false,
		message = 'The studio is quiet. Dust floats in the window light.',
		onpractice
	}: Props = $props();
</script>

<div class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
	<p class="text-stone-800">{message}</p>

	<div class="mt-4 flex flex-wrap gap-2">
		<button
			type="button"
			class="min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
			{disabled}
			onclick={oninvite}
		>
			Wait for a Client
		</button>
		{#if onpractice}
			<button
				type="button"
				class="min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
				{disabled}
				aria-label="Practice at the desk"
				onclick={onpractice}
			>
				Practice
			</button>
		{/if}
	</div>
</div>
