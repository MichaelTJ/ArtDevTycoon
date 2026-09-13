import type { GalleryEntry } from '$lib/types/contracts';

/**
 * Neighbor in `entries` (display order). Wraps. `null` when length < 2 or
 * `currentId` is missing.
 */
export function adjacentGalleryEntry(
	entries: readonly GalleryEntry[],
	currentId: string,
	delta: -1 | 1
): GalleryEntry | null {
	if (entries.length < 2) return null;
	const i = entries.findIndex((entry) => entry.id === currentId);
	if (i < 0) return null;
	return entries[(i + delta + entries.length) % entries.length] ?? null;
}
