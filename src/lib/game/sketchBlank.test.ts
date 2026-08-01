import { describe, expect, it } from 'vitest';
import { isSketchBlank } from './sketchBlank';

function imageData(
	width: number,
	height: number,
	fill: [number, number, number, number]
): { data: Uint8ClampedArray; width: number; height: number } {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let i = 0; i < data.length; i += 4) {
		data[i] = fill[0];
		data[i + 1] = fill[1];
		data[i + 2] = fill[2];
		data[i + 3] = fill[3];
	}
	return { data, width, height };
}

describe('isSketchBlank', () => {
	it('returns true for all-white pixels', () => {
		expect(isSketchBlank(imageData(2, 2, [255, 255, 255, 255]))).toBe(true);
	});

	it('returns true for fully transparent pixels', () => {
		expect(isSketchBlank(imageData(2, 2, [0, 0, 0, 0]))).toBe(true);
	});

	it('returns false when a dark pixel is present', () => {
		const img = imageData(2, 2, [255, 255, 255, 255]);
		img.data[0] = 10;
		img.data[1] = 10;
		img.data[2] = 10;
		expect(isSketchBlank(img)).toBe(false);
	});
});
