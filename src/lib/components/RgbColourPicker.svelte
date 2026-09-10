<script lang="ts">
	import { hexFromRgb, rgbFromHex } from '$lib/data/sketchPalettes';

	interface Props {
		value: string;
		disabled?: boolean;
		onchange: (hex: string) => void;
	}

	let { value, disabled = false, onchange }: Props = $props();

	const rgb = $derived(rgbFromHex(value) ?? { r: 0, g: 0, b: 0 });

	function emitHex(hex: string): void {
		if (hex === value) {
			return;
		}
		onchange(hex);
	}

	function onWellInput(event: Event): void {
		const raw = (event.currentTarget as HTMLInputElement).value;
		const parsed = rgbFromHex(raw);
		if (!parsed) {
			return;
		}
		emitHex(hexFromRgb(parsed.r, parsed.g, parsed.b));
	}

	function onRedInput(event: Event): void {
		const r = Number((event.currentTarget as HTMLInputElement).value);
		emitHex(hexFromRgb(r, rgb.g, rgb.b));
	}

	function onGreenInput(event: Event): void {
		const g = Number((event.currentTarget as HTMLInputElement).value);
		emitHex(hexFromRgb(rgb.r, g, rgb.b));
	}

	function onBlueInput(event: Event): void {
		const b = Number((event.currentTarget as HTMLInputElement).value);
		emitHex(hexFromRgb(rgb.r, rgb.g, b));
	}
</script>

<div class="flex flex-wrap items-center gap-2" role="group" aria-label="RGB colour">
	<input
		type="color"
		aria-label="Colour well"
		class="h-8 w-10 cursor-pointer rounded border border-stone-300 bg-white disabled:cursor-not-allowed disabled:opacity-50"
		{value}
		{disabled}
		oninput={onWellInput}
	/>
	<label class="flex items-center gap-1 text-sm text-stone-700">
		Red
		<input
			type="number"
			min="0"
			max="255"
			step="1"
			aria-label="Red"
			class="w-16 rounded border border-stone-300 px-1 py-1 text-sm tabular-nums disabled:opacity-50"
			value={rgb.r}
			{disabled}
			oninput={onRedInput}
			onchange={onRedInput}
		/>
	</label>
	<label class="flex items-center gap-1 text-sm text-stone-700">
		Green
		<input
			type="number"
			min="0"
			max="255"
			step="1"
			aria-label="Green"
			class="w-16 rounded border border-stone-300 px-1 py-1 text-sm tabular-nums disabled:opacity-50"
			value={rgb.g}
			{disabled}
			oninput={onGreenInput}
			onchange={onGreenInput}
		/>
	</label>
	<label class="flex items-center gap-1 text-sm text-stone-700">
		Blue
		<input
			type="number"
			min="0"
			max="255"
			step="1"
			aria-label="Blue"
			class="w-16 rounded border border-stone-300 px-1 py-1 text-sm tabular-nums disabled:opacity-50"
			value={rgb.b}
			{disabled}
			oninput={onBlueInput}
			onchange={onBlueInput}
		/>
	</label>
</div>
