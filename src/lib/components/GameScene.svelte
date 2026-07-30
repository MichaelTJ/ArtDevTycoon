<script lang="ts">
	import type { EnvironmentConfig } from '$lib/data/environments';
	import type { GalleryEntry } from '$lib/types/contracts';
	import type { Snippet } from 'svelte';
	import KitchenScene from './scenes/KitchenScene.svelte';
	import SceneComingSoon from './scenes/SceneComingSoon.svelte';

	interface Props {
		environment: EnvironmentConfig;
		galleryEntries: GalleryEntry[];
		galleryLayoutClassName?: string;
		onselectentry: (entry: GalleryEntry) => void;
		workspace: Snippet;
	}

	let { environment, galleryEntries, galleryLayoutClassName, onselectentry, workspace }: Props =
		$props();
</script>

{#if environment.id === 'home-kitchen'}
	<KitchenScene
		workspaceLabel={environment.workspaceLabel}
		galleryLabel={environment.galleryLabel}
		emptyGalleryMessage={environment.emptyGalleryMessage}
		{galleryEntries}
		{galleryLayoutClassName}
		{onselectentry}
		{workspace}
	/>
{:else}
	<SceneComingSoon {environment} />
{/if}
