<script lang="ts">
	import type { EnvironmentConfig } from '$lib/data/environments';

	interface Props {
		environment: EnvironmentConfig;
	}

	let { environment }: Props = $props();
</script>

<section
	class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	aria-label={environment.levelDisplayName}
>
	<h2 class="text-lg font-bold text-stone-800">{environment.levelDisplayName}</h2>
	<p class="mt-2 text-stone-500">{environment.tagline}</p>
</section>
