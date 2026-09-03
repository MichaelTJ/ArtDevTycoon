import { describe, expect, it } from 'vitest';
import { makeResult } from './test-fixtures';
import { computeEngineTimingStats, formatDuration } from './timing';

describe('modifier explorer2 timing', () => {
	it('formats durations', () => {
		expect(formatDuration(400)).toBe('400 ms');
		expect(formatDuration(1500)).toBe('1.5 s');
	});

	it('averages generation times per engine', () => {
		const stats = computeEngineTimingStats(
			[
				makeResult({ generationMs: 1000, saveMs: 100, totalMs: 1100 }),
				makeResult({ caseId: 'b', generationMs: 3000, saveMs: 100, totalMs: 3100 })
			],
			'janus-webgpu'
		);
		expect(stats?.averageGenerationMs).toBe(2000);
		expect(stats?.count).toBe(2);
	});
});
