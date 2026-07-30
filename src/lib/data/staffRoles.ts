/**
 * Hireable staff / automation roles (spec 16). Independent and stackable — hiring one
 * never replaces another.
 */

export interface StaffRole {
	id: string;
	name: string;
	tagline: string;
	hireCost: number;
	requiredReputation: number;
	/** Cash earned per real-world second while hired. 0 for roles with no direct income. */
	incomePerSecond: number;
	/**
	 * Divides the delay before a new client auto-arrives while idle. 1 = no effect.
	 * Only one role in the current roster sets this above 1.
	 */
	autoInviteSpeedMultiplier: number;
	/** If true, the gallery display auto-curates for score instead of recency/activeLayout. */
	autoCurates: boolean;
	icon: string;
}

export const STAFF_ROLES: readonly StaffRole[] = [
	{
		id: 'apprentice',
		name: 'The Apprentice',
		tagline: 'Grinds out common-tier commissions in the back room, unattended.',
		hireCost: 800,
		requiredReputation: 8,
		incomePerSecond: 0.05, // $3/min, $180/hr of idle real time
		autoInviteSpeedMultiplier: 1,
		autoCurates: false,
		icon: '🧑\u200d🎨'
	},
	{
		id: 'print-shop',
		name: 'Sell Prints Online',
		tagline: 'Your back catalogue, printed and shipped automatically.',
		hireCost: 1500,
		requiredReputation: 5,
		incomePerSecond: 0.12,
		autoInviteSpeedMultiplier: 1,
		autoCurates: false,
		icon: '📦'
	},
	{
		id: 'marketing-director',
		name: 'The Marketing Director',
		tagline: 'Foot traffic finds you now. Clients stop waiting to be invited.',
		hireCost: 2200,
		requiredReputation: 14,
		incomePerSecond: 0,
		autoInviteSpeedMultiplier: 3, // 6s base delay becomes 2s
		autoCurates: false,
		icon: '📣'
	},
	{
		id: 'curator',
		name: 'The Curator',
		tagline: 'Rehangs the whole room overnight for the best possible impression.',
		hireCost: 3000,
		requiredReputation: 18,
		incomePerSecond: 0,
		autoInviteSpeedMultiplier: 1,
		autoCurates: true,
		icon: '🗂️'
	}
] as const;

export function getStaffRole(id: string): StaffRole | undefined {
	return STAFF_ROLES.find((r) => r.id === id);
}

export function canHireStaff(
	role: StaffRole,
	state: { cash: number; reputation: number }
): boolean {
	return state.cash >= role.hireCost && state.reputation >= role.requiredReputation;
}

/** Sum of `incomePerSecond` across every hired role id. Unknown ids contribute 0. */
export function totalIncomePerSecond(hiredIds: readonly string[]): number {
	return hiredIds.reduce((sum, id) => sum + (getStaffRole(id)?.incomePerSecond ?? 0), 0);
}
