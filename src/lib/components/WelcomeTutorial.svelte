<script lang="ts">
	interface Props {
		oncontinue: () => void;
	}

	let { oncontinue }: Props = $props();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="welcome-tutorial-title"
>
	<div class="w-full max-w-md rounded-xl border border-stone-300 bg-white p-6 shadow-lg">
		<h2 id="welcome-tutorial-title" class="text-2xl font-bold text-stone-800">
			Welcome to the studio
		</h2>
		<ul class="mt-4 list-disc space-y-2 pl-5 text-stone-800">
			<li>
				<strong>Practice makes perfect</strong> — The AI-generated images get better the more you draw
				with a medium.
			</li>
			<li>
				<strong>Grow your reputation, grow your commissions</strong> — Spend your money to get bigger
				and better spaces.
			</li>
			<li>
				<strong>A gold ! means someone is waiting</strong> — Walk over and press E (or tap) to talk.
			</li>
			<li>
				<strong>AI-assisted drawing</strong> — You explain the concept, AI creates it.
			</li>
			<li>
				<strong>WASD or arrows to walk</strong> — E interacts. Practice at the desk when the studio is
				quiet.
			</li>
		</ul>
		<button
			type="button"
			class="mt-6 min-h-11 w-full rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			onclick={oncontinue}
		>
			Let's go
		</button>
	</div>
</div>
