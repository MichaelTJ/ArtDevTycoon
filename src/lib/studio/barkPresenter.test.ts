import { describe, expect, it } from 'vitest';
import { shouldShowBark } from './barkPresenter';

describe('shouldShowBark', () => {
	it('allows idle without prompt', () => {
		expect(shouldShowBark({ phase: 'idle', promptVisible: false })).toBe(true);
	});

	it('skips when prompt covers the speaker', () => {
		expect(shouldShowBark({ phase: 'idle', promptVisible: true })).toBe(false);
	});

	it('skips non-idle phases', () => {
		expect(shouldShowBark({ phase: 'briefing', promptVisible: false })).toBe(false);
		expect(shouldShowBark({ phase: 'generating', promptVisible: false })).toBe(false);
		expect(shouldShowBark({ phase: 'critiquing', promptVisible: false })).toBe(false);
	});
});
