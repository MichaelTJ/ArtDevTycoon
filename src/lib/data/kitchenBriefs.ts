import { clientBriefSchema, type AbstractnessLevel, type ClientBrief } from '$lib/types/contracts';
import { z } from 'zod';

/**
 * Mum's kitchen walk-in ladder (spec 18). Concrete paint-me-a-thing asks escalate to
 * evocative memory and pure mood as commissions accumulate.
 */
const KITCHEN_BRIEF_DEFS = [
	// --- Band 0: concrete ---
	{
		id: 'c1',
		clientName: 'Mum',
		avatarUrl: '/avatars/c1.svg',
		requestText: 'Paint me a cat.',
		budget: 100,
		preferredKeywords: ['cat'],
		abstractness: 0 as const
	},
	{
		id: 'c2',
		clientName: 'Mum',
		avatarUrl: '/avatars/c1.svg',
		requestText: 'Can you draw a nice cup of tea for the fridge?',
		budget: 110,
		preferredKeywords: ['tea', 'cup'],
		abstractness: 0 as const
	},
	{
		id: 'c3',
		clientName: 'Mum',
		avatarUrl: '/avatars/c1.svg',
		requestText: 'Paint me a sunny flower. Something cheerful.',
		budget: 120,
		preferredKeywords: ['flower', 'sun'],
		abstractness: 0 as const
	},
	{
		id: 'c7',
		clientName: 'Mum',
		avatarUrl: '/avatars/c1.svg',
		requestText: 'Draw a little bird on the windowsill.',
		budget: 100,
		preferredKeywords: ['bird', 'window'],
		abstractness: 0 as const
	},
	// --- Band 1: evocative ---
	{
		id: 'c4',
		clientName: 'Neighbour June',
		avatarUrl: '/avatars/c5.svg',
		requestText: 'Something warm from when you were little.',
		budget: 130,
		preferredKeywords: ['warm', 'little'],
		abstractness: 1 as const,
		interpretationClusters: [
			{
				id: 'childhood-summer',
				label: 'childhood summer',
				keywords: ['childhood', 'summer', 'garden', 'bicycle']
			},
			{
				id: 'kitchen-baking',
				label: 'baking with mum',
				keywords: ['baking', 'cookies', 'flour', 'apron']
			}
		]
	},
	{
		id: 'c5',
		clientName: 'Uncle Ray',
		avatarUrl: '/avatars/c6.svg',
		requestText: 'Make it feel like a rainy afternoon indoors.',
		budget: 140,
		preferredKeywords: ['rain', 'afternoon'],
		abstractness: 1 as const,
		interpretationClusters: [
			{
				id: 'window-rain',
				label: 'rain on the glass',
				keywords: ['rain', 'window', 'droplets', 'grey']
			},
			{
				id: 'sofa-book',
				label: 'curled up reading',
				keywords: ['sofa', 'book', 'blanket', 'lamp']
			}
		]
	},
	{
		id: 'c8',
		clientName: 'Cousin Priya',
		avatarUrl: '/avatars/c1.svg',
		requestText: 'I want the feeling of coming home after a long trip.',
		budget: 150,
		preferredKeywords: ['home', 'trip'],
		abstractness: 1 as const,
		interpretationClusters: [
			{
				id: 'front-door',
				label: 'key in the door',
				keywords: ['door', 'key', 'hallway', 'shoes']
			},
			{
				id: 'kitchen-light',
				label: 'kitchen light on',
				keywords: ['kitchen', 'light', 'kettle', 'table']
			}
		]
	},
	// --- Band 2: pure mood ---
	{
		id: 'c6',
		clientName: 'Mum',
		avatarUrl: '/avatars/c2.svg',
		requestText: 'I miss the old days.',
		budget: 130,
		preferredKeywords: ['miss', 'old'],
		abstractness: 2 as const,
		interpretationClusters: [
			{
				id: 'nostalgia-photo',
				label: 'a faded family photograph',
				keywords: ['photograph', 'sepia', 'album', 'faded']
			},
			{
				id: 'sunday-dinner',
				label: 'Sunday dinner table',
				keywords: ['sunday', 'dinner', 'family', 'tablecloth']
			},
			{
				id: 'vinyl-evening',
				label: 'vinyl and lamplight',
				keywords: ['vinyl', 'record', 'lamp', 'evening']
			}
		]
	},
	{
		id: 'c9',
		clientName: 'Quiet Regular',
		avatarUrl: '/avatars/c3.svg',
		requestText: 'It used to be simpler.',
		budget: 120,
		preferredKeywords: ['simple', 'used'],
		abstractness: 2 as const,
		interpretationClusters: [
			{
				id: 'empty-swing',
				label: 'empty playground swing',
				keywords: ['swing', 'playground', 'empty', 'dusk']
			},
			{
				id: 'paper-letters',
				label: 'handwritten letters',
				keywords: ['letter', 'handwriting', 'envelope', 'ink']
			}
		]
	},
	{
		id: 'c10',
		clientName: 'Night-Shift Nurse',
		avatarUrl: '/avatars/c4.svg',
		requestText: 'Paint whatever peace looks like.',
		budget: 160,
		preferredKeywords: ['peace', 'looks'],
		abstractness: 2 as const,
		interpretationClusters: [
			{
				id: 'still-lake',
				label: 'still lake at dawn',
				keywords: ['lake', 'dawn', 'still', 'mist']
			},
			{
				id: 'sleeping-cat',
				label: 'sleeping cat in a sunbeam',
				keywords: ['cat', 'sunbeam', 'sleeping', 'cushion']
			}
		]
	},
	{
		id: 'c11',
		clientName: 'Bookshop Owner',
		avatarUrl: '/avatars/c5.svg',
		requestText: "Something that feels like a memory you can't quite place.",
		budget: 140,
		preferredKeywords: ['memory', 'place'],
		abstractness: 2 as const,
		interpretationClusters: [
			{
				id: 'blurred-street',
				label: 'rain-blurred street',
				keywords: ['street', 'blur', 'rain', 'neon']
			},
			{
				id: 'attic-box',
				label: 'attic memory box',
				keywords: ['attic', 'box', 'ribbon', 'dust']
			}
		]
	},
	{
		id: 'c12',
		clientName: 'Mum',
		avatarUrl: '/avatars/c6.svg',
		requestText: 'Just… something that feels like home.',
		budget: 110,
		preferredKeywords: ['home', 'feels'],
		abstractness: 2 as const,
		interpretationClusters: [
			{
				id: 'porch-light',
				label: 'porch light left on',
				keywords: ['porch', 'light', 'night', 'welcome']
			},
			{
				id: 'worn-armchair',
				label: 'worn armchair',
				keywords: ['armchair', 'worn', 'knit', 'window']
			}
		]
	}
];

/** Parsed kitchen walk-ins; validated once at import. */
export const KITCHEN_BRIEFS: readonly ClientBrief[] = z
	.array(clientBriefSchema)
	.parse(KITCHEN_BRIEF_DEFS);

/** Highest abstractness a walk-in may have at this progress. */
export function maxWalkInAbstractness(commissionsCompleted: number): AbstractnessLevel {
	if (commissionsCompleted >= 4) return 2;
	if (commissionsCompleted >= 2) return 1;
	return 0;
}

/** Prestige briefs always eligible; walk-ins gated by abstractness vs progress. */
export function isBriefEligibleForProgress(
	brief: ClientBrief,
	commissionsCompleted: number
): boolean {
	const level = brief.abstractness ?? 0;
	if ((brief.tier ?? 'walk-in') !== 'walk-in') return true;
	return level <= maxWalkInAbstractness(commissionsCompleted);
}
