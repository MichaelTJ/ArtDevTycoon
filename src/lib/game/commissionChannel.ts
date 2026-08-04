/** How the player discovers and picks commission offers by venue (P27). */
export type CommissionChannel = 'none' | 'letterbox' | 'computer' | 'receptionist';

export function commissionChannelForVenue(unlockedVenueId: string): CommissionChannel {
	switch (unlockedVenueId) {
		case 'garage':
			return 'letterbox';
		case 'storefront':
			return 'computer';
		case 'gallery-hall':
		case 'mega-museum':
			return 'receptionist';
		default:
			return 'none';
	}
}

export function commissionBoardAvailable(unlockedVenueId: string): boolean {
	return commissionChannelForVenue(unlockedVenueId) !== 'none';
}
