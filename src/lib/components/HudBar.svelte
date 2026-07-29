<script lang="ts">
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		cash: number;
		levelName: string;
		commissionsCompleted: number;
		targetCommissions: number;
		targetCash: number;
	}

	let { cash, levelName, commissionsCompleted, targetCommissions, targetCash }: Props = $props();

	const displayCash = Tween.of(() => cash, {
		duration: prefersReducedMotion.current ? 0 : 600,
		easing: cubicOut
	});
</script>

<header
	class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm sm:p-5"
	aria-label="Game status"
>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-lg font-bold text-stone-800">{levelName}</h1>
		<p class="text-xl font-semibold text-emerald-700" aria-label="Current cash">
			${Math.round(displayCash.current)}
		</p>
	</div>

	<div class="mt-4 space-y-3">
		<div>
			<label for="commission-progress" class="mb-1 block text-sm text-stone-500">
				{commissionsCompleted} / {targetCommissions} commissions
			</label>
			<progress
				id="commission-progress"
				class="h-3 w-full accent-amber-600"
				value={commissionsCompleted}
				max={targetCommissions}
			></progress>
		</div>

		<p class="text-sm text-stone-500" aria-label="Cash progress toward level goal">
			${cash} / ${targetCash} toward goal
		</p>
	</div>
</header>
