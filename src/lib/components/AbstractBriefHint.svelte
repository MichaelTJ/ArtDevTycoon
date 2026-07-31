<script lang="ts">
	import type { AbstractnessLevel } from '$lib/types/contracts';

	interface Props {
		abstractness: AbstractnessLevel;
	}

	let { abstractness }: Props = $props();

	const hint = $derived(
		abstractness === 1
			? "They didn't name a subject — pick a concrete scene that fits the feeling."
			: abstractness === 2
				? 'This is a mood, not a shopping list. Invent something specific.'
				: null
	);
</script>

{#if abstractness >= 1 && hint}
	<p class="text-sm text-stone-600" role="note">{hint}</p>
{/if}
