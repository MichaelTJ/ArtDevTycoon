import { INTERACT_RANGE_PX } from './config';

/** Stable ids placed on RoomDef furniture via `interactableId`. */
export type InteractableId = 'fridge' | 'toolkit-shelf' | 'storage';

export type StudioShopId = 'toolkit' | 'gallery' | 'staff';

export type InteractIntent =
	| { type: 'toggle-fridge' }
	| { type: 'open-shop'; shop: StudioShopId }
	| { type: 'open-storage' }
	| { type: 'bark'; lines: readonly string[] };

/**
 * One interactable definition. Fridge uses {@link FridgeInteractableDef} instead
 * because it toggles open/closed prompts and frames.
 */
export interface InteractableDef {
	id: InteractableId;
	/** Shown as "E — {promptLabel}" above the player / prop. */
	promptLabel: string;
	/** Pixel range; omit → INTERACT_RANGE_PX. */
	rangePx?: number;
	intent: InteractIntent;
}

export interface FridgeInteractableDef {
	id: 'fridge';
	promptLabelClosed: string;
	promptLabelOpen: string;
	rangePx?: number;
	/** Closed / open furniture frames in furniture.png (chest 2 / open chest 3). */
	closedFrame: number;
	openFrame: number;
	barkLines: readonly string[];
}

export const FRIDGE: FridgeInteractableDef = {
	id: 'fridge',
	promptLabelClosed: 'Open fridge',
	promptLabelOpen: 'Close fridge',
	closedFrame: 2,
	openFrame: 3,
	barkLines: [
		'Mum left a note: "Eat something that is not paint."',
		'Leftover casserole. Courage required.',
		'Magnet trivia: this fridge has seen five masterpieces and one crayon onion.'
	]
};

export const TOOLKIT_SHELF: InteractableDef = {
	id: 'toolkit-shelf',
	promptLabel: 'Open toolkit',
	intent: { type: 'open-shop', shop: 'toolkit' }
};

/** Fallback prompt; the scene uses `storageForVenue(activeVenueId).promptLabel`. */
export const STORAGE: InteractableDef = {
	id: 'storage',
	promptLabel: 'Open storage',
	intent: { type: 'open-storage' }
};

export interface PropMarker {
	interactableId: InteractableId;
	tx: number;
	ty: number;
}

/**
 * Nearest tagged prop within its range. Returns null if none.
 * Distance uses tile centers: (tx + 0.5) * tileSize, (ty + 0.5) * tileSize.
 * When two props tie, prefer the one with smaller distance; if still tied, stable
 * by array order.
 */
export interface RankedInteract {
	dist: number;
	/** Lower wins on a distance tie. Desk 0, easel 1, prop 2. */
	priority: number;
}

/** Closest item wins; equal distance prefers the lower priority (desk over easel over prop). */
export function pickNearestRanked<T extends RankedInteract>(items: readonly T[]): T | null {
	let best: T | null = null;
	for (const item of items) {
		if (
			!best ||
			item.dist < best.dist ||
			(item.dist === best.dist && item.priority < best.priority)
		) {
			best = item;
		}
	}
	return best;
}

export function nearestInteractable(
	playerPx: number,
	playerPy: number,
	props: readonly PropMarker[],
	tileSize: number,
	defaultRangePx: number = INTERACT_RANGE_PX
): PropMarker | null {
	let best: PropMarker | null = null;
	let bestDist = Number.POSITIVE_INFINITY;

	for (const prop of props) {
		const def = defForInteractable(prop.interactableId);
		const range = def.rangePx ?? defaultRangePx;
		const cx = (prop.tx + 0.5) * tileSize;
		const cy = (prop.ty + 0.5) * tileSize;
		const d = Math.hypot(playerPx - cx, playerPy - cy);
		if (d < range && d < bestDist) {
			bestDist = d;
			best = prop;
		}
	}

	return best;
}

export function defForInteractable(id: InteractableId): InteractableDef | FridgeInteractableDef {
	switch (id) {
		case 'fridge':
			return FRIDGE;
		case 'storage':
			return STORAGE;
		case 'toolkit-shelf':
			return TOOLKIT_SHELF;
	}
}

/** Pick a bark line. `index` modulo length; tests pass an explicit index. */
export function fridgeBarkLine(lines: readonly string[], index: number): string {
	if (lines.length === 0) return '';
	return lines[((index % lines.length) + lines.length) % lines.length]!;
}

/**
 * Prompt copy helper for the scene.
 * kind 'fridge' uses open state; others use def.promptLabel.
 */
export function interactPromptText(
	input:
		| { kind: 'fridge'; open: boolean }
		| { kind: 'toolkit-shelf' }
		| { kind: 'storage'; label: string }
): string {
	if (input.kind === 'fridge') {
		const label = input.open ? FRIDGE.promptLabelOpen : FRIDGE.promptLabelClosed;
		return `E — ${label}`;
	}
	if (input.kind === 'storage') {
		return `E — ${input.label}`;
	}
	return `E — ${TOOLKIT_SHELF.promptLabel}`;
}
