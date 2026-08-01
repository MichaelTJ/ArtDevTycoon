import { z } from 'zod';
import { SAVE_STORAGE_KEY, createDefaultSave, saveDataSchema, type SaveData } from './save';

export const SLOTS_STORAGE_KEY = 'adt.save.slots.v1';
export const ACTIVE_SLOT_KEY = 'adt.save.activeSlot';
export const SLOT_IDS = ['0', '1', '2'] as const;
export type SaveSlotId = (typeof SLOT_IDS)[number];
export const MAX_SAVE_SLOTS = 3;

export const saveSlotMetaSchema = z.object({
	/** Player-facing name, trimmed, 1–24 chars. */
	name: z.string().trim().min(1).max(24),
	/** Mirror of SaveData.savedAt for the slot list without parsing full gallery. */
	savedAt: z.number().int().nonnegative(),
	/** Empty slot = no payload yet. */
	empty: z.boolean()
});

export type SaveSlotMeta = z.infer<typeof saveSlotMetaSchema>;

export type SaveSlotsFile = {
	version: 1;
	slots: Record<
		SaveSlotId,
		{
			meta: SaveSlotMeta;
			data: SaveData | null;
		}
	>;
};

export type SaveSlotListItem = {
	id: SaveSlotId;
	name: string;
	savedAt: number;
	empty: boolean;
	/** Present when !empty — for UI summary. */
	summary?: { cash: number; reputation: number; lifetimeCommissions: number };
};

const DEFAULT_SLOT_NAMES: Record<SaveSlotId, string> = {
	'0': 'Slot 1',
	'1': 'Slot 2',
	'2': 'Slot 3'
};

/** Built lazily so this module can circular-import `saveDataSchema` safely. */
function saveSlotsFileSchema() {
	const slotEntrySchema = z.object({
		meta: saveSlotMetaSchema,
		data: saveDataSchema.nullable()
	});
	return z.object({
		version: z.literal(1),
		slots: z.object({
			'0': slotEntrySchema,
			'1': slotEntrySchema,
			'2': slotEntrySchema
		})
	});
}

function emptySlotEntry(id: SaveSlotId): SaveSlotsFile['slots'][SaveSlotId] {
	return {
		meta: {
			name: DEFAULT_SLOT_NAMES[id],
			savedAt: 0,
			empty: true
		},
		data: null
	};
}

/** Fresh three-slot index with no payloads. */
export function createEmptySlotsFile(): SaveSlotsFile {
	return {
		version: 1,
		slots: {
			'0': emptySlotEntry('0'),
			'1': emptySlotEntry('1'),
			'2': emptySlotEntry('2')
		}
	};
}

function isSaveSlotId(value: string | null): value is SaveSlotId {
	return value === '0' || value === '1' || value === '2';
}

