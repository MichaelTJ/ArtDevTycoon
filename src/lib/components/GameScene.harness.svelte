<script lang="ts">
	import { ENVIRONMENTS } from '$lib/data/environments';
	import GameScene from './GameScene.svelte';

	interface Props {
		environmentId?: keyof typeof ENVIRONMENTS;
	}

	let { environmentId = 'home-kitchen' }: Props = $props();
</script>

<GameScene environment={ENVIRONMENTS[environmentId]} galleryEntries={[]} onselectentry={() => {}}>
	{#snippet workspace()}
		<p>Kitchen workspace</p>
	{/snippet}
</GameScene>
