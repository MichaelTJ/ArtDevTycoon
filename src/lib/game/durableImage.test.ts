import { describe, expect, it, vi } from 'vitest';
import { ensureDurableImageUrl } from './durableImage';

describe('ensureDurableImageUrl', () => {
	it('passes data URLs through unchanged', async () => {
		const url = 'data:image/svg+xml,%3Csvg/%3E';
		await expect(ensureDurableImageUrl(url)).resolves.toBe(url);
	});

	it('passes relative paths through unchanged', async () => {
		await expect(ensureDurableImageUrl('/art/1.png')).resolves.toBe('/art/1.png');
	});

	it('converts a blob URL to a data URL', async () => {
		const bytes = new Uint8Array([137, 80, 78, 71]);
		const blob = new Blob([bytes], { type: 'image/png' });
		const blobUrl = 'blob:http://localhost/test-id';

		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () => new Response(blob, { status: 200, headers: { 'Content-Type': 'image/png' } })
			)
		);

		const durable = await ensureDurableImageUrl(blobUrl);

		expect(durable.startsWith('data:image/png;base64,')).toBe(true);
		expect(fetch).toHaveBeenCalledWith(blobUrl);

		vi.unstubAllGlobals();
	});

	it('returns the original blob URL when fetch fails', async () => {
		const blobUrl = 'blob:http://localhost/missing';
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('network');
			})
		);

		await expect(ensureDurableImageUrl(blobUrl)).resolves.toBe(blobUrl);

		vi.unstubAllGlobals();
	});
});
