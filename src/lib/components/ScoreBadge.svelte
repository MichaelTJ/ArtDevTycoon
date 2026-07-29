<script lang="ts">
	import { scoreBandClasses } from './scoreBand';

	interface Props {
		label: string;
		score: number;
		max?: number;
	}

	let { label, score, max = 10 }: Props = $props();
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium {scoreBandClasses(
		score
	)}"
>
	<span>{label}</span>
	<span>{score} / {max}</span>
</span>
