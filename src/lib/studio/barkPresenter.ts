import { barksAllowedForPhase } from './barkPicker';

/** Default bubble lifetime (ms). */
export const BARK_LIFETIME_MS = 2_800;

/** Lifetime when reducedVfx / prefers-reduced-motion. */
export const BARK_LIFETIME_REDUCED_MS = 1_400;

/** Fade in/out duration; ignored when reduced motion. */
export const BARK_FADE_MS = 200;

/** Short retry when the interact prompt covers the chosen speaker. */
export const BARK_PROMPT_RETRY_MS = 1_500;

/** Bubble Y offset above the speaker sprite center. */
export const BARK_OFFSET_Y = 28;

/** Depth above floor sprites (staff/Mum are 10; prompts are 20). */
export const BARK_DEPTH = 18;

export type BarkAnnouncePayload = {
	speakerId: string;
	speakerLabel: string;
	text: string;
	/** Optional 21c cue id — forward only; never play audio here. */
	cueId?: string;
};

export type BarkAnnounceHandler = (payload: BarkAnnouncePayload | null) => void;

export function barkLifetimeMs(reducedVfx: boolean): number {
	return reducedVfx ? BARK_LIFETIME_REDUCED_MS : BARK_LIFETIME_MS;
}

/**
 * Whether a bark may be shown right now.
 * Phase must allow ambient life and the E prompt must not cover the speaker.
 */
export function shouldShowBark(input: { phase: string; promptVisible: boolean }): boolean {
	return barksAllowedForPhase(input.phase) && !input.promptVisible;
}
