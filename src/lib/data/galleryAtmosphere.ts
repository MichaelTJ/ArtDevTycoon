/**
 * Independently purchasable atmosphere flourishes. Each owned item adds a flat payout
 * bonus; bonuses stack. There is no "active" concept — owning is enough.
 */

export interface AtmosphereItem {
	id: string;
	name: string;
	tagline: string;
	cost: number;
	/** Flat additive bonus, e.g. 0.05 = +5%. Sums with every other owned item. */
	payoutBonus: number;
	icon: string;
}

export const ATMOSPHERE_ITEMS: readonly AtmosphereItem[] = [
	{
		id: 'gallery-lighting',
		name: 'Gallery Lighting',
		tagline: 'No more overhead fluorescents.',
		cost: 350,
		payoutBonus: 0.05,
		icon: '💡'
	},
	{
		id: 'ambient-music',
		name: 'Ambient Background Music',
		tagline: 'Something in a minor key.',
		cost: 500,
		payoutBonus: 0.05,
		icon: '🎵'
	},
	{
		id: 'velvet-ropes',
		name: 'Velvet Ropes',
		tagline: 'Nothing says "valuable" like a rope.',
		cost: 900,
		payoutBonus: 0.08,
		icon: '➰'
	},
	{
		id: 'climate-control',
		name: 'Climate Control',
		tagline: 'The paint stops sweating.',
		cost: 1200,
		payoutBonus: 0.07,
		icon: '🌡️'
	},
	{
		id: 'wine-reception',
		name: 'Opening Night Wine Reception',
		tagline: 'Everyone is more generous after a glass.',
		cost: 2000,
		payoutBonus: 0.1,
		icon: '🍷'
	}
] as const;

export function getAtmosphereItem(id: string): AtmosphereItem | undefined {
	return ATMOSPHERE_ITEMS.find((a) => a.id === id);
}

/** Sums `payoutBonus` for every id the player owns; unknown ids are ignored, not thrown on. */
export function totalAtmosphereBonus(ownedIds: readonly string[]): number {
	return ownedIds.reduce((sum, id) => sum + (getAtmosphereItem(id)?.payoutBonus ?? 0), 0);
}
