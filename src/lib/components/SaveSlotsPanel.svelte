<script lang="ts">
	import type { SaveSlotId, SaveSlotListItem } from '$lib/game';

	interface Props {
		slots: ReadonlyArray<SaveSlotListItem>;
		activeId: SaveSlotId;
		/** True when a commission is in flight — switch confirms abandon. */
		busy?: boolean;
		onswitch: (id: SaveSlotId) => void;
		onnew: (id: SaveSlotId) => void;
		ondelete: (id: SaveSlotId) => void;
		onrename: (id: SaveSlotId, name: string) => void;
		oncopy: (from: SaveSlotId, to: SaveSlotId) => void;
		onclose: () => void;
	}

	let {
		slots,
		activeId,
		busy = false,
		onswitch,
		onnew,
		ondelete,
		onrename,
		oncopy,
		onclose
	}: Props = $props();

	type ConfirmKind = 'switch' | 'delete' | 'new' | 'copy';

	let confirmKind = $state<ConfirmKind | null>(null);
	let confirmSlotId = $state<SaveSlotId | null>(null);
	let copyFromId = $state<SaveSlotId | null>(null);
	let renamingId = $state<SaveSlotId | null>(null);
	let renameDraft = $state('');

	function slotLabel(slot: SaveSlotListItem): string {
		if (slot.empty || !slot.summary) return 'Empty';
		return `$${slot.summary.cash} · Rep ${slot.summary.reputation} · ${slot.summary.lifetimeCommissions} commissions`;
	}

	function requestSwitch(id: SaveSlotId): void {
		if (id === activeId) return;
		if (busy) {
			confirmKind = 'switch';
			confirmSlotId = id;
			return;
		}
		onswitch(id);
	}

	function requestDelete(id: SaveSlotId): void {
		confirmKind = 'delete';
		confirmSlotId = id;
	}

	function requestNew(id: SaveSlotId): void {
		const slot = slots.find((s) => s.id === id);
		if (slot && !slot.empty) {
			confirmKind = 'new';
			confirmSlotId = id;
			return;
		}
		onnew(id);
	}

	function startCopy(from: SaveSlotId): void {
		copyFromId = from;
		confirmKind = 'copy';
		confirmSlotId = null;
	}

	function requestCopyTo(to: SaveSlotId): void {
		if (copyFromId === null || copyFromId === to) return;
		const target = slots.find((s) => s.id === to);
		if (target && !target.empty) {
			confirmSlotId = to;
			return;
		}
		oncopy(copyFromId, to);
		closeConfirm();
	}

	function confirmAction(): void {
		if (confirmKind === 'switch' && confirmSlotId) {
			onswitch(confirmSlotId);
		} else if (confirmKind === 'delete' && confirmSlotId) {
			ondelete(confirmSlotId);
		} else if (confirmKind === 'new' && confirmSlotId) {
			onnew(confirmSlotId);
		} else if (confirmKind === 'copy' && copyFromId && confirmSlotId) {
			oncopy(copyFromId, confirmSlotId);
		}
		closeConfirm();
	}

	function closeConfirm(): void {
		confirmKind = null;
		confirmSlotId = null;
		copyFromId = null;
	}

	function beginRename(slot: SaveSlotListItem): void {
		renamingId = slot.id;
		renameDraft = slot.name;
	}

	function commitRename(): void {
		if (renamingId === null) return;
		onrename(renamingId, renameDraft);
		renamingId = null;
		renameDraft = '';
	}

	function cancelRename(): void {
		renamingId = null;
		renameDraft = '';
	}

	const confirmTitle = $derived.by(() => {
		if (confirmKind === 'switch') return 'Switch save slot?';
		if (confirmKind === 'delete') return 'Delete this save?';
		if (confirmKind === 'new') return 'Start a new game?';
		if (confirmKind === 'copy') {
			return confirmSlotId ? 'Overwrite destination slot?' : 'Copy to…';
		}
		return '';
	});

	const confirmMessage = $derived.by(() => {
		if (confirmKind === 'switch') {
			return 'Switching abandons the current commission.';
		}
		if (confirmKind === 'delete') {
			return 'This slot will be cleared. This cannot be undone.';
		}
		if (confirmKind === 'new') {
			return 'This overwrites the existing save in this slot.';
		}
		if (confirmKind === 'copy' && confirmSlotId) {
			return 'The destination slot already has a save and will be overwritten.';
		}
		return '';
	});
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Save slots"
>
	<div
		class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-xl font-bold text-stone-800">Save slots</h2>
				<p class="mt-1 text-sm text-stone-500">
					Three local runs. Switching reloads meta-progress and returns to idle.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close save slots"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		<ul class="mt-5 space-y-3" aria-label="Save slot list">
			{#each slots as slot (slot.id)}
				<li class="rounded-lg border border-stone-200 p-3" aria-label={`Save slot ${slot.name}`}>
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							{#if renamingId === slot.id}
								<label class="block text-sm font-medium text-stone-700">
									<span class="sr-only">Rename {slot.name}</span>
									<input
										class="min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
										aria-label={`Rename ${slot.name}`}
										maxlength="24"
										bind:value={renameDraft}
									/>
								</label>
								<div class="mt-2 flex flex-wrap gap-2">
									<button
										type="button"
										class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
										aria-label={`Save name for ${slot.name}`}
										onclick={commitRename}
									>
										Save name
									</button>
									<button
										type="button"
										class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
										aria-label={`Cancel rename for ${slot.name}`}
										onclick={cancelRename}
									>
										Cancel
									</button>
								</div>
							{:else}
								<div class="flex flex-wrap items-center gap-2">
									<p class="text-base font-semibold text-stone-800">{slot.name}</p>
									{#if slot.id === activeId}
										<span
											class="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
										>
											Active
										</span>
									{/if}
								</div>
								<p class="mt-1 text-sm text-stone-600">{slotLabel(slot)}</p>
							{/if}
						</div>
					</div>

					{#if renamingId !== slot.id}
						<div class="mt-3 flex flex-wrap gap-2">
							<button
								type="button"
								class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
								aria-label={`Switch to ${slot.name}`}
								disabled={slot.id === activeId}
								onclick={() => requestSwitch(slot.id)}
							>
								Switch
							</button>
							<button
								type="button"
								class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
								aria-label={`New game in ${slot.name}`}
								onclick={() => requestNew(slot.id)}
							>
								New game
							</button>
							<button
								type="button"
								class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
								aria-label={`Rename ${slot.name}`}
								onclick={() => beginRename(slot)}
							>
								Rename
							</button>
							<button
								type="button"
								class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
								aria-label={`Copy ${slot.name}`}
								disabled={slot.empty}
								onclick={() => startCopy(slot.id)}
							>
								Copy to…
							</button>
							<button
								type="button"
								class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
								aria-label={`Delete ${slot.name}`}
								disabled={slot.empty && slot.id !== activeId}
								onclick={() => requestDelete(slot.id)}
							>
								Delete
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</div>

{#if confirmKind}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4"
		role="dialog"
		aria-modal="true"
		aria-label={confirmTitle}
	>
		<div class="w-full max-w-md rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
			<h3 class="text-lg font-semibold text-stone-800">{confirmTitle}</h3>
			{#if confirmMessage}
				<p class="mt-2 text-sm text-stone-600">{confirmMessage}</p>
			{/if}

			{#if confirmKind === 'copy' && !confirmSlotId}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each slots as slot (slot.id)}
						<button
							type="button"
							class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
							aria-label={`Copy to ${slot.name}`}
							disabled={slot.id === copyFromId}
							onclick={() => requestCopyTo(slot.id)}
						>
							{slot.name}{slot.empty ? ' (empty)' : ''}
						</button>
					{/each}
				</div>
				<div class="mt-4 flex justify-end">
					<button
						type="button"
						class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						aria-label="Cancel copy"
						onclick={closeConfirm}
					>
						Cancel
					</button>
				</div>
			{:else}
				<div class="mt-4 flex flex-wrap justify-end gap-2">
					<button
						type="button"
						class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						aria-label="Cancel"
						onclick={closeConfirm}
					>
						Cancel
					</button>
					<button
						type="button"
						class="min-h-11 rounded-lg border border-amber-700 bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						aria-label="Confirm"
						onclick={confirmAction}
					>
						Confirm
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
