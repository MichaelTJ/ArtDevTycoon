import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	CURRENT_SAVE_VERSION,
	SAVE_STORAGE_KEY,
	clearSave,
	createDefaultSave,
	loadSave,
	persistSave,
	type SaveData
} from './save';
import {
	SLOTS_STORAGE_KEY,
	activateSlot,
	getActiveSlotId,
	listSaveSlots,
	newGameInSlot,
	peekSlot
} from './saveSlots';

function createMemoryStorage(throwsOnGet = false, throwsOnSet = false) {
	const map = new Map<string, string>();
	return {
		getItem: (key: string) => {
			if (throwsOnGet) throw new Error('getItem unavailable');
			return map.get(key) ?? null;
		},
		setItem: (key: string, value: string) => {
			if (throwsOnSet) throw new Error('setItem unavailable');
			map.set(key, value);
		},
		removeItem: (key: string) => {
			map.delete(key);
		},
		clear: () => {
			map.clear();
		},
		_map: map
	};
}

describe('save', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createMemoryStorage());
	});

	it('returns default save when nothing is in storage', () => {
		const now = () => 1_700_000_000_000;
		const loaded = loadSave(100, now);

		expect(loaded.cash).toBe(100);
		expect(loaded.reputation).toBe(0);
		expect(loaded.lifetimeCommissions).toBe(0);
		expect(loaded.galleryHistory).toEqual([]);
		expect(loaded.unlockedMediumTierIds).toEqual(['crayon']);
		expect(loaded.seriesOnBrandFlags).toEqual({});
		expect(loaded.hiredStaffIds).toEqual([]);
		expect(loaded.lastIncomeTickAt).toBe(1_700_000_000_000);
		expect(loaded.savedAt).toBe(1_700_000_000_000);
		expect(getActiveSlotId()).toBe('0');
	});

	it('initialises null lastIncomeTickAt to now on load', () => {
		const saved: SaveData = {
			version: CURRENT_SAVE_VERSION,
			cash: 340,
			reputation: 12,
			lifetimeCommissions: 3,
			galleryHistory: [
				{
					id: 'art-1',
					imageUrl: 'data:image/svg+xml,%3Csvg/%3E',
					title: 'Morning Coffee',
					payout: 85,
					score: 9,
					clientName: 'Alex',
					briefId: 'c1',
					completedAt: 1_700_000_000_000
				}
			],
			unlockedMediumTierIds: ['crayon'],
			activeMediumTierId: 'crayon',
			unlockedVenueId: 'fridge',
			unlockedLayoutIds: ['cluttered'],
			activeLayoutId: 'cluttered',
			ownedAtmosphereIds: [],
			unlockedClientTiers: ['walk-in'],
			seriesOnBrandFlags: {},
			hiredStaffIds: [],
			lastIncomeTickAt: null,
			skillXpPrompting: 0,
			skillXpImagination: 0,
			skillXpHustle: 0,
			savedAt: 1_700_000_000_000
		};
		persistSave(saved);

		expect(loadSave(100, () => 42)).toEqual({
			...saved,
			lastIncomeTickAt: 42
		});
	});

	it('preserves a concrete lastIncomeTickAt on load', () => {
		const saved: SaveData = {
			...createDefaultSave(100, () => 1),
			cash: 200,
			hiredStaffIds: ['apprentice'],
			lastIncomeTickAt: 99,
			savedAt: 1
		};
		persistSave(saved);

		expect(loadSave(100, () => 0).lastIncomeTickAt).toBe(99);
		expect(loadSave(100, () => 0).hiredStaffIds).toEqual(['apprentice']);
	});

	it('fills Zod defaults for missing optional progression fields', () => {
		const storage = createMemoryStorage();
		vi.stubGlobal('localStorage', storage);
		// Legacy single-key shape still migrates into slot 0 with Zod defaults.
		storage.setItem(
			SAVE_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				cash: 200,
				reputation: 1,
				lifetimeCommissions: 1,
				galleryHistory: [],
				savedAt: 99
			})
		);

		const loaded = loadSave(100, () => 55);

		expect(loaded.hiredStaffIds).toEqual([]);
		expect(loaded.unlockedMediumTierIds).toEqual(['crayon']);
		expect(loaded.activeMediumTierId).toBe('crayon');
		expect(loaded.unlockedVenueId).toBe('fridge');
		expect(loaded.unlockedLayoutIds).toEqual(['cluttered']);
		expect(loaded.activeLayoutId).toBe('cluttered');
		expect(loaded.ownedAtmosphereIds).toEqual([]);
		expect(loaded.unlockedClientTiers).toEqual(['walk-in']);
		expect(loaded.seriesOnBrandFlags).toEqual({});
		expect(loaded.lastIncomeTickAt).toBe(55);
		expect(loaded.cash).toBe(200);
		expect(loaded.skillXpPrompting).toBe(0);
		expect(loaded.skillXpImagination).toBe(0);
		expect(loaded.skillXpHustle).toBe(0);
		expect(getActiveSlotId()).toBe('0');
		expect(storage.getItem(SLOTS_STORAGE_KEY)).not.toBeNull();
	});

	it('round-trips skill XP fields through the active slot', () => {
		const data = createDefaultSave(100, () => 1);
		data.skillXpPrompting = 15;
		data.skillXpImagination = 8;
		data.skillXpHustle = 4;
		persistSave(data);

		const loaded = loadSave(100, () => 0);
		expect(loaded.skillXpPrompting).toBe(15);
		expect(loaded.skillXpImagination).toBe(8);
		expect(loaded.skillXpHustle).toBe(4);
		expect(peekSlot('0', 100)?.skillXpPrompting).toBe(15);
	});

	it('falls back to default when localStorage.getItem throws', () => {
		vi.stubGlobal('localStorage', createMemoryStorage(true));

		expect(() => loadSave(100, () => 42)).not.toThrow();
		expect(loadSave(100, () => 42).cash).toBe(100);
		expect(loadSave(100, () => 42).savedAt).toBe(42);
		expect(loadSave(100, () => 42).lastIncomeTickAt).toBe(42);
	});

	it('falls back to default on malformed slots JSON', () => {
		const storage = createMemoryStorage();
		vi.stubGlobal('localStorage', storage);
		storage.setItem(SLOTS_STORAGE_KEY, '{not-json');

		expect(() => loadSave(100, () => 7)).not.toThrow();
		const loaded = loadSave(100, () => 7);
		expect(loaded.cash).toBe(100);
		expect(loaded.savedAt).toBe(7);
		expect(loaded.lastIncomeTickAt).toBe(7);
	});

	it('round-trips persistSave then loadSave through the active slot', () => {
		const data = createDefaultSave(150, () => 55);
		data.cash = 275;
		data.reputation = 4;
		data.lifetimeCommissions = 2;
		data.lastIncomeTickAt = 55;
		persistSave(data);

		expect(loadSave(100, () => 0)).toEqual(data);
		expect(listSaveSlots()[0].empty).toBe(false);
		expect(listSaveSlots()[0].summary?.cash).toBe(275);
	});

	it('persistSave only mutates the active slot', () => {
		newGameInSlot('0', 100, 'A', () => 1);
		newGameInSlot('1', 100, 'B', () => 2);
		activateSlot('1', 100, () => 2);

		const data = createDefaultSave(100, () => 3);
		data.cash = 888;
		persistSave(data);

		expect(peekSlot('0', 100)?.cash).toBe(100);
		expect(peekSlot('1', 100)?.cash).toBe(888);
	});

	it('does not throw when persistSave setItem throws', () => {
		vi.stubGlobal('localStorage', createMemoryStorage(false, true));
		const data = createDefaultSave(100, () => 1);

		expect(() => persistSave(data)).not.toThrow();
	});

	it('clearSave removes slots so loadSave returns a fresh default', () => {
		persistSave(createDefaultSave(100, () => 1));
		clearSave();

		expect(loadSave(100, () => 2).cash).toBe(100);
		expect(loadSave(100, () => 2).savedAt).toBe(2);
		expect(loadSave(100, () => 2).lastIncomeTickAt).toBe(2);
	});
});
