import { describe, expect, it } from 'vitest';
import type { Artwork } from '$lib/types/contracts';
import { artworkForSubmitChoice, blobToDataUrl } from './submitChoice';

const baseArtwork: Artwork = {
	id: 'art-1',
	imageUrl: 'data:image/svg+xml,ai',
	playerPrompt: 'a cat',
	width: 384,
	height: 384,
	generationMs: 1,
	engineId: 'mock'
};

describe('artworkForSubmitChoice', () => {
	it('keeps the AI image when choice is ai', () => {
		const result = artworkForSubmitChoice(
			baseArtwork,
			'data:image/svg+xml,ai',
			'ai',
			'data:image/png;base64,abc'
		);
		expect(result.imageUrl).toBe('data:image/svg+xml,ai');
	});

	it('uses the drawing data URL when choice is drawing', () => {
		const drawing = 'data:image/png;base64,abc';
		const result = artworkForSubmitChoice(baseArtwork, 'data:image/svg+xml,ai', 'drawing', drawing);
		expect(result.imageUrl).toBe(drawing);
	});

	it('falls back to AI when drawing choice has no data URL', () => {
		const result = artworkForSubmitChoice(baseArtwork, 'data:image/svg+xml,ai', 'drawing', null);
		expect(result.imageUrl).toBe('data:image/svg+xml,ai');
	});
});

describe('blobToDataUrl', () => {
	it('encodes a PNG blob as a data URL', async () => {
		const blob = new Blob([Uint8Array.from([137, 80, 78, 71])], { type: 'image/png' });
		const url = await blobToDataUrl(blob);
		expect(url.startsWith('data:image/png;base64,')).toBe(true);
	});
});
