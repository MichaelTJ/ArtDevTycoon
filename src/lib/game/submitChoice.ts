import type { Artwork } from '$lib/types/contracts';

/** Which image the player submits for critique after generation finishes. */
export type SubmitChoice = 'drawing' | 'ai';

/**
 * Picks the artwork `imageUrl` that should be critiqued and shown in results.
 * Drawing wins only when the player chose it and exported a non-null data URL.
 */
export function artworkForSubmitChoice(
	artwork: Artwork,
	aiImageUrl: string,
	choice: SubmitChoice,
	drawingDataUrl: string | null
): Artwork {
	const imageUrl = choice === 'drawing' && drawingDataUrl ? drawingDataUrl : aiImageUrl;
	return { ...artwork, imageUrl };
}

/** Encode a PNG sketch blob as a data URL (works in Node tests and the browser). */
export async function blobToDataUrl(blob: Blob): Promise<string> {
	const buffer = await blob.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]!);
	}
	const base64 = btoa(binary);
	return `data:${blob.type || 'image/png'};base64,${base64}`;
}
