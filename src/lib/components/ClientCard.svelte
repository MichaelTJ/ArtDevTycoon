<script lang="ts">
	import type { ClientBrief } from '$lib/types/contracts';
	import Avatar from './Avatar.svelte';
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		brief: ClientBrief;
	}

	let { brief }: Props = $props();
</script>

<article
	class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	in:fly={{ y: 16, duration: prefersReducedMotion.current ? 0 : 300 }}
>
	<div class="flex items-start gap-4">
		<Avatar src={brief.avatarUrl} name={brief.clientName} size="lg" />
		<div class="min-w-0 flex-1">
			<h2 class="text-lg font-semibold text-stone-800">{brief.clientName}</h2>
			<p class="mt-1 text-sm font-medium text-emerald-700">Budget: ${brief.budget}</p>
			<div class="speech-bubble mt-3">
				<p class="text-stone-800">{brief.requestText}</p>
			</div>
		</div>
	</div>
</article>

<style>
	.speech-bubble {
		position: relative;
		border-radius: 0.75rem;
		border: 1px solid rgb(214 211 209);
		background: rgb(250 250 249);
		padding: 1rem;
	}

	.speech-bubble::before {
		content: '';
		position: absolute;
		left: -0.5rem;
		top: 1rem;
		width: 0;
		height: 0;
		border-top: 0.5rem solid transparent;
		border-bottom: 0.5rem solid transparent;
		border-right: 0.5rem solid rgb(214 211 209);
	}

	.speech-bubble::after {
		content: '';
		position: absolute;
		left: calc(-0.5rem + 1px);
		top: calc(1rem + 1px);
		width: 0;
		height: 0;
		border-top: calc(0.5rem - 1px) solid transparent;
		border-bottom: calc(0.5rem - 1px) solid transparent;
		border-right: calc(0.5rem - 1px) solid rgb(250 250 249);
	}
</style>
