<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import type { DevModeReason } from '$lib/dev/devMode';

	interface Props {
		enabled: boolean;
		reason: DevModeReason;
		cash: number;
		reputation: number;
		lifetimeCommissions: number;
		draftPrompt: string;
		modifiedPrompt: string;
		onclose: () => void;
		onsetcash: (n: number) => void;
		onsetreputation: (n: number) => void;
		onsetcommissions: (n: number) => void;
		onunlockall: () => void;
		onforceidle: () => void;
		/** Parent should copy to clipboard; return value fills the export textarea. */
		onexport: () => string;
		onimport: (raw: string) => void;
		onlatch: () => void;
		onclearlatch: () => void;
		/** Spec 22: open SaveSlotsPanel without duplicating slot UI. */
		onopensaves?: () => void;
	}

	let {
		enabled,
		reason,
		cash,
		reputation,
		lifetimeCommissions,
		draftPrompt,
		modifiedPrompt,
		onclose,
		onsetcash,
		onsetreputation,
		onsetcommissions,
		onunlockall,
		onforceidle,
		onexport,
		onimport,
		onlatch,
		onclearlatch,
		onopensaves
	}: Props = $props();

	// Mount-time seed only (panel is created when Dev opens).
	let cashInput = $state(untrack(() => String(cash)));
	let repInput = $state(untrack(() => String(reputation)));
	let commissionsInput = $state(untrack(() => String(lifetimeCommissions)));
	let importRaw = $state('');
	let exportText = $state('');

	function applyNumber(raw: string, apply: (n: number) => void): void {
		const n = Number(raw);
		if (!Number.isFinite(n)) return;
		apply(n);
	}
</script>

{#if enabled}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Developer tools"
	>
		<div
			class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
		>
			<div class="flex items-start justify-between gap-3">
				<div>
					<h2 class="text-xl font-bold text-stone-800">Developer tools</h2>
					<p class="mt-1 text-sm text-stone-500">Local cheats only — never ships to players.</p>
				</div>
				<button
					type="button"
					class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					aria-label="Close developer tools"
					onclick={onclose}
				>
					Close
				</button>
			</div>

			<section class="mt-5 space-y-3" aria-label="Status">
				<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Status</h3>
				<p class="text-sm text-stone-700">
					Reason:
					<span
						class="ml-1 inline-block rounded border border-stone-300 bg-stone-100 px-2 py-0.5 font-mono text-xs text-stone-800"
						data-testid="dev-reason"
					>
						{reason}
					</span>
				</p>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						onclick={onlatch}
					>
						Keep enabled
					</button>
					<button
						type="button"
						class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						onclick={onclearlatch}
					>
						Disable &amp; clear
					</button>
					{#if onopensaves}
						<button
							type="button"
							class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
							onclick={onopensaves}
						>
							Open saves
						</button>
					{/if}
					<a
						class="inline-flex min-h-11 items-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
						href={resolve('/studio-editor')}
					>
						Studio editor
					</a>
				</div>
			</section>

			<section class="mt-6 space-y-3" aria-label="Economy">
				<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Economy</h3>
				<label class="block text-sm text-stone-700">
					Cash
					<input
						type="number"
						class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
						bind:value={cashInput}
					/>
				</label>
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
					onclick={() => applyNumber(cashInput, onsetcash)}
				>
					Apply cash
				</button>
				<label class="block text-sm text-stone-700">
					Reputation
					<input
						type="number"
						class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
						bind:value={repInput}
					/>
				</label>
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
					onclick={() => applyNumber(repInput, onsetreputation)}
				>
					Apply reputation
				</button>
				<label class="block text-sm text-stone-700">
					Lifetime commissions
					<input
						type="number"
						class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
						bind:value={commissionsInput}
					/>
				</label>
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
					onclick={() => applyNumber(commissionsInput, onsetcommissions)}
				>
					Apply commissions
				</button>
			</section>

			<section class="mt-6 space-y-3" aria-label="Unlock">
				<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Unlock all</h3>
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
					onclick={onunlockall}
				>
					Unlock all progression
				</button>
			</section>

			<section class="mt-6 space-y-3" aria-label="Commission">
				<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Commission</h3>
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
					onclick={onforceidle}
				>
					Force idle
				</button>
			</section>

			<section class="mt-6 space-y-3" aria-label="Prompt peek">
				<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Prompt peek</h3>
				<p
					class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
					role="status"
				>
					Dev only — players never see this.
				</p>
				<label class="block text-sm text-stone-700">
					Player draft
					<textarea
						class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs"
						rows="2"
						readonly
						value={draftPrompt}></textarea>
				</label>
				<label class="block text-sm text-stone-700">
					Modified prompt
					<textarea
						class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs"
						rows="4"
						readonly
						data-testid="dev-modified-prompt"
						value={modifiedPrompt}></textarea>
				</label>
			</section>

			<section class="mt-6 space-y-3" aria-label="Save IO">
				<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Save IO</h3>
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
					onclick={() => {
						exportText = onexport();
					}}
				>
					Export save
				</button>
				<textarea
					class="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs"
					rows="4"
					aria-label="Exported save JSON"
					bind:value={exportText}
					data-testid="dev-export-area"></textarea>
				<label class="block text-sm text-stone-700">
					Import JSON
					<textarea
						class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs"
						rows="4"
						bind:value={importRaw}
						aria-label="Import save JSON"></textarea>
				</label>
				<button
					type="button"
					class="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
					onclick={() => onimport(importRaw)}
				>
					Apply import
				</button>
			</section>

			<section class="mt-6 space-y-2" aria-label="Studio">
				<h3 class="text-sm font-semibold tracking-wide text-stone-500 uppercase">Studio</h3>
				<p class="text-sm text-stone-600">
					Talk / Deliver appear on the floor HUD while Dev mode is on.
				</p>
			</section>
		</div>
	</div>
{/if}
