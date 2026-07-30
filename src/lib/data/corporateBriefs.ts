import { clientBriefSchema, type ClientBrief } from '$lib/types/contracts';
import { z } from 'zod';

/** Three corporate series (9 briefs) that share a palette and must play out in order. */
export const CORPORATE_BRIEFS: readonly ClientBrief[] = z.array(clientBriefSchema).parse([
	{
		id: 'corp-1a',
		clientName: 'Meridian Bank',
		avatarUrl: '/avatars/c1.svg',
		requestText: 'We need lobby art: a skyline at dusk. Keep it navy and gold, like our logo.',
		budget: 280,
		preferredKeywords: ['skyline', 'dusk', 'city'],
		tier: 'corporate',
		seriesId: 'corp-1',
		seriesPosition: 1,
		paletteConstraint: ['navy', 'gold', 'cream']
	},
	{
		id: 'corp-1b',
		clientName: 'Meridian Bank',
		avatarUrl: '/avatars/c1.svg',
		requestText:
			'Conference-room piece: a confident handshake over a contract. Same navy, gold, cream palette.',
		budget: 300,
		preferredKeywords: ['handshake', 'contract', 'office'],
		tier: 'corporate',
		seriesId: 'corp-1',
		seriesPosition: 2,
		paletteConstraint: ['navy', 'gold', 'cream']
	},
	{
		id: 'corp-1c',
		clientName: 'Meridian Bank',
		avatarUrl: '/avatars/c1.svg',
		requestText:
			'Executive suite closer: an abstract vault door catching morning light. Stay on brand.',
		budget: 320,
		preferredKeywords: ['vault', 'door', 'light'],
		tier: 'corporate',
		seriesId: 'corp-1',
		seriesPosition: 3,
		paletteConstraint: ['navy', 'gold', 'cream']
	},
	{
		id: 'corp-2a',
		clientName: 'Verdant Foods Co.',
		avatarUrl: '/avatars/c3.svg',
		requestText:
			'Cafeteria mural kickoff: a fresh farm stand at sunrise. Stay in sage, terracotta, and cream.',
		budget: 260,
		preferredKeywords: ['farm', 'stand', 'sunrise'],
		tier: 'corporate',
		seriesId: 'corp-2',
		seriesPosition: 1,
		paletteConstraint: ['sage', 'terracotta', 'cream']
	},
	{
		id: 'corp-2b',
		clientName: 'Verdant Foods Co.',
		avatarUrl: '/avatars/c3.svg',
		requestText:
			'Packaging hero art: a overflowing fruit basket. Same sage, terracotta, cream family.',
		budget: 290,
		preferredKeywords: ['fruit', 'basket', 'fresh'],
		tier: 'corporate',
		seriesId: 'corp-2',
		seriesPosition: 2,
		paletteConstraint: ['sage', 'terracotta', 'cream']
	},
	{
		id: 'corp-2c',
		clientName: 'Verdant Foods Co.',
		avatarUrl: '/avatars/c3.svg',
		requestText: 'Lobby finale: a long harvest table set for a feast. Keep the palette locked.',
		budget: 340,
		preferredKeywords: ['harvest', 'table', 'feast'],
		tier: 'corporate',
		seriesId: 'corp-2',
		seriesPosition: 3,
		paletteConstraint: ['sage', 'terracotta', 'cream']
	},
	{
		id: 'corp-3a',
		clientName: 'Northwind Transit',
		avatarUrl: '/avatars/c5.svg',
		requestText:
			'Station entrance: a streamlined train cutting through fog. Charcoal, silver, and ice-blue only.',
		budget: 270,
		preferredKeywords: ['train', 'fog', 'station'],
		tier: 'corporate',
		seriesId: 'corp-3',
		seriesPosition: 1,
		paletteConstraint: ['charcoal', 'silver', 'ice-blue']
	},
	{
		id: 'corp-3b',
		clientName: 'Northwind Transit',
		avatarUrl: '/avatars/c5.svg',
		requestText:
			'Platform poster: a conductor checking a pocket watch. Same charcoal, silver, ice-blue.',
		budget: 310,
		preferredKeywords: ['conductor', 'watch', 'platform'],
		tier: 'corporate',
		seriesId: 'corp-3',
		seriesPosition: 2,
		paletteConstraint: ['charcoal', 'silver', 'ice-blue']
	},
	{
		id: 'corp-3c',
		clientName: 'Northwind Transit',
		avatarUrl: '/avatars/c5.svg',
		requestText:
			'Boardroom closer: tracks vanishing toward a distant horizon. Stay on the transit palette.',
		budget: 350,
		preferredKeywords: ['tracks', 'horizon', 'distance'],
		tier: 'corporate',
		seriesId: 'corp-3',
		seriesPosition: 3,
		paletteConstraint: ['charcoal', 'silver', 'ice-blue']
	}
]);
