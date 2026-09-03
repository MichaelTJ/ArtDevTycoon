<script lang="ts">
	import { resolve } from '$app/paths';
	import StudioEditorApp from '$lib/studio-editor/StudioEditorApp.svelte';
</script>

<svelte:head>
	<title>Studio editor — Art Gallery Tycoon</title>
</svelte:head>

<p class="px-4 pt-4 text-sm">
	<a
		class="font-medium text-amber-800 underline decoration-amber-600 underline-offset-2 hover:text-amber-950"
		href={resolve('/')}
	>
		← Back to game
	</a>
</p>

<StudioEditorApp />
