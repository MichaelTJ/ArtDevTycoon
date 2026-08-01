import { z } from 'zod';
import { galleryEntrySchema } from '$lib/types/contracts';
import {
	clearAllSlots,
	ensureSaveSlotsMigrated,
	loadActiveSlotData,
	persistActiveSlot
} from './saveSlots';

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

	/** Spec 20. Lifetime craft XP. Missing keys default to 0. */
	skillXpPrompting: z.number().int().min(0).default(0),
	skillXpImagination: z.number().int().min(0).default(0),
	skillXpHustle: z.number().int().min(0).default(0),

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
 * Spec 16: a null tick time must never reach `computeIdleEarnings` as a timestamp.
 * Old saves and brand-new defaults still parse as null; we stamp `now()` here.
 */
function withIncomeTickInitialised(data: SaveData, now: () => number): SaveData {
	if (data.lastIncomeTickAt !== null) return data;
	return { ...data, lastIncomeTickAt: now() };
}

/**
 * Reads and validates the ACTIVE slot's SaveData. Migrates legacy `adt.save.v1` on
 * first boot. Returns `createDefaultSave(startingCash)` for an empty active slot,
 * malformed storage, or a `localStorage` throw — a corrupt save must never block boot.
 */
export function loadSave(startingCash: number, now: () => number = Date.now): SaveData {
	try {
		ensureSaveSlotsMigrated(startingCash, now);
		const slotData = loadActiveSlotData(startingCash, now);
		if (!slotData) {
			return withIncomeTickInitialised(createDefaultSave(startingCash, now), now);
		}
		return withIncomeTickInitialised(slotData, now);
	} catch {
		return withIncomeTickInitialised(createDefaultSave(startingCash, now), now);
	}
}

/** Writes into the ACTIVE slot; updates meta.savedAt / empty=false. Never throws. */
export function persistSave(data: SaveData): void {
	try {
		ensureSaveSlotsMigrated(data.cash, () => data.savedAt);
		persistActiveSlot(data);
	} catch {
		// Storage full or unavailable. Losing one write is better than crashing the game.
	}
}

/** Clears all slots and the legacy key. Used by GameStore.reset. */
export function clearSave(): void {
	clearAllSlots();
}
