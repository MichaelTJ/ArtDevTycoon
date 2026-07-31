/**
 * Derives HUD / ProgressPanel meters toward the next career gates (spec 20).
 */

import { CLIENT_TIER_INFO } from '$lib/data/clientTiers';
import { GALLERY_VENUES } from '$lib/data/galleryVenues';
import { MEDIUM_TIERS } from '$lib/data/mediumTiers';
import { STAFF_ROLES } from '$lib/data/staffRoles';

export type UnlockTrack = 'reputation' | 'cash' | 'commissions';

export interface NextUnlock {
	track: UnlockTrack;
	/** e.g. "Garage Wall", "Corporate Buyer", "Level cash goal" */
	label: string;
	/** Current resource amount. */
	current: number;
	/** Threshold to clear this gate. */
	target: number;
	/** 0–1, clamped. */
	fill: number;
	/** Short hint: "4 more reputation" / "$120 more" / "2 more commissions". */
	remainingLabel: string;
}

export interface ProgressionSnapshot {
	cash: number;
	reputation: number;
	commissionsCompleted: number;
	targetCash: number;
	targetCommissions: number;
	unlockedVenueId: string;
	unlockedMediumTierIds: readonly string[];
	hiredStaffIds: readonly string[];
}

interface RepGate {
	label: string;
	requiredReputation: number;
}

function clamp01(n: number): number {
	if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
	return Math.min(1, Math.max(0, n));
}

function meter(
	track: UnlockTrack,
	label: string,
	current: number,
	target: number,
	remainingLabel: string
): NextUnlock {
	const safeTarget = Math.max(0, target);
	const fill = safeTarget <= 0 ? 1 : clamp01(current / safeTarget);
	return { track, label, current, target: safeTarget, fill, remainingLabel };
}

function remainingRepLabel(current: number, target: number): string {
	const need = Math.max(0, target - current);
	if (need === 0) return 'Unlocked';
	return `${need} more reputation`;
}

function remainingCashLabel(current: number, target: number): string {
	const need = Math.max(0, target - current);
	if (need === 0) return 'Goal reached';
	return `$${need} more`;
}

function remainingCommissionLabel(current: number, target: number): string {
	const need = Math.max(0, target - current);
	if (need === 0) return 'Goal reached';
	return `${need} more commission${need === 1 ? '' : 's'}`;
}

/** Locked reputation gates still ahead of the player. */
export function lockedReputationGates(state: ProgressionSnapshot): RepGate[] {
	const gates: RepGate[] = [];

	const venueIndex = GALLERY_VENUES.findIndex((v) => v.id === state.unlockedVenueId);
	const nextVenue = venueIndex >= 0 ? GALLERY_VENUES[venueIndex + 1] : undefined;
	if (nextVenue && nextVenue.requiredReputation > state.reputation) {
		gates.push({ label: nextVenue.name, requiredReputation: nextVenue.requiredReputation });
	}

	for (const tier of MEDIUM_TIERS) {
		if (state.unlockedMediumTierIds.includes(tier.id)) continue;
		if (tier.requiredReputation > state.reputation) {
			gates.push({ label: tier.name, requiredReputation: tier.requiredReputation });
		}
	}

	for (const tier of CLIENT_TIER_INFO) {
		if (tier.requiredReputation > state.reputation) {
			gates.push({ label: tier.name, requiredReputation: tier.requiredReputation });
		}
	}

	for (const role of STAFF_ROLES) {
		if (state.hiredStaffIds.includes(role.id)) continue;
		if (role.requiredReputation > state.reputation) {
			gates.push({ label: role.name, requiredReputation: role.requiredReputation });
		}
	}

	return gates;
}

/**
 * Returns career meters for the HUD / ProgressPanel.
 * Reputation picks the locked gate with the lowest requiredReputation still above current.
 */
export function buildProgressMeters(state: ProgressionSnapshot): {
	commissions: NextUnlock;
	cash: NextUnlock;
	reputation: NextUnlock;
} {
	const commissions = meter(
		'commissions',
		'Commissions',
		state.commissionsCompleted,
		state.targetCommissions,
		remainingCommissionLabel(state.commissionsCompleted, state.targetCommissions)
	);

	const cash = meter(
		'cash',
		'Cash goal',
		state.cash,
		state.targetCash,
		remainingCashLabel(state.cash, state.targetCash)
	);

	const gates = lockedReputationGates(state);
	gates.sort((a, b) => a.requiredReputation - b.requiredReputation);
	const next = gates[0];

	const reputation = next
		? meter(
				'reputation',
				next.label,
				state.reputation,
				next.requiredReputation,
				remainingRepLabel(state.reputation, next.requiredReputation)
			)
		: meter(
				'reputation',
				'Max prestige',
				state.reputation,
				Math.max(state.reputation, 1),
				'Max prestige'
			);

	return { commissions, cash, reputation };
}
