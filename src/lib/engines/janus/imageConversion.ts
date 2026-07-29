/**
 * Converts between worker-side `RawImage` payloads and main-thread display URLs.
 * Bitmap transfer uses structured cloning with transferables to avoid copying pixels.
 */

/** Minimal RawImage shape produced by Janus image generation in the worker. */
export interface RawImageLike {
	data: Uint8Array | Uint8ClampedArray;
	width: number;
	height: number;
	channels: number;
}

/**
 * Worker side: expand RGB to RGBA and build an `ImageBitmap` ready to transfer to the main thread.
 */
export async function rawImageToBitmap(image: RawImageLike): Promise<ImageBitmap> {
	const { width, height, channels } = image;
	const pixelCount = width * height;

	let rgba: Uint8ClampedArray;
	if (channels === 4) {
		rgba =
			image.data instanceof Uint8ClampedArray
				? image.data
				: new Uint8ClampedArray(image.data.buffer, image.data.byteOffset, image.data.byteLength);
	} else if (channels === 3) {
		rgba = new Uint8ClampedArray(pixelCount * 4);
		for (let i = 0; i < pixelCount; i++) {
			const src = i * 3;
			const dst = i * 4;
			rgba[dst] = image.data[src] ?? 0;
			rgba[dst + 1] = image.data[src + 1] ?? 0;
			rgba[dst + 2] = image.data[src + 2] ?? 0;
			rgba[dst + 3] = 255;
		}
	} else {
		throw new Error(`Unsupported channel count: ${channels}`);
	}

	const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
	return createImageBitmap(imageData);
}

/**
 * Main-thread side: draw a transferred bitmap onto an offscreen canvas and return a PNG object URL.
 */
export async function bitmapToObjectUrl(bitmap: ImageBitmap): Promise<string> {
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		bitmap.close();
		throw new Error('Could not acquire 2D context for bitmap conversion.');
	}

	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();

	const blob = await canvas.convertToBlob({ type: 'image/png' });
	return URL.createObjectURL(blob);
}

/**
 * Main-thread side: decode an `<img>`-ready URL back to an `ImageBitmap` for critique hand-off.
 */
export async function urlToBitmap(url: string): Promise<ImageBitmap> {
	const response = await fetch(url);
	const blob = await response.blob();
	return createImageBitmap(blob);
}
