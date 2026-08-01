<script lang="ts">
	import type { AudioPrefs } from '$lib/audio';

	interface Props {
		prefs: AudioPrefs;
		onchange: (patch: Partial<Omit<AudioPrefs, 'version'>>) => void;
		onclose: () => void;
	}

	let { prefs, onchange, onclose }: Props = $props();

	function pct(n: number): string {
		return `${Math.round(n * 100)}%`;
	}

	function onMaster(e: Event) {
		const value = Number((e.currentTarget as HTMLInputElement).value);
		onchange({ masterVolume: value });
	}

	function onMusic(e: Event) {
		const value = Number((e.currentTarget as HTMLInputElement).value);
		onchange({ musicVolume: value });
	}

	function onSfx(e: Event) {
		const value = Number((e.currentTarget as HTMLInputElement).value);
		onchange({ sfxVolume: value });
	}

	function onMute(e: Event) {
		const checked = (e.currentTarget as HTMLInputElement).checked;
		onchange({ muted: checked });
	}
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Audio"
>
	<div
		class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-xl font-bold text-stone-800">Audio</h2>
				<p class="mt-1 text-sm text-stone-500">
					Music starts quiet. Raise Music after your first click.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close audio"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		<label class="mt-5 flex min-h-11 items-center gap-3 text-sm font-medium text-stone-800">
			<input
				type="checkbox"
				class="size-4 rounded border-stone-300 text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				checked={prefs.muted}
				onchange={onMute}
			/>
			Mute all
		</label>

		<div class="mt-5 space-y-5">
			<label class="block">
				<span class="flex items-center justify-between text-sm font-medium text-stone-800">
					<span>Master</span>
					<span class="text-stone-500 tabular-nums">{pct(prefs.masterVolume)}</span>
				</span>
				<input
					type="range"
					class="mt-2 w-full accent-amber-700"
					min="0"
					max="1"
					step="0.05"
					value={prefs.masterVolume}
					aria-label="Master"
					disabled={prefs.muted}
					oninput={onMaster}
				/>
			</label>

			<label class="block">
				<span class="flex items-center justify-between text-sm font-medium text-stone-800">
					<span>Music</span>
					<span class="text-stone-500 tabular-nums">{pct(prefs.musicVolume)}</span>
				</span>
				<input
					type="range"
					class="mt-2 w-full accent-amber-700"
					min="0"
					max="1"
					step="0.05"
					value={prefs.musicVolume}
					aria-label="Music"
					disabled={prefs.muted}
					oninput={onMusic}
				/>
			</label>

			<label class="block">
				<span class="flex items-center justify-between text-sm font-medium text-stone-800">
					<span>Sound effects</span>
					<span class="text-stone-500 tabular-nums">{pct(prefs.sfxVolume)}</span>
				</span>
				<input
					type="range"
					class="mt-2 w-full accent-amber-700"
					min="0"
					max="1"
					step="0.05"
					value={prefs.sfxVolume}
					aria-label="Sound effects"
					disabled={prefs.muted}
					oninput={onSfx}
				/>
			</label>
		</div>
	</div>
</div>
