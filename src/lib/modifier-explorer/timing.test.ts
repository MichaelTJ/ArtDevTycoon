import { describe, expect, it } from 'vitest';
import { makeResult } from './test-fixtures';
import { computeEngineTimingStats, formatDuration } from './timing';
import type { ExplorerResult } from './types';

function result(
	generationMs: number,
	saveMs = 10,
	totalMs = generationMs + saveMs
): ExplorerResult {
	return makeResult({
		caseId: `case-${generationMs}`,
		imagePath: `janus-webgpu/case-${generationMs}.png`,
		generationMs,
		saveMs,
		totalMs
	});
}

describe('modifier explorer timing', () => {
	it('formats sub-second durations in ms', () => {
		expect(formatDuration(842)).toBe('842 ms');
	});

	it('formats longer durations in seconds', () => {
		expect(formatDuration(2500)).toBe('2.5 s');
	});

	it('computes per-engine timing aggregates', () => {
		const stats = computeEngineTimingStats(
			[result(1000, 20, 1100), result(3000, 30, 3200)],
			'janus-webgpu'
		);

		expect(stats).not.toBeNull();
		expect(stats?.count).toBe(2);
		expect(stats?.averageGenerationMs).toBe(2000);
		expect(stats?.minGenerationMs).toBe(1000);
		expect(stats?.maxGenerationMs).toBe(3000);
		expect(stats?.totalWallMs).toBe(4300);
	});
});
