<script lang="ts">
	import { ROOMS, type RoomId } from '$lib/studio/rooms';
	import {
		FURNITURE_SHEETS,
		PERSON_SLOT_IDS,
		PERSON_SLOT_LABELS,
		ROOM_LABELS,
		TILESET_IDS,
		TILESETS,
		TILE_ROLE_LABELS,
		getFurnitureSheet,
		getPeopleSheet,
		getTileset
	} from './catalog';
	import {
		applyTileEdit,
		furnitureAt,
		groundSheetOf,
		listFloorKinds,
		listFurnitureKinds,
		listWallKinds,
		recolorFloors,
		recolorFurniture,
		recolorWalls,
		roleAt,
		switchTileset,
		type TileEdit
	} from './draft';
	import { resolvePersonLook, resolveRoomDraft } from './apply';
	import {
		loadStudioEditorState,
		resetPersonLook,
		resetRoomDraft,
		savePersonLook,
		saveRoomDraft
	} from './storage';
	import type { PersonLook, RoomDraft } from './schema';
	import type { PersonSlotId, TilesetId } from './catalog';
	import PersonEditMenu from './PersonEditMenu.svelte';
	import SpritePicker from './SpritePicker.svelte';
	import SpriteTile from './SpriteTile.svelte';
	import TileEditMenu from './TileEditMenu.svelte';

	type PalettePick =
		| { kind: 'wall'; ground: number; sheet: string }
		| { kind: 'floor'; ground: number; sheet: string }
		| { kind: 'furniture'; frame: number; sheet: string };

	type TabId = 'rooms' | 'people';

	let tab = $state<TabId>('rooms');
	let roomId = $state<RoomId>('home-kitchen');
	let draft = $state<RoomDraft>(resolveRoomDraft(ROOMS['home-kitchen']));
	let selectedTile = $state<{ tx: number; ty: number } | null>(null);
	let palettePick = $state<PalettePick | null>(null);
	let selectedPerson = $state<PersonSlotId | null>(null);
	let people = $state(loadStudioEditorState().people);
	let status = $state('Edits save in this browser and apply the next time you load the studio.');

	const wallKinds = $derived(listWallKinds(draft));
	const floorKinds = $derived(listFloorKinds(draft));
	const furnitureKinds = $derived(listFurnitureKinds(draft));
	const furniturePickerSheets = $derived(Object.values(FURNITURE_SHEETS));
	const groundPickerSheets = $derived(TILESET_IDS.map((id) => TILESETS[id]));
	const cells = $derived.by(() => {
		const list: { tx: number; ty: number; index: number }[] = [];
		for (let ty = 0; ty < draft.height; ty++) {
			for (let tx = 0; tx < draft.width; tx++) {
				list.push({ tx, ty, index: ty * draft.width + tx });
			}
		}
		return list;
	});

	function loadRoom(nextId: RoomId): void {
		roomId = nextId;
		draft = resolveRoomDraft(ROOMS[nextId]);
		selectedTile = null;
		palettePick = null;
	}

	function persistDraft(next: RoomDraft): void {
		draft = next;
		saveRoomDraft(roomId, next);
		status = `${ROOM_LABELS[roomId]} saved.`;
	}

	function onTilesetChange(event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (!(TILESET_IDS as readonly string[]).includes(value)) return;
		persistDraft(switchTileset(draft, value as TilesetId));
	}

	function onRoomChange(event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (value in ROOMS) loadRoom(value as RoomId);
	}

	function editSelected(edit: TileEdit): void {
		if (!selectedTile) return;
		persistDraft(applyTileEdit(draft, selectedTile.tx, selectedTile.ty, edit));
	}

	function resetCurrentRoom(): void {
		resetRoomDraft(roomId);
		draft = resolveRoomDraft(ROOMS[roomId], loadStudioEditorState());
		selectedTile = null;
		palettePick = null;
		status = `${ROOM_LABELS[roomId]} reset to the authored layout.`;
	}

	function personLook(slotId: PersonSlotId): PersonLook {
		return resolvePersonLook(slotId, { version: 1, rooms: {}, people });
	}

	function editPerson(look: PersonLook): void {
		if (!selectedPerson) return;
		people = savePersonLook(selectedPerson, look).people;
		status = `${PERSON_SLOT_LABELS[selectedPerson]} saved.`;
	}

	function resetCurrentPerson(): void {
		if (!selectedPerson) return;
		people = resetPersonLook(selectedPerson).people;
		status = `${PERSON_SLOT_LABELS[selectedPerson]} reset.`;
	}

	function pickPaletteSprite(sheetId: string, index: number): void {
		if (!palettePick) return;
		if (palettePick.kind === 'wall') {
			persistDraft(recolorWalls(draft, palettePick, { ground: index, sheet: sheetId }));
		} else if (palettePick.kind === 'floor') {
			persistDraft(recolorFloors(draft, palettePick, { ground: index, sheet: sheetId }));
		} else {
			persistDraft(recolorFurniture(draft, palettePick, { frame: index, sheet: sheetId }));
		}
		palettePick = null;
	}

	function markerLetter(tx: number, ty: number): string | null {
		const role = roleAt(draft, tx, ty);
		if (role === 'none') return null;
		return TILE_ROLE_LABELS[role][0] ?? null;
	}
