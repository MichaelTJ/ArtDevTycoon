import { describe, expect, it } from 'vitest';
import { ARTIST_CATALOG, canHireArtist, receptionistUnlocked } from './artists';

describe('receptionistUnlocked', () => {
	it('is false below gallery-hall', () => {
		expect(receptionistUnlocked('fridge')).toBe(false);
		expect(receptionistUnlocked('garage')).toBe(false);
		expect(receptionistUnlocked('storefront')).toBe(false);
	});

	it('is true from gallery-hall upward', () => {
		expect(receptionistUnlocked('gallery-hall')).toBe(true);
		expect(receptionistUnlocked('mega-museum')).toBe(true);
	});
});

describe('canHireArtist', () => {
	const jade = ARTIST_CATALOG[0];

	it('blocks duplicate hire', () => {
		expect(canHireArtist(jade, { cash: 100, reputation: 10, hiredCatalogIds: ['jade-ink'] })).toBe(
			false
		);
	});

	it('requires cash and reputation', () => {
		expect(canHireArtist(jade, { cash: 44, reputation: 4, hiredCatalogIds: [] })).toBe(false);
		expect(canHireArtist(jade, { cash: 45, reputation: 4, hiredCatalogIds: [] })).toBe(true);
	});
});
