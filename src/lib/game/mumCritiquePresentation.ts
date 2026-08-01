import { pickMumPraise } from '$lib/data/mumPraise';
import { LEVEL_1, type CritiqueDraft } from '$lib/types/contracts';

/** Display name for the kitchen resident client (matches briefs and studio NPC). */
export const MUM_CLIENT_NAME = 'Mum';

/** Player-facing Mum scores before "Ask for real critique". */
export const MUM_DISPLAY_SCORE = LEVEL_1.maxScore;

/** Engine verdict preserved for the optional reveal panel. */
export interface MumRealCritique {
	title: string;
	accuracyScore: number;
	creativityScore: number;
	criticReview: string;
}

/** True when the active commission is from Mum (kitchen resident). */
export function isMumCommission(clientName: string): boolean {
	return clientName === MUM_CLIENT_NAME;
}

/** Snapshot the engine critique before Mum payout/display overrides. */
export function captureMumRealCritique(
	draft: CritiqueDraft,
	creativityScore: number
): MumRealCritique {
	return {
		title: draft.title,
		accuracyScore: draft.accuracyScore,
		creativityScore,
		criticReview: draft.criticReview
	};
}

/** Deterministic seed in `[0, 1)` from artwork id for praise selection. */
export function praiseSeedFromArtworkId(artworkId: string): number {
	let hash = 0;
	for (let i = 0; i < artworkId.length; i++) {
		hash = (hash * 31 + artworkId.charCodeAt(i)) >>> 0;
	}
	return (hash % 10_000) / 10_000;
}

/** Praise text for a Mum commission results panel. */
export function pickMumPraiseLine(seed: number): string {
	return pickMumPraise(seed).text;
}
