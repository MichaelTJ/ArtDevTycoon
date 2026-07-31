/**
 * Gallery entries are persisted in localStorage. Janus/SD-Turbo expose ephemeral
 * `blob:` object URLs that die with the document — convert those to `data:` URLs
 * before banking so fridge magnets survive a reload.
 */

function bytesToBase64(bytes: Uint8Array): string {
	const chunkSize = 0x8000;
	let binary = '';
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	const type = blob.type || 'application/octet-stream';
	return `data:${type};base64,${bytesToBase64(bytes)}`;
}

/**
 * Returns a URL that can be stored and reloaded. Non-blob URLs (mock `data:` SVGs,
 * static paths) pass through unchanged. On failure, returns the original URL so a
 * flaky encode never blocks collecting cash.
 */
export async function ensureDurableImageUrl(imageUrl: string): Promise<string> {
	if (!imageUrl.startsWith('blob:')) {
		return imageUrl;
	}

	try {
		const response = await fetch(imageUrl);
		if (!response.ok) {
			return imageUrl;
		}
		const blob = await response.blob();
		return await blobToDataUrl(blob);
	} catch {
		return imageUrl;
	}
}
