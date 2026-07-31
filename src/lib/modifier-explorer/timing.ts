import type { ExplorerEngineId, ExplorerResult } from './types';

export interface EngineTimingStats {
	engineId: ExplorerEngineId;
	count: number;
	totalGenerationMs: number;
	totalSaveMs: number;
	totalWallMs: number;
	averageGenerationMs: number;
	averageSaveMs: number;
	averageWallMs: number;
	minGenerationMs: number;
	maxGenerationMs: number;
}

export function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${Math.round(ms)} ms`;
	}
	if (ms < 60_000) {
		return `${(ms / 1000).toFixed(1)} s`;
	}
	const minutes = Math.floor(ms / 60_000);
	const seconds = ((ms % 60_000) / 1000).toFixed(0);
	return `${minutes}m ${seconds}s`;
}

export function computeEngineTimingStats(
	results: readonly ExplorerResult[],
	engineId: ExplorerEngineId
): EngineTimingStats | null {
	const engineResults = results.filter((result) => result.engineId === engineId);
	if (engineResults.length === 0) {
		return null;
	}

	let totalGenerationMs = 0;
	let totalSaveMs = 0;
	let totalWallMs = 0;
	let minGenerationMs = Number.POSITIVE_INFINITY;
	let maxGenerationMs = 0;

	for (const result of engineResults) {
		totalGenerationMs += result.generationMs;
		totalSaveMs += result.saveMs ?? 0;
		totalWallMs += result.totalMs ?? result.generationMs + (result.saveMs ?? 0);
		minGenerationMs = Math.min(minGenerationMs, result.generationMs);
		maxGenerationMs = Math.max(maxGenerationMs, result.generationMs);
	}

	const count = engineResults.length;
	return {
		engineId,
		count,
		totalGenerationMs,
		totalSaveMs,
		totalWallMs,
		averageGenerationMs: totalGenerationMs / count,
		averageSaveMs: totalSaveMs / count,
		averageWallMs: totalWallMs / count,
		minGenerationMs,
		maxGenerationMs
	};
}

export function computeAllEngineTimingStats(
	results: readonly ExplorerResult[]
): EngineTimingStats[] {
	return (['janus-webgpu', 'sdturbo-webgpu'] as const)
		.map((engineId) => computeEngineTimingStats(results, engineId))
		.filter((stats): stats is EngineTimingStats => stats !== null);
}
