import type { LoadProgress } from '$lib/types/contracts';

/** Mirrors `PROCESSOR_WEIGHT` / `MODEL_WEIGHT` in `janus.worker.ts` (do not import the worker). */
const JANUS_PROCESSOR_WEIGHT = 0.15;
const JANUS_MODEL_WEIGHT = 0.75;

/** HuggingFace `progress_total` — overall bytes, not a single file. */
function isOverall(progress: LoadProgress): boolean {
	return progress.file === null && progress.totalBytes > 0;
}

function nearly(a: number, b: number): boolean {
	return Math.abs(a - b) < 0.02;
}

/**
 * Janus remaps each file onto 0–15% (processor) or 15–90% (model). Those two
 * trackers are what flashed 15% then 90% before HuggingFace's overall totals.
 */
function isJanusWeightedFile(progress: LoadProgress): boolean {
	if (progress.file === null || progress.totalBytes <= 0) return false;
	const raw = Math.min(1, Math.max(0, progress.loadedBytes / progress.totalBytes));
	const processor = Math.min(0.99, raw * JANUS_PROCESSOR_WEIGHT);
	const model = Math.min(0.99, JANUS_PROCESSOR_WEIGHT + raw * JANUS_MODEL_WEIGHT);
	return nearly(progress.fraction, processor) || nearly(progress.fraction, model);
}

/**
 * Peak-hold HuggingFace's overall percents during one load.
 * Drop Janus's processor/model file remaps so they never paint 15% or 90%.
 */
export function holdPeakProgress(
	prev: LoadProgress | null,
	next: LoadProgress
): LoadProgress | null {
	if (next.status === 'ready') return next;
	if (isJanusWeightedFile(next)) {
		if (prev === null || isJanusWeightedFile(prev)) return null;
		return prev;
	}

	if (next.status === 'compiling' && next.totalBytes === 0) {
		if (prev === null) return null;
		return { ...next, fraction: prev.fraction };
	}

	if (prev === null) return next;

	const nextOverall = isOverall(next);
	const prevOverall = isOverall(prev);

	if (nextOverall && prevOverall && next.loadedBytes < prev.loadedBytes * 0.5) {
		return next;
	}

	if (nextOverall && !prevOverall) {
		return next;
	}

	if (!nextOverall && prevOverall) {
		return { ...next, fraction: prev.fraction };
	}

	if (next.fraction >= prev.fraction) return next;
	return { ...next, fraction: prev.fraction };
}
