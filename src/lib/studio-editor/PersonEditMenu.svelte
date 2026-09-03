<script lang="ts">
	import {
		PEOPLE_SHEET_IDS,
		PEOPLE_SHEETS,
		PERSON_SLOT_LABELS,
		TINT_PRESETS,
		getPeopleSheet,
		sheetTileCount,
		type PersonSlotId
	} from './catalog';
	import type { PersonLook } from './schema';
	import SpriteTile from './SpriteTile.svelte';

	interface Props {
		slotId: PersonSlotId;
		look: PersonLook;
		onchange: (look: PersonLook) => void;
		onclose: () => void;
		onreset: () => void;
	}

	let { slotId, look, onchange, onclose, onreset }: Props = $props();

	const sheet = $derived(getPeopleSheet(look.sheetId));
	const frames = $derived(Array.from({ length: sheetTileCount(sheet) }, (_, i) => i));
</script>

<div
	class="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/60 p-4 sm:items-center"
	role="dialog"
	aria-modal="true"
	aria-label="Edit {PERSON_SLOT_LABELS[slotId]}"
>
	<div
		class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">{PERSON_SLOT_LABELS[slotId]}</h2>
				<p class="mt-1 text-sm text-stone-500">
					Pick a spritesheet, a frame, and an optional tint — then close.
				</p>
			</div>
			<div class="flex shrink-0 gap-2">
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					onclick={onreset}
				>
					Reset
				</button>
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					aria-label="Close person menu"
					onclick={onclose}
				>
					Close
				</button>
			</div>
		</div>

		<fieldset class="mt-4">
			<legend class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Sheet</legend>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each PEOPLE_SHEET_IDS as sheetId (sheetId)}
					<button
						type="button"
						class="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 {look.sheetId ===
						sheetId
							? 'border-amber-600 bg-amber-50 text-stone-800'
							: 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}"
						aria-pressed={look.sheetId === sheetId}
						onclick={() => onchange({ ...look, sheetId, frame: 0 })}
					>
						{PEOPLE_SHEETS[sheetId].label}
					</button>
				{/each}
			</div>
		</fieldset>

		<fieldset class="mt-4">
			<legend class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Frame</legend>
			<div class="mt-2 flex max-h-48 flex-wrap gap-1 overflow-y-auto rounded-lg bg-stone-100 p-2">
				{#each frames as frame (frame)}
					<SpriteTile
						{sheet}
						index={frame}
						scale={2}
						selected={frame === look.frame}
						label="Frame {frame}"
						onclick={() => onchange({ ...look, frame })}
					/>
				{/each}
			</div>
		</fieldset>

		<fieldset class="mt-4">
			<legend class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Tint</legend>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each TINT_PRESETS as preset (preset.id)}
					<button
						type="button"
						class="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 {look.tint ===
						preset.value
							? 'border-amber-600 bg-amber-50 text-stone-800'
							: 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}"
						aria-pressed={look.tint === preset.value}
						onclick={() => onchange({ ...look, tint: preset.value })}
					>
						{preset.label}
					</button>
				{/each}
			</div>
		</fieldset>
	</div>
</div>
