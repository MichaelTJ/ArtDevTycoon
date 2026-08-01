import { GALLERY_VENUES } from '$lib/data/galleryVenues';

/** Hireable named artist from the catalog (spec 24 — parallel to spec 16 staff roles). */
export interface ArtistCatalogEntry {
	id: string;
	name: string;
	/** Emoji portrait for MVP UI; future: sprite key. */
	portrait: string;
	tagline: string;
	specialisms: readonly string[];
	hireCost: number;
	requiredReputation: number;
}

export const ARTIST_CATALOG: readonly ArtistCatalogEntry[] = [
	{
		id: 'jade-ink',
		name: 'Jade Ink',
		portrait: '🖊️',
		tagline: 'Bold lines, louder colours — comics and posters.',
		specialisms: ['comics', 'character'],
		hireCost: 45,
		requiredReputation: 4
	},
	{
		id: 'sam-storyboard',
		name: 'Sam Storyboard',
		portrait: '🎬',
		tagline: 'Frames a scene before you finish the sentence.',
		specialisms: ['animation', 'layout'],
		hireCost: 60,
		requiredReputation: 6
	},
	{
		id: 'riley-render',
		name: 'Riley Render',
		portrait: '✨',
		tagline: 'Polished stills for fussy clients.',
		specialisms: ['illustration', 'character'],
		hireCost: 75,
		requiredReputation: 8
	}
] as const;

const VENUE_ORDER = GALLERY_VENUES.map((v) => v.id);

/** Receptionist desk unlocks once the player has garage or better (not fridge-only). */
export function receptionistUnlocked(unlockedVenueId: string): boolean {
	const idx = VENUE_ORDER.indexOf(unlockedVenueId);
	const garageIdx = VENUE_ORDER.indexOf('garage');
	return idx >= 0 && garageIdx >= 0 && idx >= garageIdx;
}

export function getArtistCatalogEntry(id: string): ArtistCatalogEntry | undefined {
	return ARTIST_CATALOG.find((a) => a.id === id);
}

export function canHireArtist(
	entry: ArtistCatalogEntry,
	state: { cash: number; reputation: number; hiredCatalogIds: readonly string[] }
): boolean {
	if (state.hiredCatalogIds.includes(entry.id)) return false;
	return state.cash >= entry.hireCost && state.reputation >= entry.requiredReputation;
}
