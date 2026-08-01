/** Stable kinds already emitted by StudioScene.#nearestTarget (+ 21b extensions). */
export type InteractPromptKind =
	| 'talk'
	| 'deliver'
	| 'desk'
	| 'easel'
	| 'look'
	| 'fridge' // 21b — if absent from scene, never requested
	| 'toolkit'
	| 'radio'
	| 'mail'
	| 'doorbell'
	| 'reception'
	| 'prop'; // generic 21b fallback

export interface InteractPromptInput {
	kind: InteractPromptKind;
	/**
	 * Prefer 21b registry `promptLabel` when present (e.g. "Open fridge").
	 * When null/undefined, use built-in fallbacks below.
	 */
	registryLabel?: string | null;
	/** Client display name for talk/deliver — e.g. "Mum", "Neighbour". */
	clientName?: string | null;
}

/**
 * Human-readable verb line shown next to / instead of a bare E glyph.
 * MUST be short (≤ ~28 chars) for pixel UI.
 */
export function interactPromptLabel(input: InteractPromptInput): string {
	const registry = input.registryLabel?.trim();
	if (registry) return registry;

	const name = input.clientName?.trim() || '';

	switch (input.kind) {
		case 'talk':
			return name ? `Talk to ${name}` : 'Talk';
		case 'deliver':
			return name ? `Deliver to ${name}` : 'Deliver art';
		case 'desk':
			return 'Work at desk';
		case 'easel':
			return 'View art';
		case 'look':
			return 'View show';
		case 'fridge':
			return 'Open fridge';
		case 'toolkit':
			return 'Open toolkit';
		case 'radio':
			return 'Toggle radio';
		case 'mail':
			return 'Read mail';
		case 'doorbell':
			return 'Ring doorbell';
		case 'reception':
			return 'Talk to Receptionist';
		case 'prop':
			return 'Inspect';
		default:
			return 'Interact';
	}
}

/**
 * True when the OS/browser requests fewer animations.
 * Inject `{ matches }` in tests; defaults to `matchMedia` when available.
 */
export function prefersReducedMotion(
	media: { matches: boolean } | null | undefined = globalThis.matchMedia?.(
		'(prefers-reduced-motion: reduce)'
	)
): boolean {
	return Boolean(media?.matches);
}
