import { clientBriefSchema, type ClientBrief } from '$lib/types/contracts';
import { z } from 'zod';

/** Abstract, high-budget commissions unlocked at reputation 30. */
export const BILLIONAIRE_BRIEFS: readonly ClientBrief[] = z.array(clientBriefSchema).parse([
	{
		id: 'bil-1',
		clientName: 'Reclusive Tech Founder',
		avatarUrl: '/avatars/c2.svg',
		requestText:
			'Paint me the feeling of a Tuesday. You have complete creative freedom. Do not disappoint me.',
		budget: 1400,
		preferredKeywords: ['tuesday', 'feeling', 'ordinary'],
		tier: 'billionaire'
	},
	{
		id: 'bil-2',
		clientName: 'Countess of Nowhere',
		avatarUrl: '/avatars/c4.svg',
		requestText:
			'I want a staircase that climbs forever into a sky that refuses to end. Make the infinite feel intimate.',
		budget: 1800,
		preferredKeywords: ['staircase', 'infinite', 'sky'],
		tier: 'billionaire'
	},
	{
		id: 'bil-3',
		clientName: 'Sleep-Deprived Magnate',
		avatarUrl: '/avatars/c6.svg',
		requestText: 'Show me a clock melting into a river of calendars. Time should look exhausted.',
		budget: 1600,
		preferredKeywords: ['clock', 'river', 'time'],
		tier: 'billionaire'
	},
	{
		id: 'bil-4',
		clientName: 'Anxious Philanthropist',
		avatarUrl: '/avatars/c3.svg',
		requestText:
			'Capture the feeling of anxiety as architecture — tight corridors that never quite meet.',
		budget: 1200,
		preferredKeywords: ['anxiety', 'corridor', 'tight'],
		tier: 'billionaire'
	},
	{
		id: 'bil-5',
		clientName: 'Dream Syndicate Chair',
		avatarUrl: '/avatars/c5.svg',
		requestText:
			'A room where every door opens onto the same room. Dream logic only. No explanations.',
		budget: 2000,
		preferredKeywords: ['door', 'room', 'dream'],
		tier: 'billionaire'
	}
]);
