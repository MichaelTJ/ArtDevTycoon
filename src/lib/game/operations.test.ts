import { describe, expect, it } from 'vitest';
import {
	buildOperationalSnapshot,
	buildOperationsSummary,
	filterGalleryEntries,
	identifyOperationalNeeds,
	type OperationsQuery
} from './operations';
import type { GalleryEntry } from '$lib/types/contracts';

const sampleEntries: GalleryEntry[] = [
	{
		id: 'g3',
		imageUrl: '/a3.png',
		title: 'Regal Cat',
		payout: 120,
		score: 8.5,
		clientName: 'Cat Enthusiast',
		briefId: 'c3',
		completedAt: 3000
	},
	{
		id: 'g2',
		imageUrl: '/a2.png',
		title: 'Magic Sword',
		payout: 45,
		score: 4.2,
		clientName: 'Fantasy Novelist',
		briefId: 'c2',
		completedAt: 2000
	},
	{
		id: 'g1',
		imageUrl: '/a1.png',
		title: 'Morning Coffee',
		payout: 110,
		score: 6.5,
		clientName: 'Local Cafe Owner',
		briefId: 'c1',
		completedAt: 1000
	}
];

describe('filterGalleryEntries', () => {
	it('returns all entries when query is empty', () => {
		const query: OperationsQuery = { search: '', filter: 'all' };
		const { filtered, totalMatching } = filterGalleryEntries(sampleEntries, query);
		expect(filtered).toHaveLength(3);
		expect(totalMatching).toBe(3);
	});

	it('filters by search text across title and client', () => {
		const query: OperationsQuery = { search: 'cat', filter: 'all' };
		const { filtered } = filterGalleryEntries(sampleEntries, query);
		expect(filtered.map((entry) => entry.id)).toEqual(['g3']);
	});

	it('filters low-score entries', () => {
		const query: OperationsQuery = { search: '', filter: 'low-score' };
		const { filtered } = filterGalleryEntries(sampleEntries, query);
		expect(filtered.map((entry) => entry.id)).toEqual(['g2']);
	});

	it('filters high-payout entries', () => {
		const query: OperationsQuery = { search: '', filter: 'high-payout' };
		const { filtered } = filterGalleryEntries(sampleEntries, query);
		expect(filtered.map((entry) => entry.id)).toEqual(['g3', 'g1']);
	});

	it('keeps only the three newest entries for the recent filter', () => {
		const query: OperationsQuery = { search: '', filter: 'recent' };
		const extended = [
			...sampleEntries,
			{
				id: 'g0',
				imageUrl: '/a0.png',
				title: 'Old Piece',
				payout: 50,
				score: 5,
				clientName: 'Old Client',
				briefId: 'c0',
				completedAt: 500
			}
		];
		const { filtered } = filterGalleryEntries(extended, query);
		expect(filtered.map((entry) => entry.id)).toEqual(['g3', 'g2', 'g1']);
	});
});

describe('identifyOperationalNeeds', () => {
	it('flags failed commissions as critical', () => {
		const needs = identifyOperationalNeeds({
			phase: 'failed',
			cash: 100,
			commissionsCompleted: 0,
			galleryHistory: [],
			errorMessage: 'Generation timed out.',
			currentClient: null
		});

		expect(
			needs.some((need) => need.id === 'commission-failed' && need.urgency === 'critical')
		).toBe(true);
	});

	it('flags waiting payment and win-condition gaps', () => {
		const needs = identifyOperationalNeeds({
			phase: 'results',
			cash: 200,
			commissionsCompleted: 2,
			galleryHistory: sampleEntries,
			errorMessage: null,
			currentClient: null
		});

		expect(needs.some((need) => need.id === 'collect-cash')).toBe(true);
		expect(needs.some((need) => need.id === 'cash-gap')).toBe(true);
		expect(needs.some((need) => need.id === 'commissions-gap')).toBe(true);
	});
});

describe('buildOperationsSummary', () => {
	it('summarises earnings and progress', () => {
		const summary = buildOperationsSummary({
			phase: 'idle',
			cash: 275,
			commissionsCompleted: 3,
			galleryHistory: sampleEntries,
			errorMessage: null,
			currentClient: null
		});

		expect(summary.totalEarnings).toBe(275);
		expect(summary.averageScore).toBe(6.4);
		expect(summary.cashRemaining).toBe(225);
		expect(summary.commissionsRemaining).toBe(2);
		expect(summary.headline).toContain('3 pieces');
	});
});

describe('buildOperationalSnapshot', () => {
	it('combines filtering, needs, and summary', () => {
		const snapshot = buildOperationalSnapshot({
			phase: 'briefing',
			cash: 100,
			commissionsCompleted: 1,
			galleryHistory: sampleEntries,
			errorMessage: null,
			currentClient: {
				id: 'c4',
				clientName: 'Retired Sailor',
				avatarUrl: '/avatars/c4.svg',
				requestText: 'A sailboat.',
				budget: 130,
				preferredKeywords: ['sailboat']
			},
			query: { search: 'coffee', filter: 'all' }
		});

		expect(snapshot.filteredEntries).toHaveLength(1);
		expect(snapshot.totalMatching).toBe(1);
		expect(snapshot.needs.some((need) => need.id === 'client-waiting')).toBe(true);
		expect(snapshot.summary.completedCount).toBe(3);
	});
});
