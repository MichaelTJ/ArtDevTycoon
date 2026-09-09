<script lang="ts">
	import { styleMapToString, tileBackgroundStyle, type SheetSpec } from './catalog';

	interface Props {
		sheet: SheetSpec;
		index: number;
		scale?: number;
		label: string;
		selected?: boolean;
		framed?: boolean;
		onclick?: () => void;
	}

	let { sheet, index, scale = 2, label, selected = false, framed = true, onclick }: Props = $props();

	const style = $derived(styleMapToString(tileBackgroundStyle(sheet, index, scale)));
</script>

{#if onclick}
	<button
		type="button"
		class={[
			'shrink-0 overflow-hidden bg-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600',
			framed && 'border border-stone-400',
			selected && 'ring-2 ring-amber-500'
		]}
		aria-label={label}
		aria-pressed={selected}
		{onclick}
		{style}
	>
		&nbsp;
	</button>
{:else}
	<span
		class={['block shrink-0 overflow-hidden bg-stone-900', framed && 'border border-stone-300']}
		role="img"
		aria-label={label}
		{style}
	>
		&nbsp;
	</span>
{/if}