function readSlotsFileRaw(): SaveSlotsFile | null {
	try {
		const raw = localStorage.getItem(SLOTS_STORAGE_KEY);
		if (!raw) return null;
		const parsed = saveSlotsFileSchema().safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

function writeSlotsFile(file: SaveSlotsFile): void {
	try {
		localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify(file));
	} catch {
		// Quota / private mode — same spirit as persistSave.
	}
}

function readActiveSlotIdRaw(): SaveSlotId | null {
	try {
		const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
		return isSaveSlotId(raw) ? raw : null;
	} catch {
		return null;
	}
}

function writeActiveSlotId(id: SaveSlotId): void {
	try {
		localStorage.setItem(ACTIVE_SLOT_KEY, id);
	} catch {
		// ignore
	}
}

function removeLegacySave(): void {
	try {
		localStorage.removeItem(SAVE_STORAGE_KEY);
	} catch {
		// ignore
	}
}

function readLegacySave(): SaveData | null {
	try {
		const raw = localStorage.getItem(SAVE_STORAGE_KEY);
		if (!raw) return null;
		const parsed = saveDataSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

/**
 * Ensures slots file + active pointer exist.
 * Call once from loadSave / GameStore ctor before reading a slot.
 */
export function ensureSaveSlotsMigrated(
	startingCash: number,
	now: () => number = Date.now
): SaveSlotsFile {
	void startingCash;
	void now;

	try {
		const existing = readSlotsFileRaw();
		if (existing) {
			if (!readActiveSlotIdRaw()) writeActiveSlotId('0');
			return existing;
		}

		const file = createEmptySlotsFile();
		const legacy = readLegacySave();
		if (legacy) {
			file.slots['0'] = {
				meta: {
					name: DEFAULT_SLOT_NAMES['0'],
					savedAt: legacy.savedAt,
					empty: false
				},
				data: legacy
			};
		}

		writeSlotsFile(file);
		writeActiveSlotId('0');
		if (legacy) removeLegacySave();
		return file;
	} catch {
		try {
			writeActiveSlotId('0');
		} catch {
			// ignore
		}
		return createEmptySlotsFile();
	}
}

export function getActiveSlotId(): SaveSlotId {
	ensureSaveSlotsMigrated(0);
	return readActiveSlotIdRaw() ?? '0';
}

export function setActiveSlotId(id: SaveSlotId): void {
	ensureSaveSlotsMigrated(0);
	writeActiveSlotId(id);
}

function loadSlotsFile(startingCash: number, now: () => number = Date.now): SaveSlotsFile {
	return ensureSaveSlotsMigrated(startingCash, now);
}

function mutateSlots(
	startingCash: number,
	now: () => number,
	mutator: (file: SaveSlotsFile) => void
): SaveSlotsFile {
	const file = structuredClone(loadSlotsFile(startingCash, now));
	mutator(file);
	writeSlotsFile(file);
	return file;
}

export function listSaveSlots(): ReadonlyArray<SaveSlotListItem> {
	const file = ensureSaveSlotsMigrated(0);
	return SLOT_IDS.map((id) => {
		const entry = file.slots[id];
		const item: SaveSlotListItem = {
			id,
			name: entry.meta.name,
			savedAt: entry.meta.savedAt,
			empty: entry.meta.empty
		};
		if (!entry.meta.empty && entry.data) {
			item.summary = {
				cash: entry.data.cash,
				reputation: entry.data.reputation,
				lifetimeCommissions: entry.data.lifetimeCommissions
			};
		}
		return item;
	});
}

/** Load slot id into memory shape without changing active (for preview). */
export function peekSlot(id: SaveSlotId, startingCash: number): SaveData | null {
	const file = ensureSaveSlotsMigrated(startingCash);
	const entry = file.slots[id];
	if (entry.meta.empty || !entry.data) return null;
	return entry.data;
}

/**
 * Make `id` active and return its SaveData (default if empty).
 * Caller (GameStore) applies hydrate + aborts in-flight commission.
 */
export function activateSlot(
	id: SaveSlotId,
	startingCash: number,
	now: () => number = Date.now
): SaveData {
	writeActiveSlotId(id);
	const file = ensureSaveSlotsMigrated(startingCash, now);
	const entry = file.slots[id];
	if (entry.meta.empty || !entry.data) {
		return createDefaultSave(startingCash, now);
	}
	return entry.data;
}

/** Replace slot with createDefaultSave; set active to id; return new data. */
export function newGameInSlot(
	id: SaveSlotId,
	startingCash: number,
	name?: string,
	now: () => number = Date.now
): SaveData {
	const data = createDefaultSave(startingCash, now);
	const trimmed = name?.trim().slice(0, 24);
	mutateSlots(startingCash, now, (file) => {
		file.slots[id] = {
			meta: {
				name: trimmed && trimmed.length > 0 ? trimmed : DEFAULT_SLOT_NAMES[id],
				savedAt: data.savedAt,
				empty: false
			},
			data
		};
	});
	writeActiveSlotId(id);
	return data;
}

/**
 * After delete: slot becomes empty (data null). If deleted slot was active,
 * activate the lowest-index non-empty slot, or `newGameInSlot('0')` if all empty.
 */
export function deleteSlot(
	id: SaveSlotId,
	startingCash: number,
	now: () => number = Date.now
): void {
	const wasActive = getActiveSlotId() === id;
	mutateSlots(startingCash, now, (file) => {
		file.slots[id] = emptySlotEntry(id);
	});

	if (!wasActive) return;

	const file = ensureSaveSlotsMigrated(startingCash, now);
	const next = SLOT_IDS.find((slotId) => !file.slots[slotId].meta.empty);
	if (next) {
		writeActiveSlotId(next);
		return;
	}
	newGameInSlot('0', startingCash, undefined, now);
}

export function renameSlot(id: SaveSlotId, name: string): void {
	const trimmed = name.trim().slice(0, 24);
	if (trimmed.length === 0) return;
	mutateSlots(0, Date.now, (file) => {
		file.slots[id].meta.name = trimmed;
	});
}

/** Deep-copy data from `from` → `to` (overwrites to). No-op if from empty. */
export function copySlot(from: SaveSlotId, to: SaveSlotId, now: () => number = Date.now): void {
	if (from === to) return;
	const file = ensureSaveSlotsMigrated(0, now);
	const source = file.slots[from];
	if (source.meta.empty || !source.data) return;

	const copied = structuredClone(source.data);
	copied.savedAt = now();
	mutateSlots(0, now, (next) => {
		next.slots[to] = {
			meta: {
				name: next.slots[to].meta.name,
				savedAt: copied.savedAt,
				empty: false
			},
			data: copied
		};
	});
}

/**
 * Writes `data` into the active slot and marks it non-empty.
 * Used by `persistSave` so call sites stay slot-unaware.
 */
export function persistActiveSlot(data: SaveData): void {
	const id = getActiveSlotId();
	mutateSlots(
		0,
		() => data.savedAt,
		(file) => {
			file.slots[id] = {
				meta: {
					name: file.slots[id].meta.name,
					savedAt: data.savedAt,
					empty: false
				},
				data
			};
		}
	);
}

/**
 * Reads the active slot payload, or null when empty / missing.
 * `loadSave` maps null to a default SaveData.
 */
export function loadActiveSlotData(
	startingCash: number,
	now: () => number = Date.now
): SaveData | null {
	const id = getActiveSlotId();
	const file = ensureSaveSlotsMigrated(startingCash, now);
	const entry = file.slots[id];
	if (entry.meta.empty || !entry.data) return null;
	return entry.data;
}

/** Clears every slot and the active pointer (used by clearSave / reset). */
export function clearAllSlots(): void {
	try {
		localStorage.removeItem(SLOTS_STORAGE_KEY);
		localStorage.removeItem(ACTIVE_SLOT_KEY);
		removeLegacySave();
	} catch {
		// ignore
	}
}
