import { describe, expect, it } from 'vitest';
import {
	computeAffordabilityBadges,
	hasAffordableGalleryUnlock,
	hasAffordableStaffHire,
	hasAffordableTeamHire,
	hasAffordableToolkitUnlock,
	type AffordabilityBadgeInput
} from './affordabilityBadges';

const baseInput: AffordabilityBadgeInput = {
	cash: 0,
	reputation: 0,
	unlockedMediumTierIds: ['crayon'],
	unlockedVenueId: 'fridge',
	unlockedLayoutIds: ['cluttered'],
	ownedAtmosphereIds: [],
	hiredStaffIds: [],
	hiredArtistCatalogIds: []
};

describe('hasAffordableToolkitUnlock', () => {
	it('returns true when a locked tier meets cash and reputation', () => {
		expect(
			hasAffordableToolkitUnlock({
				...baseInput,
				cash: 15,
				reputation: 3
			})
		).toBe(true);
	});

	it('returns false when cash is short', () => {
		expect(
			hasAffordableToolkitUnlock({
				...baseInput,
				cash: 14,
				reputation: 3
			})
		).toBe(false);
	});

	it('returns false when reputation is short', () => {
		expect(
			hasAffordableToolkitUnlock({
				...baseInput,
				cash: 15,
				reputation: 2
			})
		).toBe(false);
	});

	it('returns false when every tier is already owned', () => {
		expect(
			hasAffordableToolkitUnlock({
				...baseInput,
				cash: 9999,
				reputation: 99,
				unlockedMediumTierIds: ['crayon', 'pencil', 'ink', 'watercolor', 'acrylic', 'oil']
			})
		).toBe(false);
	});
});

describe('hasAffordableGalleryUnlock', () => {
	it('returns true for the next venue when affordable', () => {
		expect(
			hasAffordableGalleryUnlock({
				...baseInput,
				cash: 30,
				reputation: 4
			})
		).toBe(true);
	});

	it('returns false when only a later venue would be affordable, not the next one', () => {
		expect(
			hasAffordableGalleryUnlock({
				...baseInput,
				cash: 500,
				reputation: 3,
				unlockedLayoutIds: ['cluttered', 'tidy-rows', 'salon-hang', 'grid-gallery', 'minimalist'],
				ownedAtmosphereIds: [
					'gallery-lighting',
					'ambient-music',
					'velvet-ropes',
					'climate-control',
					'wine-reception'
				]
			})
		).toBe(false);
	});

	it('returns true for an unowned layout when cash is enough', () => {
		expect(
			hasAffordableGalleryUnlock({
				...baseInput,
				cash: 300,
				reputation: 0
			})
		).toBe(true);
	});

	it('returns true for an unowned atmosphere item when cash is enough', () => {
		expect(
			hasAffordableGalleryUnlock({
				...baseInput,
				cash: 350,
				reputation: 0
			})
		).toBe(true);
	});
});

describe('hasAffordableStaffHire', () => {
	it('returns true when an unhired role meets hire gates', () => {
		expect(
			hasAffordableStaffHire({
				...baseInput,
				cash: 1500,
				reputation: 5
			})
		).toBe(true);
	});

	it('returns false when cash is short', () => {
		expect(
			hasAffordableStaffHire({
				...baseInput,
				cash: 1499,
				reputation: 5
			})
		).toBe(false);
	});

	it('returns false when every role is hired', () => {
		expect(
			hasAffordableStaffHire({
				...baseInput,
				cash: 9999,
				reputation: 99,
				hiredStaffIds: ['apprentice', 'print-shop', 'marketing-director', 'curator']
			})
		).toBe(false);
	});
});

describe('hasAffordableTeamHire', () => {
	it('returns true when a catalog artist can be hired', () => {
		expect(
			hasAffordableTeamHire({
				...baseInput,
				cash: 45,
				reputation: 4
			})
		).toBe(true);
	});

	it('returns false when reputation is short', () => {
		expect(
			hasAffordableTeamHire({
				...baseInput,
				cash: 45,
				reputation: 3
			})
		).toBe(false);
	});

	it('returns false when every artist is already hired', () => {
		expect(
			hasAffordableTeamHire({
				...baseInput,
				cash: 9999,
				reputation: 99,
				hiredArtistCatalogIds: ['jade-ink', 'sam-storyboard', 'riley-render']
			})
		).toBe(false);
	});
});

describe('computeAffordabilityBadges', () => {
	it('maps each menu independently', () => {
		expect(
			computeAffordabilityBadges({
				...baseInput,
				cash: 1500,
				reputation: 8
			})
		).toEqual({
			toolkit: true,
			gallery: true,
			staff: true,
			team: true
		});
	});

	it('clears all badges when nothing is affordable', () => {
		expect(computeAffordabilityBadges(baseInput)).toEqual({
			toolkit: false,
			gallery: false,
			staff: false,
			team: false
		});
	});
});
