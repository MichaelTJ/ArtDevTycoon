<script lang="ts">
	import {
		FURNITURE_CHOICES,
		FURNITURE_SHEET,
		TILESET_IDS,
		TILESETS,
		TILE_ROLES,
		TILE_ROLE_LABELS,
		sheetTileCount
	} from './catalog';
	import { furnitureAt, groundSheetOf, roleAt, type TileEdit } from './draft';
	import type { RoomDraft } from './schema';
	import SpriteTile from './SpriteTile.svelte';

	interface Props {
		tx: number;
		ty: number;
		draft: RoomDraft;
		onchange: (edit: TileEdit) => void;
		onclose: () => void;
	}

	let { tx, ty, draft, onchange, onclose }: Props = $props();

	const tileIndex = $derived(ty * draft.width + tx);
	const ground = $derived(draft.ground[tileIndex] ?? 0);
	const groundSheet = $derived(groundSheetOf(draft, tileIndex));
	const walkable = $derived(draft.collision[tileIndex] === 0);
	const furniture = $derived(furnitureAt(draft, tx, ty));
	const role = $derived(roleAt(draft, tx, ty));
</script>

<div
	class="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/60 p-4 sm:items-center"
	role="dialog"
	aria-modal="true"
	aria-label="Edit tile {tx}, {ty}"
>
	<div
		class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">Tile {tx}, {ty}</h2>
				<p class="mt-1 text-sm text-stone-500">
					Pick a floor tile, mark this cell as floor or wall, place furniture, and set a marker —
					then close. Desk, fridge, and client wait can be placed on many tiles. Door, player spawn,
					storage, and toolkit stay unique. Each fridge is a painting spot.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close tile menu"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		<fieldset class="mt-4">
			<legend class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Ground</legend>
			{#each TILESET_IDS as id (id)}
				{@const sheet = TILESETS[id]}
				<div class="mt-2">
					<p class="text-xs font-medium tracking-wide text-stone-500 uppercase">{sheet.label}</p>
					<div
						class="mt-1 flex max-h-48 flex-wrap gap-1 overflow-y-auto rounded-lg bg-stone-100 p-2"
					>
						{#each Array.from({ length: sheetTileCount(sheet) }, (_, i) => i) as atlasIndex (atlasIndex)}
							<SpriteTile
								{sheet}
								index={atlasIndex}
								scale={2}
								selected={sheet.id === groundSheet && atlasIndex === ground}
								label="{sheet.label} tile {atlasIndex}"
								onclick={() => onchange({ ground: atlasIndex, groundSheet: sheet.id })}
							/>
						{/each}
					</div>
				</div>
			{/each}
		</fieldset>

		<fieldset class="mt-4">
			<legend class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Wall</legend>
			<div class="mt-2 flex flex-wrap gap-2">
				<button
					type="button"
					class="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 {walkable
						? 'border-amber-600 bg-amber-50 text-stone-800'
						: 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}"
					aria-pressed={walkable}
					onclick={() => onchange({ walkable: true })}
				>
					Floor
				</button>
				<button
					type="button"
					class="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 {!walkable
						? 'border-amber-600 bg-amber-50 text-stone-800'
						: 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}"
					aria-pressed={!walkable}
					onclick={() => onchange({ walkable: false })}
				>
					Wall
				</button>
			</div>
		</fieldset>

		<fieldset class="mt-4">
			<legend class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Furniture</legend
			>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each FURNITURE_CHOICES as choice (choice.id)}
					<button
						type="button"
						class="flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 {(choice.frame ===
							null &&
							!furniture) ||
						(choice.frame !== null && furniture?.frame === choice.frame)
							? 'border-amber-600 bg-amber-50 text-stone-800'
							: 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}"
						aria-pressed={(choice.frame === null && !furniture) ||
							(choice.frame !== null && furniture?.frame === choice.frame)}
						onclick={() => onchange({ furnitureFrame: choice.frame })}
					>
						{#if choice.frame !== null}
							<SpriteTile
								sheet={FURNITURE_SHEET}
								index={choice.frame}
								scale={2}
								label={choice.label}
							/>
						{/if}
						{choice.label}
					</button>
				{/each}
			</div>
		</fieldset>

		<fieldset class="mt-4">
			<legend class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Marker</legend>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each TILE_ROLES as tileRole (tileRole)}
					<button
						type="button"
						class="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 {role ===
						tileRole
							? 'border-amber-600 bg-amber-50 text-stone-800'
							: 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}"
						aria-pressed={role === tileRole}
						onclick={() => onchange({ role: tileRole })}
					>
						{TILE_ROLE_LABELS[tileRole]}
					</button>
				{/each}
			</div>
		</fieldset>
	</div>
</div>
