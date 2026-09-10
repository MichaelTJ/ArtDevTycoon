import { describe, expect, it } from 'vitest';
import type { LoadProgress } from '$lib/types/contracts';
import { holdPeakProgress } from './holdPeakProgress';

function progress(fraction: number, overrides: Partial<LoadProgress> = {}): LoadProgress {
	return {
		status: 'downloading',
		file: 'weights.bin',
		loadedBytes: Math.round(fraction * 100),
		totalBytes: 100,
		fraction,
		...overrides
	};
}

function overall(fraction: number, loadedBytes: number, totalBytes: number): LoadProgress {
	return {
		status: 'downloading',
		file: null,
		loadedBytes,
		totalBytes,
		fraction
	};
}

function janusProcessorFile(raw: number): LoadProgress {
	return {
		status: 'downloading',
		file: 'tokenizer.json',
		loadedBytes: Math.round(raw * 100),
		totalBytes: 100,
		fraction: Math.min(0.99, raw * 0.15)
	};
}

function janusModelFile(raw: number): LoadProgress {
	return {
		status: 'downloading',
		file: 'onnx/model.onnx',
		loadedBytes: Math.round(raw * 100),
		totalBytes: 100,
		fraction: Math.min(0.99, 0.15 + raw * 0.75)
	};
}

describe('holdPeakProgress', () => {
	it('starts from null', () => {
		expect(holdPeakProgress(null, progress(0.12))?.fraction).toBe(0.12);
	});

	it('keeps 0.78 when a later file reports 0.50', () => {
		expect(holdPeakProgress(progress(0.78), progress(0.5))?.fraction).toBe(0.78);
	});

	it('advances when the next fraction is higher', () => {
		expect(holdPeakProgress(progress(0.5), progress(0.78))?.fraction).toBe(0.78);
	});

	it('ready at 1 always wins', () => {
		expect(holdPeakProgress(progress(0.78), progress(1, { status: 'ready' }))?.fraction).toBe(1);
	});

	it('drops Janus processor 15% and model 90% file remaps', () => {
		expect(holdPeakProgress(null, janusProcessorFile(1))).toBeNull();
		expect(holdPeakProgress(null, janusModelFile(1))).toBeNull();
		expect(holdPeakProgress(janusProcessorFile(1), janusModelFile(1))).toBeNull();
	});

	it('uses HuggingFace overall after dropping the 15%/90% remaps', () => {
		const afterRemaps = holdPeakProgress(
			holdPeakProgress(null, janusProcessorFile(1)),
			janusModelFile(1)
		);
		expect(holdPeakProgress(afterRemaps, overall(0.02, 40_000_000, 2_000_000_000))?.fraction).toBe(
			0.02
		);
	});

	it('does not let a weighted per-file 90% replace overall progress', () => {
		const started = overall(0.02, 40_000_000, 2_000_000_000);
		expect(holdPeakProgress(started, janusModelFile(1))?.fraction).toBe(0.02);
	});

	it('peak-holds HuggingFace overall percents (78 then 50 stays 78)', () => {
		expect(holdPeakProgress(overall(0.78, 78, 100), overall(0.5, 50, 100))?.fraction).toBe(0.78);
	});

	it('starts a new peak when overall loaded bytes reset (next from_pretrained)', () => {
		const processorDone = overall(1, 10_000_000, 10_000_000);
		const modelStart = overall(0.01, 1_000_000, 2_000_000_000);
		expect(holdPeakProgress(processorDone, modelStart)?.fraction).toBe(0.01);
	});

	it('keeps the last overall percent while shaders compile at 90%', () => {
		const downloaded = overall(0.64, 64, 100);
		const compiling: LoadProgress = {
			status: 'compiling',
			file: null,
			loadedBytes: 0,
			totalBytes: 0,
			fraction: 0.9
		};
		expect(holdPeakProgress(downloaded, compiling)?.fraction).toBe(0.64);
	});
});
