<script lang="ts">
	import { getBrushProfile } from '$lib/data/brushProfiles';
	import { DEFAULT_MEDIUM_TIER_ID } from '$lib/data/mediumTiers';
	import {
		applyBrushStrokeStyle,
		grainSeed,
		resetBrushContext,
		stampCrayonGrain,
		stampInkBleed
	} from '$lib/game/brushStroke';

	interface Props {
		disabled?: boolean;
		hasStrokes?: boolean;
		/** Spec 13 medium tier — drives brush feel (Spec 25b). */
		mediumTierId?: string;
		onexportready?: (getBlob: () => Promise<Blob | null>) => void;
	}

	let {
		disabled = false,
		hasStrokes = $bindable(false),
		mediumTierId = DEFAULT_MEDIUM_TIER_ID,
		onexportready
	}: Props = $props();

	const CANVAS_CSS = 384;
	const PALETTE = [
		'#1c1917',
		'#ffffff',
		'#dc2626',
		'#ea580c',
		'#ca8a04',
		'#16a34a',
		'#2563eb',
		'#7c3aed'
	] as const;

	type Tool = 'brush' | 'eraser';

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let tool = $state<Tool>('brush');
	let brushSize = $state(8);
	let color = $state('#1c1917');
	let drawing = $state(false);
	let lastX = $state(0);
	let lastY = $state(0);

	const brushProfile = $derived(getBrushProfile(mediumTierId));

	const undoStack: ImageData[] = [];
	const MAX_UNDO = 20;

	/** Size + white fill once when the canvas element mounts — never tied to callback identity. */
	$effect(() => {
		const canvas = canvasEl;
		if (!canvas) {
			return;
		}
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}
		const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
		canvas.width = Math.round(CANVAS_CSS * dpr);
		canvas.height = Math.round(CANVAS_CSS * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, CANVAS_CSS, CANVAS_CSS);
		hasStrokes = false;
		undoStack.length = 0;
	});

	/** Re-register exporter when the parent callback changes without wiping strokes. */
	$effect(() => {
		const canvas = canvasEl;
		const register = onexportready;
		if (!canvas || !register) {
			return;
		}
		const getBlob = async (): Promise<Blob | null> => {
			if (!hasStrokes) {
				return null;
			}
			return new Promise((resolve) => {
				canvas.toBlob((blob) => resolve(blob), 'image/png');
			});
		};
		register(getBlob);
	});

	function ctx2d(): CanvasRenderingContext2D | null {
		return canvasEl?.getContext('2d') ?? null;
	}

	function pushUndo(): void {
		const ctx = ctx2d();
		const canvas = canvasEl;
		if (!ctx || !canvas) {
			return;
		}
		const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
		undoStack.push(snapshot);
		if (undoStack.length > MAX_UNDO) {
			undoStack.shift();
		}
	}

	function pointerPos(event: PointerEvent): { x: number; y: number } {
		const canvas = canvasEl!;
		const rect = canvas.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * CANVAS_CSS;
		const y = ((event.clientY - rect.top) / rect.height) * CANVAS_CSS;
		return { x, y };
	}

	function configureEraser(ctx: CanvasRenderingContext2D): void {
		resetBrushContext(ctx);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.lineWidth = brushSize;
		ctx.globalCompositeOperation = 'destination-out';
		ctx.strokeStyle = 'rgba(0,0,0,1)';
	}

	function strokeBrushSegment(ctx: CanvasRenderingContext2D, x: number, y: number): void {
		applyBrushStrokeStyle(ctx, brushProfile, color, brushSize);
		ctx.lineTo(x, y);
		ctx.stroke();
		if (brushProfile.grain) {
			stampCrayonGrain(ctx, x, y, brushSize, color, grainSeed(x, y));
		}
		resetBrushContext(ctx);
	}

	function onPointerDown(event: PointerEvent): void {
		if (disabled) {
			return;
		}
		const ctx = ctx2d();
		if (!ctx || !canvasEl) {
			return;
		}
		pushUndo();
		canvasEl.setPointerCapture(event.pointerId);
		drawing = true;
		hasStrokes = true;
		const { x, y } = pointerPos(event);
		lastX = x;
		lastY = y;
		ctx.beginPath();
		ctx.moveTo(x, y);
		if (tool === 'eraser') {
			configureEraser(ctx);
		} else {
			applyBrushStrokeStyle(ctx, brushProfile, color, brushSize);
		}
		ctx.lineTo(x + 0.01, y + 0.01);
		ctx.stroke();
		if (tool === 'brush' && brushProfile.grain) {
			stampCrayonGrain(ctx, x, y, brushSize, color, grainSeed(x, y));
		}
		resetBrushContext(ctx);
	}

	function onPointerMove(event: PointerEvent): void {
		if (!drawing || disabled) {
			return;
		}
		const ctx = ctx2d();
		if (!ctx) {
			return;
		}
		const { x, y } = pointerPos(event);
		if (tool === 'eraser') {
			configureEraser(ctx);
			ctx.lineTo(x, y);
			ctx.stroke();
			resetBrushContext(ctx);
		} else {
			strokeBrushSegment(ctx, x, y);
		}
		lastX = x;
		lastY = y;
	}

	function onPointerUp(event: PointerEvent): void {
		if (!drawing) {
			return;
		}
		drawing = false;
		canvasEl?.releasePointerCapture(event.pointerId);
		const ctx = ctx2d();
		if (!ctx) {
			return;
		}
		if (tool === 'brush' && brushProfile.bleedOnLift) {
			stampInkBleed(ctx, lastX, lastY, brushProfile, color, brushSize);
		}
		resetBrushContext(ctx);
	}

	function clearCanvas(): void {
		const ctx = ctx2d();
		if (!ctx || disabled) {
			return;
		}
		pushUndo();
		resetBrushContext(ctx);
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, CANVAS_CSS, CANVAS_CSS);
		hasStrokes = false;
	}

	function undo(): void {
		const ctx = ctx2d();
		const canvas = canvasEl;
		const prev = undoStack.pop();
		if (!ctx || !canvas || !prev || disabled) {
			return;
		}
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.putImageData(prev, 0, 0);
		const dpr = canvas.width / CANVAS_CSS;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const sample = ctx.getImageData(0, 0, canvas.width, canvas.height);
		hasStrokes = !sample.data.every((v, i) => i % 4 === 3 || v >= 250);
		resetBrushContext(ctx);
	}
