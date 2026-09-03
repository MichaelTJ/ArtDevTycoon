import { overlayClientLook } from '$lib/studio-editor/apply';

export interface ClientLook {
	/** Frame index in the `clients` (or future `clients` expanded) sheet. */
	frame: number;
	/** `null` means clearTint / no tint. */
	tint: number | null;
	/** Phaser texture key when the studio editor overrides the default clients sheet. */
	spriteKey?: string;
}

/**
 * Map ClientBrief.tier id → presentation. Unknown → walk-in look.
 * Exact ids: walk-in | corporate | billionaire | auction-house
 * (Proposal “neighbour” === walk-in in this codebase.)
 */
export function clientLookForTier(tier: string): ClientLook {
	let base: ClientLook;
	switch (tier) {
		case 'corporate':
			base = { frame: 0, tint: 0x7a9cc4 };
			break;
		case 'billionaire':
			base = { frame: 0, tint: 0xb48cff };
			break;
		case 'auction-house':
			base = { frame: 0, tint: 0xc47878 };
			break;
		case 'walk-in':
		default:
			base = { frame: 0, tint: null };
			break;
	}
	return overlayClientLook(tier, base);
}
