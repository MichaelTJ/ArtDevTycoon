import { clientBriefSchema, type ClientBrief } from '$lib/types/contracts';
import { z } from 'zod';

/**
 * Auction-house briefs. `budget` is a reserve price (floor), not a payout cap —
 * `resolveAuction` decides the winning bid.
 */
export const AUCTION_BRIEFS: readonly ClientBrief[] = z.array(clientBriefSchema).parse([
	{
		id: 'auc-1',
		clientName: "Hargrove's Auction House",
		avatarUrl: '/avatars/c1.svg',
		requestText:
			'Bring us your finest current piece. We will let the room decide what it is worth.',
		budget: 200,
		preferredKeywords: ['detail', 'skill', 'composition'],
		tier: 'auction-house'
	},
	{
		id: 'auc-2',
		clientName: 'Eastbridge Galleries',
		avatarUrl: '/avatars/c2.svg',
		requestText:
			'We need a showpiece for Thursday evening. No subject brief — just excellence under the lights.',
		budget: 250,
		preferredKeywords: ['detail', 'skill', 'composition'],
		tier: 'auction-house'
	},
	{
		id: 'auc-3',
		clientName: 'The Gilded Mallet',
		avatarUrl: '/avatars/c4.svg',
		requestText: 'Submit a work that can hold a silent room. The bids will do the talking.',
		budget: 180,
		preferredKeywords: ['detail', 'skill', 'composition'],
		tier: 'auction-house'
	},
	{
		id: 'auc-4',
		clientName: 'Pavilion & Co. Auctions',
		avatarUrl: '/avatars/c6.svg',
		requestText: 'One piece. Open floor. Bring something the paddles will fight over.',
		budget: 220,
		preferredKeywords: ['detail', 'skill', 'composition'],
		tier: 'auction-house'
	}
]);
