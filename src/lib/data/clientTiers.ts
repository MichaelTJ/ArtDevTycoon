import type { ClientTier } from '$lib/types/contracts';

export interface ClientTierInfo {
	id: ClientTier;
	name: string;
	tagline: string;
	requiredReputation: number;
	/** Tailwind class fragment, e.g. 'bg-amber-100 text-amber-900'. */
	badgeColor: string;
	icon: string;
}

export const CLIENT_TIER_INFO: readonly ClientTierInfo[] = [
	{
		id: 'walk-in',
		name: 'Local Walk-in',
		tagline: 'Simple asks, small budgets.',
		requiredReputation: 0,
		badgeColor: 'bg-stone-100 text-stone-700',
		icon: '🚶'
	},
	{
		id: 'corporate',
		name: 'Corporate Buyer',
		tagline: 'On-brand, or not at all.',
		requiredReputation: 12,
		badgeColor: 'bg-blue-100 text-blue-900',
		icon: '💼'
	},
	{
		id: 'billionaire',
		name: 'Eccentric Billionaire',
		tagline: 'Money is no object. Neither is sense.',
		requiredReputation: 30,
		badgeColor: 'bg-purple-100 text-purple-900',
		icon: '🎩'
	},
	{
		id: 'auction-house',
		name: 'Auction House',
		tagline: 'No price tag. Just a gavel.',
		requiredReputation: 50,
		badgeColor: 'bg-rose-100 text-rose-900',
		icon: '🔨'
	}
] as const;

export function getClientTierInfo(tier: ClientTier): ClientTierInfo {
	return CLIENT_TIER_INFO.find((t) => t.id === tier) ?? CLIENT_TIER_INFO[0];
}

/** Every tier the player currently qualifies for, always including `walk-in`. */
export function unlockedClientTiers(reputation: number): ClientTier[] {
	return CLIENT_TIER_INFO.filter((t) => reputation >= t.requiredReputation).map((t) => t.id);
}
