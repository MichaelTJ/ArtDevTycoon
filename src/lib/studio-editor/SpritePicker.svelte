<script lang="ts">
	import { sheetTileCount, type SheetSpec } from './catalog';
	import SpriteTile from './SpriteTile.svelte';

	interface Props {
		title: string;
		dialogLabel: string;
		sheets: SheetSpec[];
		selectedSheetId?: string;
		selectedIndex?: number;
		onpick: (sheetId: string, index: number) => void;
		onclose: () => void;
	}

	let { title, dialogLabel, sheets, selectedSheetId, selectedIndex, onpick, onclose }: Props =
		$props();
</script>

<div
	class="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/60 p-4 sm:items-center"
	role="dialog"
	aria-modal="true"
	aria-label={dialogLabel}
>
	<div
		class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">{title}</h2>
				<p class="mt-1 text-sm text-stone-500">
					Pick a sprite. Every matching floor, wall, or furniture piece in this room updates.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close sprite picker"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		{#each sheets as sheet (sheet.id)}
			<fieldset class="mt-4">
				<legend class="text-sm font-semibold tracking-wide text-stone-500 uppercase"
					>{sheet.label}</legend
				>
				<div class="mt-2 flex max-h-48 flex-wrap gap-1 overflow-y-auto rounded-lg bg-stone-100 p-2">
					{#each Array.from({ length: sheetTileCount(sheet) }, (_, i) => i) as atlasIndex (atlasIndex)}
						<SpriteTile
							{sheet}
							index={atlasIndex}
							scale={2}
							selected={sheet.id === selectedSheetId && atlasIndex === selectedIndex}
							label="{sheet.label} tile {atlasIndex}"
							onclick={() => onpick(sheet.id, atlasIndex)}
						/>
					{/each}
				</div>
			</fieldset>
		{/each}
	</div>
</div>
