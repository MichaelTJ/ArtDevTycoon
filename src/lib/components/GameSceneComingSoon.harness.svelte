<script lang="ts">
	import { ENVIRONMENTS } from '$lib/data/environments';
	import GameScene from './GameScene.svelte';
</script>

<GameScene environment={ENVIRONMENTS['art-room']} galleryEntries={[]} onselectentry={() => {}}>
	{#snippet workspace()}
		<p>Hidden workspace</p>
	{/snippet}
</GameScene>
