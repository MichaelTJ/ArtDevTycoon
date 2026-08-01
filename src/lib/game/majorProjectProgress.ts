import { getArtistCatalogEntry } from '$lib/data/artists';
import {
	getMajorProject,
	majorProjectReputationReward,
	type MajorProjectDef
} from '$lib/data/majorProjects';
import { artistLevel } from './artistTraining';

/** Base ms per major-project beat before artist/match scaling. */
export const BASE_BEAT_MS = 10_000;

export interface MajorProjectProgress {
	projectId: string;
	beatsCompleted: number;
	/** catalogId per beat index; empty string = crew slot open */
	crewByBeat: string[];
	activeBeatIndex: number | null;
	beatStartedAt: number | null;
	beatDurationMs: number | null;
}

export function createMajorProjectProgress(
	projectId: string,
	beatCount: number
): MajorProjectProgress {
	return {
		projectId,
		beatsCompleted: 0,
		crewByBeat: Array.from({ length: beatCount }, () => ''),
		activeBeatIndex: null,
		beatStartedAt: null,
		beatDurationMs: null
	};
}

export function resolveMajorProject(progress: MajorProjectProgress): MajorProjectDef | undefined {
	return getMajorProject(progress.projectId);
}

export function isMajorProjectComplete(
	progress: MajorProjectProgress,
	project: MajorProjectDef
): boolean {
	return progress.beatsCompleted >= project.beatCount && progress.activeBeatIndex == null;
}

export function beatWorkDurationMs(
	artistCatalogId: string,
	artistXp: number,
	project: MajorProjectDef
): number {
	const level = artistLevel(artistXp);
	const levelFactor = Math.max(0.5, 1 - (level - 1) * 0.07);
	const entry = getArtistCatalogEntry(artistCatalogId);
	const matchBoost =
		entry && project.preferredSpecialisms.some((tag) => entry.specialisms.includes(tag)) ? 0.85 : 1;
	const kindFactor = project.kind === 'animated-series' ? 1.15 : 1;
	return Math.round(BASE_BEAT_MS * levelFactor * matchBoost * kindFactor);
}

export function beatProgress(progress: MajorProjectProgress, now: number): number {
	if (
		progress.activeBeatIndex == null ||
		progress.beatStartedAt == null ||
		progress.beatDurationMs == null ||
		progress.beatDurationMs <= 0
	) {
		return 0;
	}
	const elapsed = now - progress.beatStartedAt;
	return Math.min(1, Math.max(0, elapsed / progress.beatDurationMs));
}

export function beatTimerComplete(progress: MajorProjectProgress, now: number): boolean {
	return beatProgress(progress, now) >= 1;
}

export function payoutReady(progress: MajorProjectProgress, project: MajorProjectDef): boolean {
	return isMajorProjectComplete(progress, project);
}

export function majorProjectPayout(project: MajorProjectDef): number {
	return project.basePayout;
}

export function majorProjectRep(project: MajorProjectDef): number {
	return majorProjectReputationReward(project);
}
