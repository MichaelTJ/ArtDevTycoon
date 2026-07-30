import { describe, expect, it } from 'vitest';
import { getEnvironmentForLevel } from './environments';

describe('getEnvironmentForLevel', () => {
	it('returns home-kitchen for level 1', () => {
		expect(getEnvironmentForLevel(1).id).toBe('home-kitchen');
		expect(getEnvironmentForLevel(1).levelDisplayName).toBe('Home Kitchen');
	});

	it('falls back to home-kitchen for unknown levels', () => {
		expect(getEnvironmentForLevel(99).id).toBe('home-kitchen');
	});
});
