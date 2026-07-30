/** Which spatial scene skin and gallery metaphor a level uses. */
export type EnvironmentId = 'home-kitchen' | 'art-room' | 'studio' | 'gallery';

/** Visual and copy configuration for a level's room scene. */
export interface EnvironmentConfig {
	id: EnvironmentId;
	levelId: number;
	/** Shown in the HUD and page title instead of LEVEL_1.name from contracts. */
	levelDisplayName: string;
	/** Short line on placeholder scenes, e.g. "Level 2 — coming soon". */
	tagline: string;
	workspaceLabel: string;
	galleryLabel: string;
	emptyGalleryMessage: string;
	idleMessage: string;
	loadingMessages: string[];
	critiqueMessages: string[];
	winMessage: string;
}

export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentConfig> = {
	'home-kitchen': {
		id: 'home-kitchen',
		levelId: 1,
		levelDisplayName: 'Home Kitchen',
		tagline: 'Level 1',
		workspaceLabel: 'Drawing table',
		galleryLabel: 'Fridge',
		emptyGalleryMessage: 'The fridge is bare. Your first masterpiece goes here.',
		idleMessage: 'The kitchen is quiet. Sunlight catches the fridge magnets.',
		loadingMessages: [
			'Sharpening the crayons…',
			'Mixing colours at the kitchen table…',
			'Squinting at the brief…',
			'Arguing with the muse…',
			'Blending, badly…'
		],
		critiqueMessages: [
			'The client stepped out to look at your piece…',
			'Squinting at it from across the kitchen…',
			'Comparing it to the brief…',
			'Drafting something diplomatic to say…'
		],
		winMessage:
			'Congratulations — the fridge is full and the kitchen is buzzing. The art room is coming next.'
	},
	'art-room': {
		id: 'art-room',
		levelId: 2,
		levelDisplayName: 'Art Room',
		tagline: 'Level 2 — coming soon',
		workspaceLabel: 'Desk',
		galleryLabel: 'Pinboard',
		emptyGalleryMessage: 'Nothing pinned yet.',
		idleMessage: '',
		loadingMessages: [],
		critiqueMessages: [],
		winMessage: ''
	},
	studio: {
		id: 'studio',
		levelId: 3,
		levelDisplayName: 'Studio',
		tagline: 'Level 3 — coming soon',
		workspaceLabel: 'Easel',
		galleryLabel: 'Studio wall',
		emptyGalleryMessage: 'The wall is empty.',
		idleMessage: '',
		loadingMessages: [],
		critiqueMessages: [],
		winMessage: ''
	},
	gallery: {
		id: 'gallery',
		levelId: 4,
		levelDisplayName: 'Gallery',
		tagline: 'Level 4 — coming soon',
		workspaceLabel: 'Curator desk',
		galleryLabel: 'Gallery wall',
		emptyGalleryMessage: 'No pieces on display.',
		idleMessage: '',
		loadingMessages: [],
		critiqueMessages: [],
		winMessage: ''
	}
};

/** Returns the environment for a level id, falling back to the home kitchen. */
export function getEnvironmentForLevel(levelId: number): EnvironmentConfig {
	return (
		Object.values(ENVIRONMENTS).find((environment) => environment.levelId === levelId) ??
		ENVIRONMENTS['home-kitchen']
	);
}
