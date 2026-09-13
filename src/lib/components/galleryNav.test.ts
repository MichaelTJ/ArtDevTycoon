import { describe, expect, it } from 'vitest';
import type { GalleryEntry } from '$lib/types/contracts';
import { adjacentGalleryEntry } from './galleryNav';

function entry(id: string): GalleryEntry {
	return {
		id,
		imageUrl: `/art/${id}.png`,
		title: id,
		payout: 1,
		score: 1,
		clientName: 'Maya Chen',
		briefId: `b-${id}`,
		completedAt: 100
	};
}

describe('adjacentGalleryEntry', () => {
	const a = entry('a');
	const b = entry('b');
	const c = entry('c');
	const entries = [a, b, c];

	it('wraps next from the last entry', () => {
		expect(adjacentGalleryEntry(entries, 'c', 1)).toEqual(a);
	});

	it('wraps previous from the first entry', () => {
		expect(adjacentGalleryEntry(entries, 'a', -1)).toEqual(c);
	});

	it('steps forward from the middle', () => {
		expect(adjacentGalleryEntry(entries, 'b', 1)).toEqual(c);
	});

	it('returns null when the list is shorter than two', () => {
		expect(adjacentGalleryEntry([a], 'a', 1)).toBeNull();
	});

	it('returns null when currentId is missing', () => {
		expect(adjacentGalleryEntry([a, b], 'z', 1)).toBeNull();
	});
});
