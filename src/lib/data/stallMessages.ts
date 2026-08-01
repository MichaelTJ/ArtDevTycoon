import { DEFAULT_MEDIUM_TIER_ID, getMediumTier } from './mediumTiers';

/** Rotating copy shown while critique is pending — art not handed to the client yet. */
export interface StallCopy {
	/** Short header above the spinner (e.g. "Finishing up"). */
	stageLabel: string;
	messages: readonly string[];
}

/** Medium-specific stall pools for the critiquing phase (playtest P14). */
export const STALL_COPY_BY_MEDIUM: Readonly<Record<string, StallCopy>> = {
	crayon: {
		stageLabel: 'Finishing up',
		messages: [
			'Sharpening the crayons…',
			'Pressing down the construction paper…',
			'Finding where the lid went…',
			'Wiping wax off the table…'
		]
	},
	pencil: {
		stageLabel: 'Finishing up',
		messages: [
			'Putting pencils away…',
			'Blowing eraser crumbs off the page…',
			'Closing the sketchbook carefully…',
			'Sharpening the last blunt tip…'
		]
	},
	ink: {
		stageLabel: 'Finishing up',
		messages: [
			'Washing the nib…',
			'Letting the ink dry…',
			'Smudging charcoal off the desk…',
			'Blowing dust off the portfolio…'
		]
	},
	watercolor: {
		stageLabel: 'Finishing up',
		messages: [
			'Ironing out the paper…',
			'Rinsing the brushes…',
			'Blotting a happy accident…',
			'Taping down fresh sheets…'
		]
	},
	acrylic: {
		stageLabel: 'Finishing up',
		messages: [
			'Framing it up…',
			'Flattening the canvas…',
			'Squeezing the last tube…',
			'Signing the corner…'
		]
	},
	oil: {
		stageLabel: 'Finishing up',
		messages: [
			'Waiting for the varnish to dry…',
			'Stepping back from the easel…',
			'Checking the brushwork one last time…',
			'Cleaning palette knives…'
		]
	}
};

/** Used when `mediumTierId` is missing or unknown. */
export const FALLBACK_STALL_COPY: StallCopy = {
	stageLabel: 'Finishing up',
	messages: [
		'Tidying the workspace…',
		'Letting the piece settle…',
		'Checking the lighting one more time…',
		'Almost ready to show the client…'
	]
};

/** Resolve stall copy for the active medium tier, falling back when id is unknown. */
export function getStallCopy(mediumTierId: string): StallCopy {
	return STALL_COPY_BY_MEDIUM[mediumTierId] ?? FALLBACK_STALL_COPY;
}

/** Header shown above the critiquing spinner for the active medium. */
export function getStallStageLabel(mediumTierId: string): string {
	return getStallCopy(mediumTierId).stageLabel;
}

/** Deterministic seed in `[0, 1)` from artwork id for stall message order. */
export function stallSeedFromArtworkId(artworkId: string): number {
	let hash = 0;
	for (let i = 0; i < artworkId.length; i++) {
		hash = (hash * 31 + artworkId.charCodeAt(i)) >>> 0;
	}
	return (hash % 10_000) / 10_000;
}

/** Rotate a message pool so the first line is seeded — tests stay deterministic. */
export function rotateStallMessages(messages: readonly string[], seed: number): string[] {
	if (messages.length === 0) return [];
	const clamped = Math.min(Math.max(seed, 0), 0.999_999);
	const start = Math.min(Math.floor(clamped * messages.length), messages.length - 1);
	return [...messages.slice(start), ...messages.slice(0, start)];
}

/**
 * Stall lines for a critiquing artwork: medium pool rotated by artwork id.
 * Validates the tier id via {@link getMediumTier} so bad saves still get sensible copy.
 */
export function stallMessagesForArtwork(mediumTierId: string, artworkId: string): string[] {
	const tierId = getMediumTier(mediumTierId).id;
	const copy = getStallCopy(tierId);
	return rotateStallMessages(copy.messages, stallSeedFromArtworkId(artworkId));
}

/** Default medium when the overlay has no tier prop yet. */
export const DEFAULT_STALL_MEDIUM_TIER_ID = DEFAULT_MEDIUM_TIER_ID;
