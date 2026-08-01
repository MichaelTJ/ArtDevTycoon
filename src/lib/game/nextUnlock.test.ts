import { describe, expect, it } from 'vitest';
import { CLIENT_TIER_INFO } from '$lib/data/clientTiers';
import { GALLERY_VENUES } from '$lib/data/galleryVenues';
import { MEDIUM_TIERS } from '$lib/data/mediumTiers';
import { STAFF_ROLES } from '$lib/data/staffRoles';
import { buildProgressMeters, type ProgressionSnapshot } from './nextUnlock';

function base(overrides: Partial<ProgressionSnapshot> = {}): ProgressionSnapshot {
	return {
		cash: 100,
		reputation: 0,
		commissionsCompleted: 0,
		targetCash: 50,
		targetCommissions: 5,
		unlockedVenueId: 'fridge',
		unlockedMediumTierIds: ['crayon'],
		hiredStaffIds: [],
		...overrides
	};
}

describe('buildProgressMeters', () => {
	it('always exposes commission and cash level goals', () => {
		const meters = buildProgressMeters(base());
		expect(meters.commissions.target).toBe(5);
		expect(meters.cash.target).toBe(50);
		expect(meters.commissions.label).toBe('Commissions');
		expect(meters.cash.label).toBe('Cash goal');
	});

	it('picks the lowest reputation gate at rep 0 (Pencil before Garage)', () => {
		const meters = buildProgressMeters(base({ reputation: 0 }));
		expect(meters.reputation.target).toBe(3);
		expect(meters.reputation.label.toLowerCase()).toContain('pencil');
	});

	it('points at Garage after Pencil is unlocked at rep 3', () => {
		const meters = buildProgressMeters(
			base({
				reputation: 3,
				unlockedMediumTierIds: ['crayon', 'pencil']
			})
		);
		expect(meters.reputation.target).toBe(4);
		expect(meters.reputation.label).toMatch(/Garage/i);
	});

	it('shows Max prestige when every reputation gate is cleared', () => {
		const meters = buildProgressMeters(
			base({
				reputation: 50,
				unlockedVenueId: GALLERY_VENUES[GALLERY_VENUES.length - 1]!.id,
				unlockedMediumTierIds: MEDIUM_TIERS.map((t) => t.id),
				hiredStaffIds: STAFF_ROLES.map((r) => r.id)
			})
		);
		// All client tiers require ≤ 50, so nothing remains locked above current.
		expect(CLIENT_TIER_INFO.every((t) => t.requiredReputation <= 50)).toBe(true);
		expect(meters.reputation.label).toBe('Max prestige');
		expect(meters.reputation.target).toBe(50);
		expect(meters.reputation.fill).toBe(1);
	});
});
