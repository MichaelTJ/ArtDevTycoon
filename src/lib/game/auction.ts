export interface AuctionResult {
	bidderCount: number;
	bids: number[];
	winningBid: number;
}

/**
 * `qualityScore` is the mean of accuracy and creativity (0-10, i.e. `toGalleryScore`'s
 * input scale before its rounding). More bidders show up, and each bids higher, as
 * quality rises — but every bid keeps a random +/-30% wobble so the same score never
 * pays exactly the same twice.
 *
 * Unlike `calculatePayout`, the winning bid is **not** clamped to the brief budget —
 * `reservePrice` is only a floor.
 */
export function resolveAuction(
	qualityScore: number,
	reservePrice: number,
	random: () => number = Math.random
): AuctionResult {
	const bidderCount = 3 + Math.floor(qualityScore / 2); // 3 at score 0, 8 at score 10
	const bids: number[] = [];
	for (let i = 0; i < bidderCount; i++) {
		const base = reservePrice * (0.5 + (qualityScore / 10) * 1.5); // 0.5x–2.0x reserve
		const wobble = 0.8 + random() * 0.6; // 0.8x–1.4x
		bids.push(Math.round(base * wobble));
	}
	const winningBid = Math.max(reservePrice, ...bids);
	return { bidderCount, bids, winningBid };
}
