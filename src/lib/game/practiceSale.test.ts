import { describe, expect, it } from 'vitest';
import {
	canListPracticeForSale,
	clampAskingPrice,
	practiceAsGalleryEntry,
	practiceBuyChance,
	practiceBuyerLabel,
	practiceClientMarket,
	practiceFairValue,
	tickPracticeSales,
	type PracticeArtwork
} from './practiceSale';

function listed(partial: Partial<PracticeArtwork> & Pick<PracticeArtwork, 'id'>): PracticeArtwork {
	return {
		imageUrl: 'data:image/png;base64,aa',
		title: 'Practice — Crayons & Construction Paper',
		mediumTierId: 'watercolor',
		strokeMs: 45_000,
		coverage01: 0.25,
		skillLevel: 4,
		askingPrice: 22,
		location: 'gallery',
		createdAt: 1,
		...partial
	};
}

describe('practiceClientMarket', () => {
	it('pins Spec 15 reputation gates', () => {
		expect(practiceClientMarket(0)).toBe(1);
		expect(practiceClientMarket(11)).toBe(1);
		expect(practiceClientMarket(12)).toBe(4);
		expect(practiceClientMarket(29)).toBe(4);
		expect(practiceClientMarket(30)).toBe(10);
		expect(practiceClientMarket(50)).toBe(12);
	});
});

describe('practiceFairValue', () => {
	it('matches the literal economy table', () => {
		expect(
			practiceFairValue({
				mediumTierId: 'crayon',
				strokeMs: 0,
				coverage01: 0,
				skillLevel: 1,
				venueId: 'fridge',
				reputation: 0
			})
		).toBe(1);
		expect(
			practiceFairValue({
				mediumTierId: 'crayon',
				strokeMs: 8_000,
				coverage01: 0.02,
				skillLevel: 1,
				venueId: 'fridge',
				reputation: 0
			})
		).toBe(1);
		expect(
			practiceFairValue({
				mediumTierId: 'crayon',
				strokeMs: 90_000,
				coverage01: 0.4,
				skillLevel: 1,
				venueId: 'fridge',
				reputation: 0
			})
		).toBe(2);
		expect(
			practiceFairValue({
				mediumTierId: 'oil',
				strokeMs: 90_000,
				coverage01: 0.5,
				skillLevel: 7,
				venueId: 'fridge',
				reputation: 0
			})
		).toBe(17);
		expect(
			practiceFairValue({
				mediumTierId: 'watercolor',
				strokeMs: 45_000,
				coverage01: 0.25,
				skillLevel: 4,
				venueId: 'storefront',
				reputation: 0
			})
		).toBe(5);
		expect(
			practiceFairValue({
				mediumTierId: 'watercolor',
				strokeMs: 45_000,
				coverage01: 0.25,
				skillLevel: 4,
				venueId: 'storefront',
				reputation: 12
			})
		).toBe(22);
		expect(
			practiceFairValue({
				mediumTierId: 'oil',
				strokeMs: 90_000,
				coverage01: 0.5,
				skillLevel: 7,
				venueId: 'mega-museum',
				reputation: 0
			})
		).toBe(69);
		expect(
			practiceFairValue({
				mediumTierId: 'oil',
				strokeMs: 90_000,
				coverage01: 0.5,
				skillLevel: 7,
				venueId: 'mega-museum',
				reputation: 30
			})
		).toBe(690);
		expect(
			practiceFairValue({
				mediumTierId: 'oil',
				strokeMs: 90_000,
				coverage01: 0.5,
				skillLevel: 7,
				venueId: 'mega-museum',
				reputation: 50
			})
		).toBe(828);
		expect(
			practiceFairValue({
				mediumTierId: 'nope',
				strokeMs: 90_000,
				coverage01: 1,
				skillLevel: 7,
				venueId: 'fridge',
				reputation: 0
			})
		).toBe(8);
	});
});

