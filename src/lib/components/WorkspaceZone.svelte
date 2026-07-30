<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		children: Snippet;
	}

	let { label, children }: Props = $props();
</script>

<section aria-label={label} class="table-surface rounded-2xl p-3 sm:p-4">
	<div class="rounded-xl bg-white/85 p-4 backdrop-blur-sm">
		<h2 class="sr-only">{label}</h2>
		{@render children()}
	</div>
</section>

<style>
	.table-surface {
		background-image: repeating-linear-gradient(
			90deg,
			rgb(180 138 96) 0px,
			rgb(180 138 96) 18px,
			rgb(163 121 82) 18px,
			rgb(163 121 82) 36px
		);
	}
</style>
