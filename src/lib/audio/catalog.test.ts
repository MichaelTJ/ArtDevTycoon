import { describe, expect, test } from 'vitest';
import { musicBedForVenue, MUSIC_BEDS, SFX } from './catalog';

describe('musicBedForVenue', () => {
	test('fridge → kitchen-hum', () => {
		expect(musicBedForVenue('fridge')).toBe('kitchen-hum');
	});

	test('mega-museum → museum-hush', () => {
		expect(musicBedForVenue('mega-museum')).toBe('museum-hush');
	});

	test('unknown → kitchen-hum', () => {
		expect(musicBedForVenue('nope')).toBe('kitchen-hum');
	});

	test('garage and storefront map correctly', () => {
		expect(musicBedForVenue('garage')).toBe('garage-bed');
		expect(musicBedForVenue('storefront')).toBe('storefront-bed');
		expect(musicBedForVenue('gallery-hall')).toBe('museum-hush');
	});
});

describe('catalog URLs', () => {
	test('every bed and sfx has a studio audio URL', () => {
		for (const clip of Object.values(MUSIC_BEDS)) {
			expect(clip.url.startsWith('/studio/audio/beds/')).toBe(true);
		}
		for (const clip of Object.values(SFX)) {
			expect(clip.url.startsWith('/studio/audio/sfx/')).toBe(true);
		}
	});
});
