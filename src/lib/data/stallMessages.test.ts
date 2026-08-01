import { describe, expect, it } from 'vitest';
import {
	FALLBACK_STALL_COPY,
	STALL_COPY_BY_MEDIUM,
	getStallCopy,
	getStallStageLabel,
	rotateStallMessages,
	stallMessagesForArtwork,
	stallSeedFromArtworkId
} from './stallMessages';

describe('stallMessages', () => {
	it('early mediums have at least three stall lines each', () => {
		for (const id of ['crayon', 'pencil', 'ink', 'watercolor']) {
			expect(STALL_COPY_BY_MEDIUM[id]!.messages.length).toBeGreaterThanOrEqual(3);
		}
	});

	it('getStallCopy returns fallback for unknown ids', () => {
		expect(getStallCopy('mystery-medium')).toEqual(FALLBACK_STALL_COPY);
	});

	it('getStallStageLabel matches the medium pool header', () => {
		expect(getStallStageLabel('pencil')).toBe(STALL_COPY_BY_MEDIUM.pencil!.stageLabel);
	});

	it('rotateStallMessages puts seeded line first', () => {
		const pool = ['a', 'b', 'c', 'd'];
		expect(rotateStallMessages(pool, 0)[0]).toBe('a');
		expect(rotateStallMessages(pool, 0.99)[0]).toBe('d');
	});

	it('stallSeedFromArtworkId is stable for the same artwork id', () => {
		expect(stallSeedFromArtworkId('art-42')).toBe(stallSeedFromArtworkId('art-42'));
	});

	it('stallMessagesForArtwork uses medium pool and artwork seed', () => {
		const messages = stallMessagesForArtwork('watercolor', 'test-art');
		const copy = STALL_COPY_BY_MEDIUM.watercolor!;
		expect(messages).toHaveLength(copy.messages.length);
		expect(copy.messages).toContain(messages[0]);
	});

	it('stallMessagesForArtwork uses crayon pool for invalid tier ids', () => {
		const messages = stallMessagesForArtwork('not-a-tier', 'seed-me');
		const copy = STALL_COPY_BY_MEDIUM.crayon!;
		expect(messages).toHaveLength(copy.messages.length);
		expect(copy.messages).toContain(messages[0]);
	});
});
