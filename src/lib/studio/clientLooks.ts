export interface ClientLook {
	/** Frame index in the `clients` (or future `clients` expanded) sheet. */
	frame: number;
	/** `null` means clearTint / no tint. */
	tint: number | null;
}

/**
 * Map ClientBrief.tier id → presentation. Unknown → walk-in look.
 * Exact ids: walk-in | corporate | billionaire | auction-house
 * (Proposal “neighbour” === walk-in in this codebase.)
 */
export function clientLookForTier(tier: string): ClientLook {
	switch (tier) {
		case 'corporate':
			return { frame: 0, tint: 0x7a9cc4 };
		case 'billionaire':
			return { frame: 0, tint: 0xb48cff };
		case 'auction-house':
			return { frame: 0, tint: 0xc47878 };
		case 'walk-in':
		default:
			return { frame: 0, tint: null };
	}
}
