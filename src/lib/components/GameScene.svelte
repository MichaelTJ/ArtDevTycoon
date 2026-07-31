<script lang="ts">
	import { STUDIO_FLOOR_ENABLED } from '$lib/studio/config';
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
		/** Spec 17: when the flag is on, `+page` renders StudioFloor outside this component. */
		studio?: Snippet;
	}

	let {
		environment,
		galleryEntries,
		galleryLayoutClassName,
		onselectentry,
		workspace,
		studio
	}: Props = $props();
</script>

{#if STUDIO_FLOOR_ENABLED && studio}
	{@render studio()}
{:else if environment.id === 'home-kitchen'}
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
