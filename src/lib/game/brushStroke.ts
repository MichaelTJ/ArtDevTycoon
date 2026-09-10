import { type BrushProfile, getBrushProfile } from '$lib/data/brushProfiles';
import type { OilStrokeKind } from '$lib/data/sketchPalettes';

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

/**
 * Deterministic charcoal dust — denser, smaller specks than crayon wax so ink reads as
 * dry media rather than a hard vector pen.
 */
export function stampCharcoalGrain(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color: string,
	seed: number
): void {
	const dots = 5 + (Math.abs(seed) % 4);
	for (let i = 0; i < dots; i++) {
		const angle = (seed + i * 23) * 0.23;
		const radius = size * 0.22 * (((seed + i * 11) % 7) / 7 + 0.15);
		const dx = Math.cos(angle) * radius;
		const dy = Math.sin(angle) * radius;
		const prevAlpha = ctx.globalAlpha;
		ctx.globalAlpha = 0.18 + ((seed + i * 5) % 5) * 0.05;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(x + dx, y + dy, Math.max(0.35, size * 0.045), 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = prevAlpha;
	}
}

/** Stamp profile-appropriate grain along a stroke segment. */
export function stampBrushGrain(
	ctx: CanvasRenderingContext2D,
	profile: BrushProfile,
	x: number,
	y: number,
	sliderSize: number,
	color: string,
	seed: number
): void {
	if (!profile.grain) {
		return;
	}
	const size = effectiveBrushSize(sliderSize, profile);
	if (profile.grainStyle === 'charcoal') {
		stampCharcoalGrain(ctx, x, y, size, color, seed);
	} else {
		stampCrayonGrain(ctx, x, y, size, color, seed);
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

/** Zero-length segments fall back to a unit x-axis so stamps still have a direction. */
function strokeDirection(
	x: number,
	y: number,
	lastX: number,
	lastY: number
): { dx: number; dy: number } {
	const dx = x - lastX;
	const dy = y - lastY;
	if (Math.hypot(dx, dy) === 0) {
		return { dx: 1, dy: 0 };
	}
	return { dx, dy };
}

/**
 * Angle of last→current, plus a span that covers the segment (minSpan on a click).
 * Zero-length samples still get a short dab along the fallback +x axis.
 */
function oilSegment(
	x: number,
	y: number,
	lastX: number,
	lastY: number,
	minSpan: number
): { angle: number; span: number } {
	const { dx, dy } = strokeDirection(x, y, lastX, lastY);
	return {
		angle: Math.atan2(dy, dx),
		span: Math.max(Math.hypot(x - lastX, y - lastY), minSpan)
	};
}

/**
 * Five parallel bristle hairs along the stroke direction. Deterministic via `seed`.
 * Zero-length segments use dx=1, dy=0.
 */
export function stampOilBristle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	lastX: number,
	lastY: number,
	size: number,
	color: string,
	seed: number
): void {
	const { dx, dy } = strokeDirection(x, y, lastX, lastY);
	const hairs = 5;
	const len = Math.hypot(dx, dy) || 1;
	const nx = -dy / len;
	const ny = dx / len;
	for (let i = 0; i < hairs; i++) {
		const offset = ((i - 2) / 2) * size * 0.35;
		const jitter = ((seed + i * 11) % 5) * 0.15;
		ctx.globalAlpha = 0.35 + ((seed + i) % 3) * 0.08;
		ctx.strokeStyle = color;
		ctx.lineWidth = Math.max(0.8, size * 0.12);
		ctx.lineCap = 'butt';
		ctx.beginPath();
		ctx.moveTo(lastX + nx * offset, lastY + ny * offset);
		ctx.lineTo(x + nx * (offset + jitter), y + ny * (offset + jitter));
		ctx.stroke();
	}
}

/**
 * Flat-brush rectangle spanning last→current, rotated to the segment angle.
 * Consecutive samples join because the rect covers the whole segment, not a dab at the tip.
 */
export function stampOilFlat(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	lastX: number,
	lastY: number,
	size: number,
	color: string
): void {
	const { angle, span } = oilSegment(x, y, lastX, lastY, size * 0.35);
	const overlap = size * 0.08;
	ctx.save();
	ctx.translate(lastX, lastY);
	ctx.rotate(angle);
	ctx.fillStyle = color;
	ctx.globalAlpha = 0.92;
	ctx.fillRect(-overlap, -size * 0.45, span + overlap * 2, size * 0.9);
	ctx.restore();
}

/**
 * Palette-knife triangle spanning last→current, rotated to the segment angle.
 * Base sits on the previous point; tip on the current point so strokes join.
 */
export function stampOilKnife(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	lastX: number,
	lastY: number,
	size: number,
	color: string
): void {
	const { angle, span } = oilSegment(x, y, lastX, lastY, size * 0.4);
	const halfW = size * 0.42;
	ctx.save();
	ctx.translate(lastX, lastY);
	ctx.rotate(angle);
	ctx.fillStyle = color;
	ctx.globalAlpha = 0.88;
	ctx.beginPath();
	ctx.moveTo(0, -halfW);
	ctx.lineTo(span, 0);
	ctx.lineTo(0, halfW);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

/**
 * Dispatch an oil stamp kind. `round` is a no-op (caller uses the line stroke).
 * Unknown kinds are a no-op.
 */
export function stampOilStroke(
	ctx: CanvasRenderingContext2D,
	kind: OilStrokeKind,
	x: number,
	y: number,
	lastX: number,
	lastY: number,
	size: number,
	color: string,
	seed: number
): void {
	switch (kind) {
		case 'round':
			return;
		case 'bristle':
			stampOilBristle(ctx, x, y, lastX, lastY, size, color, seed);
			return;
		case 'flat':
			stampOilFlat(ctx, x, y, lastX, lastY, size, color);
			return;
		case 'knife':
			stampOilKnife(ctx, x, y, lastX, lastY, size, color);
			return;
		default:
			return;
	}
}
