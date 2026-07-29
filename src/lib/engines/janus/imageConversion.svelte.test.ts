import { describe, expect, it } from 'vitest';
import { bitmapToObjectUrl, rawImageToBitmap } from './imageConversion';

describe('rawImageToBitmap', () => {
	it('converts a 2×2 RGB buffer to a 2×2 ImageBitmap', async () => {
		const data = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0]);
		const bitmap = await rawImageToBitmap({ data, width: 2, height: 2, channels: 3 });
		expect(bitmap.width).toBe(2);
		expect(bitmap.height).toBe(2);
		bitmap.close();
	});

	it('round-trips a 4-channel buffer unchanged in dimensions', async () => {
		const data = new Uint8ClampedArray([
			255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 128, 128, 128, 255
		]);
		const bitmap = await rawImageToBitmap({ data, width: 2, height: 2, channels: 4 });
		expect(bitmap.width).toBe(2);
		expect(bitmap.height).toBe(2);
		bitmap.close();
	});
});

describe('bitmapToObjectUrl', () => {
	it('returns a blob URL string', async () => {
		const canvas = new OffscreenCanvas(2, 2);
		const ctx = canvas.getContext('2d');
		ctx?.fillRect(0, 0, 2, 2);
		const bitmap = await canvas.transferToImageBitmap();
		const url = await bitmapToObjectUrl(bitmap);
		expect(url.startsWith('blob:')).toBe(true);
		URL.revokeObjectURL(url);
	});
});
