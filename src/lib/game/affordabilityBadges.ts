/**
 * Playtest P17 — which menu buttons should show an affordability notification badge.
 * Mirrors unlock eligibility in ToolkitShop, GalleryUpgradeShop, StaffOffice, and TeamRoster.
 */

import { ARTIST_CATALOG, canHireArtist } from '$lib/data/artists';
import { ATMOSPHERE_ITEMS } from '$lib/data/galleryAtmosphere';
import { canUnlockLayout, GALLERY_LAYOUTS } from '$lib/data/galleryLayouts';
import { canUnlockVenue, GALLERY_VENUES } from '$lib/data/galleryVenues';
import { canUnlockMediumTier, MEDIUM_TIERS } from '$lib/data/mediumTiers';
import { canHireStaff, STAFF_ROLES } from '$lib/data/staffRoles';

export type AffordabilityMenu = 'toolkit' | 'gallery' | 'staff' | 'team';

/** Economy + unlock snapshot needed to evaluate menu badges. */
export interface AffordabilityBadgeInput {
	cash: number;
	reputation: number;
	unlockedMediumTierIds: readonly string[];
	unlockedVenueId: string;
	unlockedLayoutIds: readonly string[];
	ownedAtmosphereIds: readonly string[];
	hiredStaffIds: readonly string[];
	hiredArtistCatalogIds: readonly string[];
}

export interface AffordabilityBadges {
	toolkit: boolean;
	gallery: boolean;
	staff: boolean;
	team: boolean;
}

/** True when at least one locked medium tier meets cash and reputation gates. */
export function hasAffordableToolkitUnlock(input: AffordabilityBadgeInput): boolean {
	for (const tier of MEDIUM_TIERS) {
		if (input.unlockedMediumTierIds.includes(tier.id)) continue;
		if (canUnlockMediumTier(tier, { cash: input.cash, reputation: input.reputation })) {
			return true;
		}
	}
	return false;
}

/** True when the next venue, a layout, or an atmosphere item can be bought now. */
export function hasAffordableGalleryUnlock(input: AffordabilityBadgeInput): boolean {
	const venueIndex = GALLERY_VENUES.findIndex((v) => v.id === input.unlockedVenueId);
	const nextVenue = venueIndex >= 0 ? GALLERY_VENUES[venueIndex + 1] : undefined;
	if (nextVenue && canUnlockVenue(nextVenue, { cash: input.cash, reputation: input.reputation })) {
		return true;
	}

	for (const layout of GALLERY_LAYOUTS) {
		if (input.unlockedLayoutIds.includes(layout.id)) continue;
		if (canUnlockLayout(layout, input.cash)) return true;
	}

	for (const item of ATMOSPHERE_ITEMS) {
		if (input.ownedAtmosphereIds.includes(item.id)) continue;
		if (input.cash >= item.cost) return true;
	}

	return false;
}

/** True when at least one unhired staff role meets hire gates. */
export function hasAffordableStaffHire(input: AffordabilityBadgeInput): boolean {
	for (const role of STAFF_ROLES) {
		if (input.hiredStaffIds.includes(role.id)) continue;
		if (canHireStaff(role, { cash: input.cash, reputation: input.reputation })) {
			return true;
		}
	}
	return false;
}

/** True when at least one catalog artist can be hired now. */
export function hasAffordableTeamHire(input: AffordabilityBadgeInput): boolean {
	for (const entry of ARTIST_CATALOG) {
		if (
			canHireArtist(entry, {
				cash: input.cash,
				reputation: input.reputation,
				hiredCatalogIds: input.hiredArtistCatalogIds
			})
		) {
			return true;
		}
	}
	return false;
}

/** Returns per-menu badge flags for Toolkit, Gallery, Staff, and Team. */
export function computeAffordabilityBadges(input: AffordabilityBadgeInput): AffordabilityBadges {
	return {
		toolkit: hasAffordableToolkitUnlock(input),
		gallery: hasAffordableGalleryUnlock(input),
		staff: hasAffordableStaffHire(input),
		team: hasAffordableTeamHire(input)
	};
}
