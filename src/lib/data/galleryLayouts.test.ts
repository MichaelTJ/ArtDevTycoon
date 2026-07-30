import { describe, expect, it } from 'vitest';
import { GALLERY_LAYOUTS, canUnlockLayout, getLayout, DEFAULT_LAYOUT_ID } from './galleryLayouts';

describe('GALLERY_LAYOUTS', () => {
	it('has exactly five layouts', () => {
		expect(GALLERY_LAYOUTS).toHaveLength(5);
	});

	it('has strictly increasing cost and curation multiplier', () => {
		for (let i = 1; i < GALLERY_LAYOUTS.length; i++) {
			const prev = GALLERY_LAYOUTS[i - 1];
			const curr = GALLERY_LAYOUTS[i];
			expect(curr.unlockCost).toBeGreaterThan(prev.unlockCost);
			expect(curr.curationMultiplier).toBeGreaterThan(prev.curationMultiplier);
		}
	});

	it('defaults to cluttered corkboard', () => {
		expect(DEFAULT_LAYOUT_ID).toBe('cluttered');
		expect(GALLERY_LAYOUTS[0].id).toBe('cluttered');
	});
});

describe('getLayout', () => {
	it('returns the matching layout', () => {
		expect(getLayout('minimalist').gridClassName).toBe('layout-minimalist');
	});

	it('falls back to cluttered for unknown ids', () => {
		expect(getLayout('nope').id).toBe('cluttered');
	});
});

describe('canUnlockLayout', () => {
	const tidy = getLayout('tidy-rows');

	it('returns true when cash meets the cost', () => {
		expect(canUnlockLayout(tidy, 300)).toBe(true);
	});

	it('returns false when cash is short', () => {
		expect(canUnlockLayout(tidy, 299)).toBe(false);
	});

	it('allows the free cluttered layout at zero cash', () => {
		expect(canUnlockLayout(getLayout('cluttered'), 0)).toBe(true);
	});
});
