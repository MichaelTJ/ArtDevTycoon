<script lang="ts">
	import type { SkillGainPreview } from '$lib/game';

	interface Props {
		gains: SkillGainPreview;
		reputation: number;
		cash: number;
		mode: 'pending' | 'collected';
	}

	let { gains, reputation, cash, mode }: Props = $props();

	const prefix = $derived(mode === 'pending' ? 'On collect' : 'Banked');
</script>

<div
	class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-stone-800"
	role="status"
	aria-live="polite"
>
	<p class="font-medium">
		{prefix}: +${cash}
		{#if reputation > 0}
			· +{reputation} rep
		{/if}
		· +{gains.prompting}/+{gains.imagination}/+{gains.hustle} XP
	</p>
	<p class="mt-0.5 text-xs text-stone-500">Prompting / Imagination / Hustle</p>
</div>
