<script lang="ts">
	interface Props {
		amount: number;
		ondismiss: () => void;
	}

	let { amount, ondismiss }: Props = $props();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Idle earnings"
>
	<div class="w-full max-w-sm rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
		<h2 class="text-lg font-semibold text-stone-800">Welcome back</h2>
		<p class="mt-2 text-sm text-stone-600">
			While you were away, your studio earned <strong>${amount}</strong>.
		</p>
		<button
			type="button"
			class="mt-4 min-h-11 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			aria-label="Collect idle earnings"
			onclick={ondismiss}
		>
			Collect
		</button>
	</div>
</div>
