/** Minimal pixel buffer shape (avoids depending on DOM `ImageData` in Node tests). */
export type SketchPixelBuffer = { data: ArrayLike<number> };

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
