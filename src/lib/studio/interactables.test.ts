import { describe, expect, it } from 'vitest';
import {
	STORAGE,
	TOOLKIT_SHELF,
	fridgeBarkLine,
	interactPromptText,
	nearestInteractable,
	pickNearestRanked,
	type PropMarker
} from './interactables';

describe('nearestInteractable', () => {
	const fridge: PropMarker = { interactableId: 'fridge', tx: 1, ty: 1 };

	it('returns fridge when player is on its tile center', () => {
		const hit = nearestInteractable(24, 24, [fridge], 16);
		expect(hit).toEqual(fridge);
	});

	it('returns null when player is out of range', () => {
		expect(nearestInteractable(200, 200, [fridge], 16)).toBeNull();
	});

	it('prefers the nearer prop when two are in range', () => {
		const toolkit: PropMarker = { interactableId: 'toolkit-shelf', tx: 3, ty: 5 };
		// Toolkit center at (56, 88); fridge at (24, 24). Player nearer toolkit.
		const hit = nearestInteractable(50, 80, [fridge, toolkit], 16);
		expect(hit?.interactableId).toBe('toolkit-shelf');
	});
});

describe('pickNearestRanked', () => {
	it('picks kitchen storage over the desk when the player stands west of the crate', () => {
		const desk = { dist: Math.hypot(16, 16), priority: 0, id: 'desk' };
		const storage = { dist: 16, priority: 2, id: 'storage' };
		expect(pickNearestRanked([desk, storage])?.id).toBe('storage');
	});

	it('keeps desk on a distance tie', () => {
		const desk = { dist: 16, priority: 0, id: 'desk' };
		const prop = { dist: 16, priority: 2, id: 'prop' };
		expect(pickNearestRanked([prop, desk])?.id).toBe('desk');
	});

	it('returns null for an empty list', () => {
		expect(pickNearestRanked([])).toBeNull();
	});
});

describe('fridgeBarkLine', () => {
	it('cycles lines by index', () => {
		expect(fridgeBarkLine(['a', 'b'], 0)).toBe('a');
		expect(fridgeBarkLine(['a', 'b'], 1)).toBe('b');
		expect(fridgeBarkLine(['a', 'b'], 2)).toBe('a');
	});

	it('returns empty string for empty lines', () => {
		expect(fridgeBarkLine([], 0)).toBe('');
	});
});

describe('interactPromptText', () => {
	it('pins fridge and toolkit prompt strings', () => {
		expect(interactPromptText({ kind: 'fridge', open: false })).toBe('E — Open fridge');
		expect(interactPromptText({ kind: 'fridge', open: true })).toBe('E — Close fridge');
		expect(interactPromptText({ kind: 'toolkit-shelf' })).toBe('E — Open toolkit');
		expect(interactPromptText({ kind: 'storage', label: 'Open crate' })).toBe('E — Open crate');
		expect(interactPromptText({ kind: 'storage', label: 'Open vault' })).toBe('E — Open vault');
	});
});

describe('STORAGE', () => {
	it('opens storage rather than falling through to toolkit', () => {
		expect(STORAGE.intent).toEqual({ type: 'open-storage' });
		expect(STORAGE.promptLabel).toBe('Open storage');
	});
});

describe('TOOLKIT_SHELF', () => {
	it('opens the toolkit shop', () => {
		expect(TOOLKIT_SHELF.intent).toEqual({ type: 'open-shop', shop: 'toolkit' });
	});
});
