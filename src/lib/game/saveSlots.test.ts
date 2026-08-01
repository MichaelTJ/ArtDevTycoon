import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVE_STORAGE_KEY, createDefaultSave, loadSave, persistSave, type SaveData } from './save';
import {
	SLOTS_STORAGE_KEY,
	activateSlot,
	copySlot,
	deleteSlot,
	ensureSaveSlotsMigrated,
	getActiveSlotId,
	listSaveSlots,
	newGameInSlot,
	peekSlot,
	renameSlot,
	setActiveSlotId
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

function filledSave(overrides: Partial<SaveData> = {}, now = () => 1_700_000_000_000): SaveData {
	return {
		...createDefaultSave(100, now),
		cash: 340,
		reputation: 12,
		lifetimeCommissions: 3,
		skillXpPrompting: 15,
		skillXpImagination: 8,
		skillXpHustle: 4,
		lastIncomeTickAt: now(),
		...overrides
	};
}

describe('saveSlots migration', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createMemoryStorage());
	});

	it('no keys → 3 empty slots; active 0', () => {
		const file = ensureSaveSlotsMigrated(100, () => 1);
		expect(file.slots['0'].meta.empty).toBe(true);
		expect(file.slots['1'].meta.empty).toBe(true);
		expect(file.slots['2'].meta.empty).toBe(true);
		expect(getActiveSlotId()).toBe('0');
		expect(listSaveSlots()).toEqual([
			{ id: '0', name: 'Slot 1', savedAt: 0, empty: true },
			{ id: '1', name: 'Slot 2', savedAt: 0, empty: true },
			{ id: '2', name: 'Slot 3', savedAt: 0, empty: true }
		]);
	});

	it('legacy valid adt.save.v1 only → slot 0 filled; 1+2 empty; active 0', () => {
		const legacy = filledSave({ savedAt: 99 });
		localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

		const file = ensureSaveSlotsMigrated(100, () => 1);
		expect(file.slots['0'].meta.empty).toBe(false);
		expect(file.slots['0'].data?.cash).toBe(340);
		expect(file.slots['0'].data?.skillXpPrompting).toBe(15);
		expect(file.slots['0'].meta.savedAt).toBe(99);
		expect(file.slots['1'].meta.empty).toBe(true);
		expect(file.slots['2'].meta.empty).toBe(true);
		expect(getActiveSlotId()).toBe('0');
		expect(localStorage.getItem(SAVE_STORAGE_KEY)).toBeNull();
	});

	it('valid slots file already → unchanged; legacy ignored', () => {
		newGameInSlot('1', 100, 'Kitchen', () => 50);
		const before = localStorage.getItem(SLOTS_STORAGE_KEY);
		localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(filledSave({ cash: 999 })));

		ensureSaveSlotsMigrated(100, () => 1);
		expect(localStorage.getItem(SLOTS_STORAGE_KEY)).toBe(before);
		expect(getActiveSlotId()).toBe('1');
		expect(peekSlot('1', 100)?.cash).toBe(100);
		expect(peekSlot('0', 100)).toBeNull();
	});

	it('corrupt slots JSON → fall back to empty (+ legacy migrate if present)', () => {
		localStorage.setItem(SLOTS_STORAGE_KEY, '{not-json');
		const legacy = filledSave({ cash: 222, savedAt: 7 });
		localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

		const file = ensureSaveSlotsMigrated(100, () => 1);
		expect(file.slots['0'].meta.empty).toBe(false);
		expect(file.slots['0'].data?.cash).toBe(222);
		expect(file.slots['1'].meta.empty).toBe(true);
		expect(getActiveSlotId()).toBe('0');
	});

	it('localStorage throw → in-memory empty file, never throws', () => {
		vi.stubGlobal('localStorage', createMemoryStorage(true));
		expect(() => ensureSaveSlotsMigrated(100, () => 1)).not.toThrow();
		const file = ensureSaveSlotsMigrated(100, () => 1);
		expect(file.slots['0'].meta.empty).toBe(true);
	});
});

