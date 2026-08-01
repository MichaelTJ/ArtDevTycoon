/**
 * Purchasable gallery venues — capacity upgrades for how many pieces hang on the wall.
 * Strictly ordered: only the next venue after the current one can be unlocked.
 */

export interface GalleryVenue {
	id: string;
	name: string;
	tagline: string;
	/** How many gallery entries are shown on display at once. */
	capacity: number;
	unlockCost: number;
	requiredReputation: number;
	icon: string;
}

export const GALLERY_VENUES: readonly GalleryVenue[] = [
	{
		id: 'fridge',
		name: 'The Fridge',
		tagline: 'Magnets and masking tape.',
		capacity: 3,
		unlockCost: 0,
		requiredReputation: 0,
		icon: '🧲'
	},
	{
		id: 'garage',
		name: 'Garage Wall',
		tagline: 'You cleared out the car.',
		capacity: 8,
		unlockCost: 30,
		requiredReputation: 4,
		icon: '🚪'
	},
	{
		id: 'storefront',
		name: 'Storefront Window',
		tagline: 'Foot traffic finally sees your work.',
		capacity: 16,
		unlockCost: 80,
		requiredReputation: 8,
		icon: '🏪'
	},
	{
		id: 'gallery-hall',
		name: 'Downtown Gallery Hall',
		tagline: 'Real walls, real spotlights.',
		capacity: 32,
		unlockCost: 200,
		requiredReputation: 14,
		icon: '🏛️'
	},
	{
		id: 'mega-museum',
		name: 'Mega-Museum Wing',
		tagline: 'Your name is on the building.',
		capacity: 9999,
		unlockCost: 500,
		requiredReputation: 22,
		icon: '🏟️'
	}
] as const;

export const DEFAULT_VENUE_ID = GALLERY_VENUES[0].id;

export function getVenue(id: string): GalleryVenue {
	return GALLERY_VENUES.find((v) => v.id === id) ?? GALLERY_VENUES[0];
}

export function canUnlockVenue(
	venue: GalleryVenue,
	state: { cash: number; reputation: number }
): boolean {
	return state.cash >= venue.unlockCost && state.reputation >= venue.requiredReputation;
}
