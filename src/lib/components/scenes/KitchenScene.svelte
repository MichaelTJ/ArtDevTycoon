<script lang="ts">
	import type { GalleryEntry } from '$lib/types/contracts';
	import type { Snippet } from 'svelte';
	import FridgeGallery from '../FridgeGallery.svelte';
	import WorkspaceZone from '../WorkspaceZone.svelte';

	interface Props {
		workspaceLabel: string;
		galleryLabel: string;
		emptyGalleryMessage: string;
		galleryEntries: GalleryEntry[];
		onselectentry: (entry: GalleryEntry) => void;
		workspace: Snippet;
	}

	let {
		workspaceLabel,
		galleryLabel,
		emptyGalleryMessage,
		galleryEntries,
		onselectentry,
		workspace
	}: Props = $props();
</script>

<section
	aria-label="Home Kitchen"
	class="kitchen-room relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-stone-300 p-4 sm:p-6 lg:flex-row lg:items-start"
>
	<div
		class="pointer-events-none absolute top-6 right-8 h-24 w-24 rounded-full bg-amber-100/60 blur-2xl"
		aria-hidden="true"
	></div>

	<div class="lg:flex-[3]">
		<WorkspaceZone label={workspaceLabel}>
			{@render workspace()}
		</WorkspaceZone>
	</div>

	<div class="lg:flex-[2]">
		<FridgeGallery
			entries={galleryEntries}
			label={galleryLabel}
			emptyMessage={emptyGalleryMessage}
			onselect={onselectentry}
		/>
	</div>
</section>

<style>
	.kitchen-room {
		background: linear-gradient(to bottom, rgb(255 251 235), rgb(245 245 244) 60%);
	}
</style>