</script>

<div class="mx-auto max-w-6xl p-4 sm:p-6">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-stone-800">Studio editor</h1>
			<p class="mt-1 max-w-2xl text-sm text-stone-600">
				Click a tile or a person, choose options, then close. Layouts and looks persist in this
				browser and show up in the walkable studio after a reload.
			</p>
		</div>
		<p class="text-sm text-stone-500" role="status">{status}</p>
	</header>

	<div class="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Editor">
		<button
			type="button"
			role="tab"
			aria-selected={tab === 'rooms'}
			class="min-h-11 rounded-lg border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 {tab ===
			'rooms'
				? 'border-amber-600 bg-amber-50 text-stone-800'
				: 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}"
			onclick={() => (tab = 'rooms')}
		>
			Rooms
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={tab === 'people'}
			class="min-h-11 rounded-lg border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 {tab ===
			'people'
				? 'border-amber-600 bg-amber-50 text-stone-800'
				: 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}"
			onclick={() => (tab = 'people')}
		>
			People
		</button>
	</div>

	{#if tab === 'rooms'}
		<section class="mt-6" aria-label="Room layout">
			<div class="flex flex-wrap items-end gap-4">
				<label class="text-sm text-stone-700">
					Room
					<select
						class="mt-1 block min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2"
						value={roomId}
						onchange={onRoomChange}
					>
						{#each Object.entries(ROOM_LABELS) as [id, label] (id)}
							<option value={id}>{label}</option>
						{/each}
					</select>
				</label>
				<label class="text-sm text-stone-700">
					Tileset
					<select
						class="mt-1 block min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2"
						value={draft.tilesetId}
						onchange={onTilesetChange}
					>
						{#each TILESET_IDS as id (id)}
							<option value={id}>{TILESETS[id].label}</option>
						{/each}
					</select>
				</label>
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					onclick={resetCurrentRoom}
				>
					Reset room
				</button>
			</div>

			<div
				class="mt-4 inline-grid max-w-full gap-px overflow-auto rounded-lg border border-stone-400 bg-stone-400 p-px"
				style:grid-template-columns="repeat({draft.width}, 32px)"
				role="grid"
				aria-label="{ROOM_LABELS[roomId]} tiles"
			>
				{#each cells as cell (`${cell.tx},${cell.ty}`)}
					{@const furn = furnitureAt(draft, cell.tx, cell.ty)}
					{@const letter = markerLetter(cell.tx, cell.ty)}
					<button
						type="button"
						class="relative h-8 w-8 overflow-hidden bg-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						role="gridcell"
						aria-label="Tile {cell.tx}, {cell.ty}"
						onclick={() => (selectedTile = { tx: cell.tx, ty: cell.ty })}
					>
						<SpriteTile
							sheet={getTileset(groundSheetOf(draft, cell.index))}
							index={draft.ground[cell.index] ?? 0}
							scale={2}
							label="Ground at {cell.tx}, {cell.ty}"
						/>
						{#if furn}
							<span class="absolute inset-0 flex items-center justify-center">
								<SpriteTile
									sheet={getFurnitureSheet(furn.sheet)}
									index={furn.frame}
									scale={2}
									label="Furniture at {cell.tx}, {cell.ty}"
								/>
							</span>
						{/if}
						{#if letter}
							<span
								class="absolute right-0 bottom-0 bg-amber-500 px-0.5 text-[9px] leading-none font-bold text-stone-900"
								>{letter}</span
							>
						{/if}
					</button>
				{/each}
			</div>

			<section class="mt-6" aria-label="Floors">
				<h2 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Floors</h2>
				<p class="mt-1 text-sm text-stone-600">
					Click a floor sprite to re-skin every matching floor in this room. You can pick from every
					tileset.
				</p>
				{#if floorKinds.length === 0}
					<p class="mt-2 text-sm text-stone-500">No floors in this room.</p>
				{:else}
					<ul class="mt-3 flex flex-wrap gap-2" aria-label="Floor sprites">
						{#each floorKinds as kind (`floor-${kind.sheet}-${kind.ground}`)}
							<li>
								<button
									type="button"
									class="flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-left hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
									aria-label="Change floor sprite {kind.sheet} {kind.ground}"
									onclick={() =>
										(palettePick = {
											kind: 'floor',
											ground: kind.ground,
											sheet: kind.sheet
										})}
								>
									<SpriteTile
										sheet={getTileset(kind.sheet)}
										index={kind.ground}
										scale={2}
										label="Floor {kind.ground}"
									/>
									<span class="text-sm text-stone-700"
										>{getTileset(kind.sheet).label} · {kind.count}</span
									>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="mt-6" aria-label="Walls">
				<h2 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Walls</h2>
				<p class="mt-1 text-sm text-stone-600">
					Blocked tiles are walls. Click a wall sprite to re-skin every matching wall in this room.
					You can pick from every tileset.
				</p>
				{#if wallKinds.length === 0}
					<p class="mt-2 text-sm text-stone-500">No walls in this room.</p>
				{:else}
					<ul class="mt-3 flex flex-wrap gap-2" aria-label="Wall sprites">
						{#each wallKinds as kind (`wall-${kind.sheet}-${kind.ground}`)}
							<li>
								<button
									type="button"
									class="flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-left hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
									aria-label="Change wall sprite {kind.sheet} {kind.ground}"
									onclick={() =>
										(palettePick = {
											kind: 'wall',
											ground: kind.ground,
											sheet: kind.sheet
										})}
								>
									<SpriteTile
										sheet={getTileset(kind.sheet)}
										index={kind.ground}
										scale={2}
										label="Wall {kind.ground}"
									/>
									<span class="text-sm text-stone-700"
										>{getTileset(kind.sheet).label} · {kind.count}</span
									>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="mt-6" aria-label="Furniture">
				<h2 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Furniture</h2>
				<p class="mt-1 text-sm text-stone-600">
					Click a piece to change its sprite. Every copy of that piece in this room updates.
				</p>
				{#if furnitureKinds.length === 0}
					<p class="mt-2 text-sm text-stone-500">No furniture in this room.</p>
				{:else}
					<ul class="mt-3 flex flex-wrap gap-2" aria-label="Furniture sprites">
						{#each furnitureKinds as kind (`${kind.sheet}-${kind.frame}`)}
							<li>
								<button
									type="button"
									class="flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-left hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
									aria-label="Change furniture sprite {kind.sheet} {kind.frame}"
									onclick={() =>
										(palettePick = {
											kind: 'furniture',
											frame: kind.frame,
											sheet: kind.sheet
										})}
								>
									<SpriteTile
										sheet={getFurnitureSheet(kind.sheet)}
										index={kind.frame}
										scale={2}
										label="Furniture {kind.frame}"
									/>
									<span class="text-sm text-stone-700"
										>{getFurnitureSheet(kind.sheet).label} · {kind.count}</span
									>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</section>
	{:else}
		<section class="mt-6" aria-label="People looks">
			<p class="text-sm text-stone-600">
				Each role on the studio floor can use a different spritesheet. Tiny Creatures and Tiny
				Battle are extra CC0 packs; the original Kenney dungeon folk still work too.
			</p>
			<ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="People">
				{#each PERSON_SLOT_IDS as slotId (slotId)}
					{@const look = personLook(slotId)}
					<li>
						<button
							type="button"
							class="flex min-h-11 w-full items-center gap-3 rounded-lg border border-stone-300 bg-white px-3 py-2 text-left hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
							aria-label="Edit {PERSON_SLOT_LABELS[slotId]}"
							onclick={() => (selectedPerson = slotId)}
						>
							<SpriteTile
								sheet={getPeopleSheet(look.sheetId)}
								index={look.frame}
								scale={3}
								label="{PERSON_SLOT_LABELS[slotId]} preview"
							/>
							<span>
								<span class="block font-medium text-stone-800">{PERSON_SLOT_LABELS[slotId]}</span>
								<span class="block text-xs text-stone-500"
									>{getPeopleSheet(look.sheetId).label}</span
								>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

{#if selectedTile}
	<TileEditMenu
		tx={selectedTile.tx}
		ty={selectedTile.ty}
		{draft}
		onchange={editSelected}
		onclose={() => (selectedTile = null)}
	/>
{/if}

{#if palettePick?.kind === 'wall'}
	<SpritePicker
		title="Change walls"
		dialogLabel="Change wall sprite"
		sheets={groundPickerSheets}
		selectedSheetId={palettePick.sheet}
		selectedIndex={palettePick.ground}
		onpick={pickPaletteSprite}
		onclose={() => (palettePick = null)}
	/>
{/if}

{#if palettePick?.kind === 'floor'}
	<SpritePicker
		title="Change floors"
		dialogLabel="Change floor sprite"
		sheets={groundPickerSheets}
		selectedSheetId={palettePick.sheet}
		selectedIndex={palettePick.ground}
		onpick={pickPaletteSprite}
		onclose={() => (palettePick = null)}
	/>
{/if}

{#if palettePick?.kind === 'furniture'}
	<SpritePicker
		title="Change furniture"
		dialogLabel="Change furniture sprite"
		sheets={furniturePickerSheets}
		selectedSheetId={palettePick.sheet}
		selectedIndex={palettePick.frame}
		onpick={pickPaletteSprite}
		onclose={() => (palettePick = null)}
	/>
{/if}

{#if selectedPerson}
	<PersonEditMenu
		slotId={selectedPerson}
		look={personLook(selectedPerson)}
		onchange={editPerson}
		onclose={() => (selectedPerson = null)}
		onreset={resetCurrentPerson}
	/>
{/if}
