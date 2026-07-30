import { z } from 'zod';
import { galleryEntrySchema } from '$lib/types/contracts';

export const SAVE_STORAGE_KEY = 'adt.save.v1';
export const CURRENT_SAVE_VERSION = 1;

/**
 * Everything a progression system needs to persist. Specs 13-16 each own one array of
 * string ids on this shape — string ids (not enums) so a later spec can add new tiers,
 * upgrades or staff roles without touching this schema again.
 */
export const saveDataSchema = z.object({
	version: z.literal(1),
	cash: z.number().int().min(0),
	reputation: z.number().int().min(0),
	lifetimeCommissions: z.number().int().min(0),
	galleryHistory: z.array(galleryEntrySchema),

	/** Spec 13. First entry is always 'crayon'; never empty. */
	unlockedMediumTierIds: z.array(z.string().min(1)).min(1).default(['crayon']),
	activeMediumTierId: z.string().min(1).default('crayon'),

	/** Spec 14. */
	unlockedVenueId: z.string().min(1).default('fridge'),
	unlockedLayoutIds: z.array(z.string().min(1)).default(['cluttered']),
	activeLayoutId: z.string().min(1).default('cluttered'),
	ownedAtmosphereIds: z.array(z.string().min(1)).default([]),

	/** Spec 15. */
	unlockedClientTiers: z.array(z.string().min(1)).default(['walk-in']),
	/**
	 * Spec 15. Parallel map of corporate `seriesId` → on-brand flags collected so far,
	 * one boolean per completed series piece in order. Used to score the series bonus
	 * without storing `playerPrompt` on `GalleryEntry`.
	 */
	seriesOnBrandFlags: z.record(z.string(), z.array(z.boolean())).default({}),

	/** Spec 16. */
	hiredStaffIds: z.array(z.string().min(1)).default([]),
	/** Epoch ms of the last time idle income was collected/ticked. Null until spec 16. */
	lastIncomeTickAt: z.number().int().nonnegative().nullable().default(null),

	/** Epoch ms this blob was written. Not shown to the player; useful for debugging. */
	savedAt: z.number().int().nonnegative()
});

export type SaveData = z.infer<typeof saveDataSchema>;

/** A brand-new player. `startingCash` matches `LEVEL_1.startingCash` at call time. */
export function createDefaultSave(startingCash: number, now: () => number = Date.now): SaveData {
	return saveDataSchema.parse({
		version: CURRENT_SAVE_VERSION,
		cash: startingCash,
		reputation: 0,
		lifetimeCommissions: 0,
		galleryHistory: [],
		savedAt: now()
	});
}

/**
 * Reads and validates the save blob. Returns `createDefaultSave(startingCash)` for a
 * missing key, malformed JSON, a schema mismatch, or a `localStorage` throw (Safari
 * private mode, quota errors) — a corrupt save must never block the game from loading.
 */
/**
 * Spec 16: a null tick time must never reach `computeIdleEarnings` as a timestamp.
 * Old saves and brand-new defaults still parse as null; we stamp `now()` here.
 */
function withIncomeTickInitialised(data: SaveData, now: () => number): SaveData {
	if (data.lastIncomeTickAt !== null) return data;
	return { ...data, lastIncomeTickAt: now() };
}

export function loadSave(startingCash: number, now: () => number = Date.now): SaveData {
	try {
		const raw = localStorage.getItem(SAVE_STORAGE_KEY);
		if (!raw) return withIncomeTickInitialised(createDefaultSave(startingCash, now), now);
		const parsed = saveDataSchema.safeParse(JSON.parse(raw));
		return parsed.success
			? withIncomeTickInitialised(parsed.data, now)
			: withIncomeTickInitialised(createDefaultSave(startingCash, now), now);
	} catch {
		return withIncomeTickInitialised(createDefaultSave(startingCash, now), now);
	}
}

/** Best-effort write. Swallows quota/private-mode errors — a failed save must never throw. */
export function persistSave(data: SaveData): void {
	try {
		localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
	} catch {
		// Storage full or unavailable. Losing one write is better than crashing the game.
	}
}

/** Clears the save. Exposed for a future "reset progress" button; not wired to any UI yet. */
export function clearSave(): void {
	try {
		localStorage.removeItem(SAVE_STORAGE_KEY);
	} catch {
		// ignore
	}
}
