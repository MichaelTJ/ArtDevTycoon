import { describe, expect, it } from 'vitest';
import { ATMOSPHERE_ITEMS, getAtmosphereItem, totalAtmosphereBonus } from './galleryAtmosphere';

describe('ATMOSPHERE_ITEMS', () => {
	it('has exactly five items', () => {
		expect(ATMOSPHERE_ITEMS).toHaveLength(5);
	});
});

describe('getAtmosphereItem', () => {
	it('returns the matching item', () => {
		expect(getAtmosphereItem('velvet-ropes')?.name).toBe('Velvet Ropes');
	});

	it('returns undefined for unknown ids', () => {
		expect(getAtmosphereItem('nope')).toBeUndefined();
	});
});

describe('totalAtmosphereBonus', () => {
	it('returns 0 for an empty ownership list', () => {
		expect(totalAtmosphereBonus([])).toBe(0);
	});

	it('sums bonuses for owned items', () => {
		expect(totalAtmosphereBonus(['gallery-lighting', 'velvet-ropes'])).toBe(0.13);
	});

	it('ignores unknown ids without throwing', () => {
		expect(totalAtmosphereBonus(['gallery-lighting', 'nope', 'velvet-ropes'])).toBe(0.13);
	});
});
