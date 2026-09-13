/** Minimal pixel buffer shape (avoids depending on DOM `ImageData` in Node tests). */
export type SketchPixelBuffer = { data: ArrayLike<number> };

/**
 * Fraction of pixels that are opaque and not near-white.
 * `threshold` matches isSketchBlank (default 250).
 */
export function paintCoverage01(data: SketchPixelBuffer, threshold = 250): number {
	const { data: pixels } = data;
	const pixelCount = Math.floor(pixels.length / 4);
	if (pixelCount <= 0) return 0;
	let painted = 0;
	for (let i = 0; i < pixels.length; i += 4) {
		const a = pixels[i + 3];
		if (a === undefined || a === 0) continue;
		const r = pixels[i];
		const g = pixels[i + 1];
		const b = pixels[i + 2];
		if (
			r !== undefined &&
			g !== undefined &&
			b !== undefined &&
			(r < threshold || g < threshold || b < threshold)
		) {
			painted += 1;
		}
	}
	return painted / pixelCount;
}

/**
 * True if every pixel is near-white (or fully transparent).
 * Used to detect empty sketch bitmaps when stroke tracking is unavailable.
 */
export function isSketchBlank(data: SketchPixelBuffer, threshold = 250): boolean {
	const { data: pixels } = data;
	for (let i = 0; i < pixels.length; i += 4) {
		const r = pixels[i]!;
		const g = pixels[i + 1]!;
		const b = pixels[i + 2]!;
		const a = pixels[i + 3]!;
		if (a === 0) {
			continue;
		}
		if (r < threshold || g < threshold || b < threshold) {
			return false;
		}
	}
	return true;
}
