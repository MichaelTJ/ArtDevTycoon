import { describe, expect, it } from 'vitest';
import { STAFF_ROLES, canHireStaff, getStaffRole, totalIncomePerSecond } from './staffRoles';

describe('STAFF_ROLES', () => {
	it('has four roles with distinct ids', () => {
		expect(STAFF_ROLES).toHaveLength(4);
		const ids = STAFF_ROLES.map((r) => r.id);
		expect(new Set(ids).size).toBe(4);
	});
});

describe('getStaffRole', () => {
	it('returns undefined for unknown ids', () => {
		expect(getStaffRole('nonexistent')).toBeUndefined();
	});

	it('returns the apprentice by id', () => {
		expect(getStaffRole('apprentice')?.name).toBe('The Apprentice');
	});
});

describe('totalIncomePerSecond', () => {
	it('is 0 for an empty hire list', () => {
		expect(totalIncomePerSecond([])).toBe(0);
	});

	it('sums apprentice and print-shop to 0.17', () => {
		expect(totalIncomePerSecond(['apprentice', 'print-shop'])).toBeCloseTo(0.17, 10);
	});

	it('ignores unknown ids without throwing', () => {
		expect(totalIncomePerSecond(['apprentice', 'nonexistent'])).toBe(0.05);
	});
});

describe('canHireStaff', () => {
	const apprentice = getStaffRole('apprentice');

	it('is true at the inclusive cash and reputation boundary', () => {
		expect(apprentice).toBeDefined();
		if (!apprentice) return;
		expect(canHireStaff(apprentice, { cash: 800, reputation: 8 })).toBe(true);
	});

	it('is false when cash is one below the cost', () => {
		expect(apprentice).toBeDefined();
		if (!apprentice) return;
		expect(canHireStaff(apprentice, { cash: 799, reputation: 8 })).toBe(false);
	});

	it('is false when reputation is one below the requirement', () => {
		expect(apprentice).toBeDefined();
		if (!apprentice) return;
		expect(canHireStaff(apprentice, { cash: 800, reputation: 7 })).toBe(false);
	});
});
