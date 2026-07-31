import { ROOMS, type RoomDef, type RoomId } from './rooms';

/** Maps progressive gallery venue → floor plan. Unknown → fridge kitchen. */
export function roomIdForVenue(venueId: string): RoomId {
	switch (venueId) {
		case 'garage':
			return 'art-room';
		case 'storefront':
			return 'studio';
		case 'gallery-hall':
			return 'gallery';
		case 'mega-museum':
			return 'mega-museum';
		case 'fridge':
		default:
			return 'home-kitchen';
	}
}

/** Full authored RoomDef for the active venue (not the Level environment stub). */
export function getRoomForVenue(venueId: string): RoomDef {
	return ROOMS[roomIdForVenue(venueId)];
}
