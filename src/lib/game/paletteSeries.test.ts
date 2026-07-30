import { describe, expect, it } from 'vitest';
import { checkPaletteUsage, fullyCompletedSeriesIds, seriesCompletionBonus } from './paletteSeries';

describe('checkPaletteUsage', () => {
	it('marks two of three palette words as on brand', () => {
		expect(checkPaletteUsage('a navy and gold skyline', ['navy', 'gold', 'cream'])).toEqual({
			paletteWordsUsed: 2,
			onBrand: true
		});
	});

	it('rejects a single palette hit', () => {
		expect(checkPaletteUsage('a navy skyline', ['navy', 'gold', 'cream'])).toEqual({
			paletteWordsUsed: 1,
			onBrand: false
		});
	});

	it('counts all three palette words', () => {
		expect(checkPaletteUsage('a navy, gold, and cream skyline', ['navy', 'gold', 'cream'])).toEqual(
			{
				paletteWordsUsed: 3,
				onBrand: true
			}
		);
	});
});

describe('seriesCompletionBonus', () => {
	it('pays 300 when all three pieces are on brand', () => {
		expect(seriesCompletionBonus([true, true, true])).toBe(300);
	});

	it('pays 0 when any piece is off brand', () => {
		expect(seriesCompletionBonus([true, false, true])).toBe(0);
	});

	it('pays 0 for an empty flag list', () => {
		expect(seriesCompletionBonus([])).toBe(0);
	});
});

describe('fullyCompletedSeriesIds', () => {
	it('returns series whose every brief id is completed', () => {
		const corporate = [
			{ id: 'corp-1a', seriesId: 'corp-1' },
			{ id: 'corp-1b', seriesId: 'corp-1' },
			{ id: 'corp-1c', seriesId: 'corp-1' },
			{ id: 'corp-2a', seriesId: 'corp-2' }
		] as const;
		expect(fullyCompletedSeriesIds(['corp-1a', 'corp-1b', 'corp-1c'], [...corporate])).toEqual([
			'corp-1'
		]);
	});
});