describe('practiceBuyChance', () => {
	it('matches the literal chance table', () => {
		expect(practiceBuyChance(22, 22)).toBe(0.28);
		expect(practiceBuyChance(10, 22)).toBe(0.5);
		expect(practiceBuyChance(80, 22)).toBe(0);
		expect(practiceBuyChance(1, 1)).toBe(0.07);
		expect(practiceBuyChance(20, 1)).toBe(0);
		expect(practiceBuyChance(0, 22)).toBe(0);
		expect(practiceBuyChance(690, 690)).toBe(0.28);
	});
});

describe('canListPracticeForSale', () => {
	it('requires 8s stroke and 2% coverage', () => {
		expect(canListPracticeForSale({ strokeMs: 7999, coverage01: 0.5 })).toBe(false);
		expect(canListPracticeForSale({ strokeMs: 8000, coverage01: 0.019 })).toBe(false);
		expect(canListPracticeForSale({ strokeMs: 8000, coverage01: 0.02 })).toBe(true);
	});
});

describe('clampAskingPrice', () => {
	it('clamps to 1–9999 and rounds', () => {
		expect(clampAskingPrice(Number.NaN)).toBe(1);
		expect(clampAskingPrice(0)).toBe(1);
		expect(clampAskingPrice(10_000)).toBe(9999);
		expect(clampAskingPrice(4.6)).toBe(5);
	});
});

describe('tickPracticeSales', () => {
	it('returns null when nothing is listed', () => {
		expect(
			tickPracticeSales({
				artworks: [listed({ id: 'stored', location: 'storage', askingPrice: null })],
				venueId: 'storefront',
				reputation: 12,
				random: () => 0
			})
		).toEqual({ soldId: null });
	});

	it('returns null when chance is 0', () => {
		expect(
			tickPracticeSales({
				artworks: [listed({ id: 'overpriced', askingPrice: 80 })],
				venueId: 'storefront',
				reputation: 12,
				random: () => 0
			})
		).toEqual({ soldId: null });
	});

	it('sells when the buy roll is below chance', () => {
		const rolls = [0, 0.27];
		expect(
			tickPracticeSales({
				artworks: [listed({ id: 'sold-me' })],
				venueId: 'storefront',
				reputation: 12,
				random: () => rolls.shift() ?? 1
			})
		).toEqual({ soldId: 'sold-me' });
	});

	it('misses when the buy roll is >= chance', () => {
		const rolls = [0, 0.28];
		expect(
			tickPracticeSales({
				artworks: [listed({ id: 'walked-away' })],
				venueId: 'storefront',
				reputation: 12,
				random: () => rolls.shift() ?? 1
			})
		).toEqual({ soldId: null });
	});

	it('picks the second listed piece when the pick roll is 0.6', () => {
		const rolls = [0.6, 0];
		expect(
			tickPracticeSales({
				artworks: [listed({ id: 'first' }), listed({ id: 'second' })],
				venueId: 'storefront',
				reputation: 12,
				random: () => rolls.shift() ?? 1
			})
		).toEqual({ soldId: 'second' });
	});
});

describe('practiceBuyerLabel', () => {
	it('names the visitor by venue', () => {
		expect(practiceBuyerLabel('fridge')).toBe('A neighbour');
		expect(practiceBuyerLabel('garage')).toBe('A neighbour');
		expect(practiceBuyerLabel('storefront')).toBe('A passer-by');
		expect(practiceBuyerLabel('gallery-hall')).toBe('A visitor');
		expect(practiceBuyerLabel('mega-museum')).toBe('A collector');
		expect(practiceBuyerLabel('nope')).toBe('A neighbour');
	});
});

describe('practiceAsGalleryEntry', () => {
	it('builds a synthetic gallery row', () => {
		const piece = listed({ id: 'p1', askingPrice: 4, createdAt: 99 });
		expect(practiceAsGalleryEntry(piece)).toEqual({
			id: 'p1',
			imageUrl: piece.imageUrl,
			title: piece.title,
			payout: 4,
			score: 1,
			clientName: 'Practice',
			briefId: 'practice:p1',
			completedAt: 99
		});
	});
});
