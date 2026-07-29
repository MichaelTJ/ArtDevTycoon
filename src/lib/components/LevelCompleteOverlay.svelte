<script lang="ts">
	interface Props {
		cash: number;
		commissionsCompleted: number;
		oncontinue: () => void;
	}

	let { cash, commissionsCompleted, oncontinue }: Props = $props();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="level-complete-title"
>
	<div class="w-full max-w-md rounded-xl border border-stone-300 bg-white p-6 shadow-lg">
		<h2 id="level-complete-title" class="text-2xl font-bold text-stone-800">Level Complete!</h2>
		<p class="mt-3 text-stone-800">
			Congratulations — your garage studio earned its keep. The commercial gallery is coming in
			Level 2.
		</p>

		<dl class="mt-4 space-y-2 text-stone-800">
			<div class="flex justify-between">
				<dt>Final cash</dt>
				<dd class="font-semibold text-emerald-700">${cash}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Commissions completed</dt>
				<dd class="font-semibold">{commissionsCompleted}</dd>
			</div>
		</dl>

		<button
			type="button"
			class="mt-6 min-h-11 w-full rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			onclick={oncontinue}
		>
			Continue
		</button>
	</div>
</div>
