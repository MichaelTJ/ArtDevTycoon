import { JanusEngine } from '$lib/engines/janus/janusEngine';
import { SdturboEngine } from '$lib/engines/sdturbo/sdturboEngine';
import { hashString } from '$lib/engines/random';
import type { ArtEngine } from '$lib/types/contracts';
import { EXPLORER_PROMPT_CASES } from './prompts';
import { objectUrlToPngBytes, saveResult } from './storage';
import { formatDuration } from './timing';
import type { ExplorerEngineId, ExplorerPromptCase, RunProgress } from './types';

export interface RunOptions {
	engineId: ExplorerEngineId;
	skipExisting: boolean;
	existingCaseIds: Set<string>;
	onProgress: (progress: RunProgress) => void;
	signal?: AbortSignal;
}

function createEngine(engineId: ExplorerEngineId): ArtEngine {
	if (engineId === 'janus-webgpu') {
		return new JanusEngine();
	}
	return new SdturboEngine();
}

function seedForCase(engineId: ExplorerEngineId, caseId: string): number | undefined {
	if (engineId !== 'sdturbo-webgpu') {
		return undefined;
	}
	return hashString(`${engineId}:${caseId}`);
}

function baseProgress(
	engineId: ExplorerEngineId,
	total: number,
	batchStartedAt: number,
	generationMsTotal: number,
	generatedCount: number,
	overrides: Partial<RunProgress>
): RunProgress {
	return {
		status: 'idle',
		engineId,
		current: 0,
		total,
		currentCaseId: null,
		message: 'Ready.',
		error: null,
		lastGenerationMs: null,
		averageGenerationMs: generatedCount > 0 ? generationMsTotal / generatedCount : null,
		elapsedMs: performance.now() - batchStartedAt,
		...overrides
	};
}

export async function runExplorerBatch(options: RunOptions): Promise<void> {
	const { engineId, skipExisting, existingCaseIds, onProgress, signal } = options;
	const pending = EXPLORER_PROMPT_CASES.filter(
		(testCase) => !skipExisting || !existingCaseIds.has(testCase.id)
	);
	const total = pending.length;
	const batchStartedAt = performance.now();
	let generationMsTotal = 0;
	let generatedCount = 0;

	onProgress(
		baseProgress(engineId, total, batchStartedAt, generationMsTotal, generatedCount, {
			status: 'loading-engine',
			message: `Loading ${engineId}…`
		})
	);

	const engine = createEngine(engineId);

	try {
		await engine.load({
			signal,
			onProgress: (loadProgress) => {
				onProgress(
					baseProgress(engineId, total, batchStartedAt, generationMsTotal, generatedCount, {
						status: 'loading-engine',
						message: `Loading model (${Math.round(loadProgress.fraction * 100)}%)…`
					})
				);
			}
		});

		for (let index = 0; index < pending.length; index++) {
			if (signal?.aborted) {
				onProgress(
					baseProgress(engineId, total, batchStartedAt, generationMsTotal, generatedCount, {
						status: 'paused',
						current: index,
						currentCaseId: pending[index]?.id ?? null,
						message: 'Run cancelled.'
					})
				);
				return;
			}

			const testCase = pending[index] as ExplorerPromptCase;
			const caseStartedAt = performance.now();

			onProgress(
				baseProgress(engineId, total, batchStartedAt, generationMsTotal, generatedCount, {
					status: 'running',
					current: index,
					currentCaseId: testCase.id,
					message: `Generating ${index + 1}/${total}: ${testCase.modifier}`
				})
			);

			const seed = seedForCase(engineId, testCase.id);
			const artwork = await engine.generate({
				playerPrompt: testCase.subject,
				prompt: testCase.prompt,
				seed,
				signal
			});
			const afterGenerateAt = performance.now();
			const generationMs = artwork.generationMs;

			let pngBytes: Uint8Array;
			try {
				pngBytes = await objectUrlToPngBytes(artwork.imageUrl);
			} finally {
				URL.revokeObjectURL(artwork.imageUrl);
			}
			const clientEncodeMs = performance.now() - afterGenerateAt;
			const clientTotalMs = performance.now() - caseStartedAt;

			const saved = await saveResult({
				engineId,
				caseId: testCase.id,
				category: testCase.category,
				categoryLabel: testCase.categoryLabel,
				modifier: testCase.modifier,
				subject: testCase.subject,
				prompt: testCase.prompt,
				facets: testCase.facets,
				generationMs,
				clientEncodeMs,
				clientTotalMs,
				seed,
				pngBytes
			});

			generationMsTotal += generationMs;
			generatedCount += 1;

			onProgress(
				baseProgress(engineId, total, batchStartedAt, generationMsTotal, generatedCount, {
					status: 'running',
					current: index + 1,
					currentCaseId: testCase.id,
					lastGenerationMs: generationMs,
					message: `Generated ${index + 1}/${total} in ${formatDuration(generationMs)} (save ${formatDuration(saved.saveMs ?? 0)}, total ${formatDuration(saved.totalMs ?? generationMs)})`
				})
			);
		}

		const elapsedMs = performance.now() - batchStartedAt;
		onProgress(
			baseProgress(engineId, total, batchStartedAt, generationMsTotal, generatedCount, {
				status: 'done',
				current: total,
				averageGenerationMs: generatedCount > 0 ? generationMsTotal / generatedCount : null,
				message: `Finished ${total} generations for ${engineId} in ${formatDuration(elapsedMs)} (avg ${formatDuration(generationMsTotal / Math.max(generatedCount, 1))} per image).`
			})
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown generation error';
		onProgress(
			baseProgress(engineId, total, batchStartedAt, generationMsTotal, generatedCount, {
				status: 'error',
				message: 'Generation failed.',
				error: message
			})
		);
		throw error;
	} finally {
		await engine.unload();
	}
}