describe('saveSlots activate / new / delete / rename / copy', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createMemoryStorage());
	});

	it("newGameInSlot('1', 100, 'Kitchen') → slot 1 non-empty, cash 100, name Kitchen, active 1", () => {
		const data = newGameInSlot('1', 100, 'Kitchen', () => 42);
		expect(data.cash).toBe(100);
		expect(getActiveSlotId()).toBe('1');
		const list = listSaveSlots();
		expect(list[1]).toMatchObject({
			id: '1',
			name: 'Kitchen',
			empty: false,
			summary: { cash: 100, reputation: 0, lifetimeCommissions: 0 }
		});
	});

	it('persistSave after activate 1 → only slot 1 data changes', () => {
		newGameInSlot('0', 100, 'A', () => 1);
		const slot0 = peekSlot('0', 100)!;
		slot0.cash = 200;
		persistSave(slot0);

		newGameInSlot('1', 100, 'B', () => 2);
		activateSlot('1', 100, () => 2);
		const active = loadSave(100, () => 2);
		active.cash = 555;
		active.skillXpHustle = 9;
		active.savedAt = 3;
		persistSave(active);

		expect(peekSlot('0', 100)?.cash).toBe(200);
		expect(peekSlot('1', 100)?.cash).toBe(555);
		expect(peekSlot('1', 100)?.skillXpHustle).toBe(9);
		expect(peekSlot('2', 100)).toBeNull();
	});

	it("deleteSlot('1') while active 1 and slot 0 filled → active 0; slot 1 empty", () => {
		newGameInSlot('0', 100, 'Keep', () => 1);
		const keep = peekSlot('0', 100)!;
		keep.cash = 400;
		persistSave(keep);

		newGameInSlot('1', 100, 'Drop', () => 2);
		expect(getActiveSlotId()).toBe('1');

		deleteSlot('1', 100, () => 3);
		expect(getActiveSlotId()).toBe('0');
		expect(listSaveSlots()[1].empty).toBe(true);
		expect(peekSlot('0', 100)?.cash).toBe(400);
	});

	it('deleteSlot all → active 0 with fresh default save (non-empty)', () => {
		newGameInSlot('0', 100, 'A', () => 1);
		newGameInSlot('1', 100, 'B', () => 2);
		newGameInSlot('2', 100, 'C', () => 3);

		deleteSlot('0', 100, () => 4);
		deleteSlot('1', 100, () => 5);
		deleteSlot('2', 100, () => 6);

		expect(getActiveSlotId()).toBe('0');
		expect(listSaveSlots()[0].empty).toBe(false);
		expect(peekSlot('0', 100)?.cash).toBe(100);
		expect(listSaveSlots()[1].empty).toBe(true);
		expect(listSaveSlots()[2].empty).toBe(true);
	});

	it("copySlot('0','2') → slot 2 equals 0 data; names independent", () => {
		newGameInSlot('0', 100, 'Original', () => 1);
		activateSlot('0', 100, () => 1);
		const data = loadSave(100, () => 1);
		data.cash = 777;
		data.reputation = 5;
		data.skillXpPrompting = 20;
		data.savedAt = 10;
		persistSave(data);
		renameSlot('2', 'Target Name');

		copySlot('0', '2', () => 11);

		expect(peekSlot('2', 100)?.cash).toBe(777);
		expect(peekSlot('2', 100)?.skillXpPrompting).toBe(20);
		expect(listSaveSlots()[0].name).toBe('Original');
		expect(listSaveSlots()[2].name).toBe('Target Name');
		expect(listSaveSlots()[2].empty).toBe(false);
	});

	it('renameSlot trims, no-ops on empty, clamps to 24', () => {
		newGameInSlot('0', 100, 'Old', () => 1);
		renameSlot('0', '   ');
		expect(listSaveSlots()[0].name).toBe('Old');
		renameSlot('0', '  Fresh Name  ');
		expect(listSaveSlots()[0].name).toBe('Fresh Name');
		renameSlot('0', 'abcdefghijklmnopqrstuvwxyz');
		expect(listSaveSlots()[0].name).toBe('abcdefghijklmnopqrstuvwx');
		expect(listSaveSlots()[0].name.length).toBe(24);
	});

	it('setActiveSlotId / activateSlot / peekSlot round-trip', () => {
		newGameInSlot('2', 150, 'Empire', () => 9);
		setActiveSlotId('0');
		expect(getActiveSlotId()).toBe('0');
		const activated = activateSlot('2', 150, () => 9);
		expect(getActiveSlotId()).toBe('2');
		expect(activated.cash).toBe(150);
		expect(peekSlot('2', 150)?.cash).toBe(150);
	});

	it('copySlot no-op when source empty', () => {
		ensureSaveSlotsMigrated(100);
		copySlot('0', '1', () => 1);
		expect(listSaveSlots()[1].empty).toBe(true);
	});
});
