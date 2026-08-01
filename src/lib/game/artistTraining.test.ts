import { describe, expect, it } from 'vitest';
import {
	ARTIST_LEVEL_CAP,
	ASSIGNMENT_XP_REWARD,
	artistLevel,
	artistLevelFill,
	mockArtistScores,
	xpToNextLevel
} from './artistTraining';

describe('artistTraining', () => {
	it('level curve literals', () => {
		expect(artistLevel(0)).toBe(1);
		expect(artistLevel(39)).toBe(1);
		expect(artistLevel(40)).toBe(2);
		expect(artistLevel(200)).toBe(ARTIST_LEVEL_CAP);
	});

	it('xpToNextLevel at level 1', () => {
		expect(xpToNextLevel(0)).toBe(40);
		expect(xpToNextLevel(30)).toBe(10);
	});

	it('fill reaches 1 at cap', () => {
		expect(artistLevelFill(200)).toBe(1);
	});

	it('mock scores scale with level', () => {
		expect(mockArtistScores(1)).toEqual({ accuracy: 6, creativity: 6 });
		expect(mockArtistScores(5)).toEqual({ accuracy: 10, creativity: 10 });
	});

	it('assignment XP reward constant', () => {
		expect(ASSIGNMENT_XP_REWARD).toBe(25);
	});
});
