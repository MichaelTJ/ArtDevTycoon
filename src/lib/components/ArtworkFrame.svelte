<script lang="ts">
	interface Props {
		imageUrl: string;
		title: string;
		alt: string;
		size?: 'thumb' | 'full';
	}

	let { imageUrl, title, alt, size = 'full' }: Props = $props();
</script>

<figure class="inline-block">
	<div
		class="border-8 border-stone-700 bg-stone-100 p-1 {size === 'thumb'
			? 'h-24 w-24'
			: 'w-full max-w-[512px]'}"
	>
		<img
			src={imageUrl}
			{alt}
			class="h-full w-full object-contain {size === 'thumb' ? 'max-h-20 max-w-20' : ''}"
		/>
	</div>
	{#if size === 'full'}
		<figcaption class="mt-2 text-center text-sm font-medium text-stone-800">{title}</figcaption>
	{/if}
</figure>
