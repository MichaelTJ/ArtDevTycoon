import { type BrushProfile, getBrushProfile } from '$lib/data/brushProfiles';

export type { BrushProfile };
export { getBrushProfile };

/** Clamp slider size through the profile multiplier. */
export function effectiveBrushSize(sliderSize: number, profile: BrushProfile): number {
	const scaled = sliderSize * profile.sizeMultiplier;
	return Math.min(profile.maxSize, Math.max(profile.minSize, scaled));
}

/** Apply medium-specific stroke style before `lineTo` / `stroke`. */
export function applyBrushStrokeStyle(
	ctx: CanvasRenderingContext2D,
	profile: BrushProfile,
	color: string,
	sliderSize: number
): void {
	const size = effectiveBrushSize(sliderSize, profile);
	ctx.globalCompositeOperation = profile.compositeOperation;
	ctx.globalAlpha = profile.opacity;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.lineWidth = size;
	ctx.strokeStyle = color;
	ctx.shadowBlur = profile.softEdge;
	ctx.shadowColor = profile.softEdge > 0 ? color : 'transparent';
}

/** Restore neutral canvas state after a brush stroke segment. */
export function resetBrushContext(ctx: CanvasRenderingContext2D): void {
	ctx.globalAlpha = 1;
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'transparent';
	ctx.globalCompositeOperation = 'source-over';
}

/**
 * Deterministic grain stamp for crayon — seeded by pointer position so tests replay
 * the same dot pattern.
 */
export function stampCrayonGrain(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color: string,
	seed: number
): void {
	const dots = 3 + (Math.abs(seed) % 3);
	for (let i = 0; i < dots; i++) {
		const angle = (seed + i * 17) * 0.17;
		const radius = size * 0.14 * (((seed + i * 7) % 5) / 5 + 0.2);
		const dx = Math.cos(angle) * radius;
		const dy = Math.sin(angle) * radius;
		const prevAlpha = ctx.globalAlpha;
		ctx.globalAlpha = 0.12 + ((seed + i * 3) % 4) * 0.06;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(x + dx, y + dy, Math.max(0.6, size * 0.07), 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = prevAlpha;
	}
}

/** Ink bleed — slightly wider dot when the stroke ends. */
export function stampInkBleed(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	profile: BrushProfile,
	color: string,
	sliderSize: number
): void {
	const base = effectiveBrushSize(sliderSize, profile);
	const radius = (base * profile.bleedMultiplier) / 2;
	ctx.save();
	ctx.globalCompositeOperation = profile.compositeOperation;
	ctx.globalAlpha = profile.opacity * 0.55;
	ctx.fillStyle = color;
	ctx.shadowBlur = 0;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

/** Integer seed from canvas coordinates — stable for a given pointer position. */
export function grainSeed(x: number, y: number): number {
	return Math.round(x * 13 + y * 7);
}