</script>

<div class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm" aria-label="Sketch pad">
	<p class="mb-2 text-base font-medium text-stone-800">Optional sketch</p>
	<p class="mb-3 text-sm text-stone-600">
		Optional sketch — rough shapes help My PC refine. Brush feel follows your painting medium.
	</p>

	<div class="mb-3 flex flex-wrap items-center gap-2">
		<div
			class="inline-flex rounded-lg border border-stone-300 p-0.5"
			role="group"
			aria-label="Tool"
		>
			<button
				type="button"
				class="min-h-10 rounded-md px-3 text-sm font-medium {tool === 'brush'
					? 'bg-amber-600 text-white'
					: 'bg-transparent text-stone-700 hover:bg-stone-100'}"
				aria-pressed={tool === 'brush'}
				{disabled}
				onclick={() => {
					tool = 'brush';
				}}
			>
				Brush
			</button>
			<button
				type="button"
				class="min-h-10 rounded-md px-3 text-sm font-medium {tool === 'eraser'
					? 'bg-amber-600 text-white'
					: 'bg-transparent text-stone-700 hover:bg-stone-100'}"
				aria-pressed={tool === 'eraser'}
				{disabled}
				onclick={() => {
					tool = 'eraser';
				}}
			>
				Eraser
			</button>
		</div>

		<label class="flex items-center gap-2 text-sm text-stone-700">
			Size
			<input
				type="range"
				min="2"
				max="40"
				bind:value={brushSize}
				{disabled}
				aria-label="Brush size"
				class="w-28"
			/>
			<span class="w-6 text-stone-500 tabular-nums">{brushSize}</span>
		</label>

		<button
			type="button"
			class="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
			disabled={disabled || undoStack.length === 0}
			onclick={undo}
		>
			Undo
		</button>
		<button
			type="button"
			class="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
			{disabled}
			onclick={clearCanvas}
		>
			Clear
		</button>
	</div>

	<div class="mb-3 flex flex-wrap items-center gap-2" aria-label="Colour">
		{#each PALETTE as swatch (swatch)}
			<button
				type="button"
				class="h-8 w-8 rounded-full border border-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				style="background-color: {swatch}"
				aria-label="Colour {swatch}"
				aria-pressed={color === swatch}
				{disabled}
				onclick={() => {
					color = swatch;
					tool = 'brush';
				}}
			></button>
		{/each}
		<label class="flex items-center gap-2 text-sm text-stone-700">
			Custom
			<input
				type="color"
				bind:value={color}
				{disabled}
				aria-label="Custom colour"
				class="h-8 w-10 cursor-pointer rounded border border-stone-300 bg-white"
				oninput={() => {
					tool = 'brush';
				}}
			/>
		</label>
	</div>

	<canvas
		bind:this={canvasEl}
		width={CANVAS_CSS}
		height={CANVAS_CSS}
		class="max-w-full touch-none rounded-lg border border-stone-300 bg-white {disabled
			? 'cursor-not-allowed opacity-60'
			: 'cursor-crosshair'}"
		style="width: {CANVAS_CSS}px; height: {CANVAS_CSS}px;"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		aria-label="Sketch canvas"
	></canvas>
</div>
