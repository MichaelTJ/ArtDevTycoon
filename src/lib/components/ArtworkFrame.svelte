<script lang="ts">
	interface Props {
		imageUrl: string;
		title: string;
		alt: string;
		size?: 'thumb' | 'full' | 'modal';
	}

	let { imageUrl, title, alt, size = 'full' }: Props = $props();

	const boxClass = $derived(
		size === 'thumb'
			? 'h-24 w-24'
			: size === 'modal'
				? 'box-border flex h-[min(36dvh,18rem)] w-full max-w-full items-center justify-center overflow-hidden'
				: 'w-full max-w-[512px]'
	);

	const imgClass = $derived(
		size === 'thumb'
			? 'h-full w-full max-h-20 max-w-20 object-contain'
			: size === 'modal'
				? 'max-h-full max-w-full object-contain'
				: 'h-full w-full object-contain'
	);

	const showCaption = $derived(size === 'full' || size === 'modal');
</script>

<figure class="block min-h-0 w-full min-w-0">
	<div class="border-8 border-stone-700 bg-stone-100 p-1 {boxClass}">
		<img src={imageUrl} {alt} class={imgClass} />
	</div>
	{#if showCaption}
		<figcaption
			class="mt-2 w-full text-center text-sm leading-snug font-medium break-words text-stone-800"
			{title}
		>
			{title}
		</figcaption>
	{/if}
</figure>
