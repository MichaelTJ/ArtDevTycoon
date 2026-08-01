export type MajorProjectKind = 'comic-book' | 'animated-series';

/** Data-driven major project definition (spec 24d). */
export interface MajorProjectDef {
	id: string;
	kind: MajorProjectKind;
	title: string;
	tagline: string;
	beatCount: number;
	basePayout: number;
	requiredReputation: number;
	preferredSpecialisms: readonly string[];
	/** Short labels for each beat in the UI. */
	beatLabels: readonly string[];
}

export const MAJOR_PROJECTS: readonly MajorProjectDef[] = [
	{
		id: 'comic-lunch-legend',
		kind: 'comic-book',
		title: 'The Lunch Legend',
		tagline: 'Four-page mini comic for a local zine.',
		beatCount: 4,
		basePayout: 120,
		requiredReputation: 6,
		preferredSpecialisms: ['comics', 'character'],
		beatLabels: ['Cover splash', 'Page one', 'Page two', 'Page three']
	},
	{
		id: 'series-pencil-pals',
		kind: 'animated-series',
		title: 'Pencil Pals',
		tagline: 'Six short episodes — pencils that talk back.',
		beatCount: 6,
		basePayout: 180,
		requiredReputation: 10,
		preferredSpecialisms: ['animation', 'character'],
		beatLabels: [
			'Pilot cold open',
			'Episode 2',
			'Episode 3',
			'Episode 4',
			'Episode 5',
			'Season finale'
		]
	}
] as const;

export function getMajorProject(id: string): MajorProjectDef | undefined {
	return MAJOR_PROJECTS.find((p) => p.id === id);
}

export function canAcceptMajorProject(
	project: MajorProjectDef,
	state: { reputation: number; activeProjectId: string | null }
): boolean {
	if (state.activeProjectId != null) return false;
	return state.reputation >= project.requiredReputation;
}

/** Flat reputation bonus on project completion — scales slightly with beat count. */
export function majorProjectReputationReward(project: MajorProjectDef): number {
	return project.kind === 'comic-book' ? 3 : 5;
}
