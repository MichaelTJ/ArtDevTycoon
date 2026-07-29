import {
	AutoProcessor,
	MultiModalityCausalLM,
	RawImage,
	type ProgressCallback
} from '@huggingface/transformers';
import type {
	EngineErrorCode,
	LoadProgress,
	WorkerRequest,
	WorkerResponse
} from '$lib/types/contracts';
import { rawImageToBitmap } from './imageConversion';

const MODEL_ID = 'onnx-community/Janus-Pro-1B-ONNX';
const CRITIQUE_SIZE = 384;
const YES_NO_MAX_TOKENS = 8;
const REVIEW_MAX_TOKENS = 64;

type ProcessorInstance = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> & {
	num_image_tokens: number;
};

type ModelInstance = Awaited<ReturnType<typeof MultiModalityCausalLM.from_pretrained>> & {
	generate_images: (
		options: Record<string, unknown>
	) => Promise<
		Array<{ data: Uint8Array | Uint8ClampedArray; width: number; height: number; channels: number }>
	>;
	generate: (
		options: Record<string, unknown>
	) => Promise<{ slice: (dim: null, range: [number, null]) => unknown }>;
};

let processor: ProcessorInstance | null = null;
let model: ModelInstance | null = null;
let loadPromise: Promise<void> | null = null;
let cancelledRequestId: string | null = null;

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
	void handleRequest(event.data);
});

async function handleRequest(request: WorkerRequest): Promise<void> {
	if (request.type === 'cancel') {
		if (cancelledRequestId === null) {
			cancelledRequestId = request.id;
		}
		return;
	}

	if (request.type === 'unload') {
		processor = null;
		model = null;
		loadPromise = null;
		postReply({ type: 'unloaded', id: request.id });
		return;
	}

	if (request.type === 'load') {
		try {
			await ensureLoaded(request.id, (progress) => {
				postReply({ type: 'progress', id: request.id, progress });
			});
			postReply({ type: 'loaded', id: request.id });
		} catch (error) {
			postError(request.id, error);
		}
		return;
	}

	if (request.type === 'generate') {
		cancelledRequestId = null;
		try {
			await ensureLoaded(request.id);
			if (isCancelled(request.id)) {
				throw cancelledError();
			}

			const started = performance.now();
			const bitmap = await generateImage(request.id, request.prompt);
			const generationMs = Math.max(0, Math.round(performance.now() - started));
			postReply({ type: 'generated', id: request.id, imageBitmap: bitmap, generationMs }, [bitmap]);
		} catch (error) {
			postError(request.id, error);
		}
		return;
	}

	if (request.type === 'critique') {
		cancelledRequestId = null;
		try {
			await ensureLoaded(request.id);
			if (isCancelled(request.id)) {
				throw cancelledError();
			}

			const rawImage = await bitmapToRawImage(request.imageBitmap);
			request.imageBitmap.close();

			const answers: string[] = [];
			for (const question of request.questions) {
				if (isCancelled(request.id)) {
					throw cancelledError();
				}
				answers.push(await askQuestion(rawImage, question, YES_NO_MAX_TOKENS));
			}

			if (isCancelled(request.id)) {
				throw cancelledError();
			}

			const review = await askQuestion(rawImage, request.reviewPrompt, REVIEW_MAX_TOKENS);
			postReply({ type: 'critiqued', id: request.id, answers, review });
		} catch (error) {
			postError(request.id, error);
		}
	}
}

async function ensureLoaded(
	requestId: string,
	onProgress?: (progress: LoadProgress) => void
): Promise<void> {
	if (processor && model) {
		return;
	}

	if (!loadPromise) {
		loadPromise = loadModel(onProgress ?? (() => undefined));
	} else if (onProgress) {
		// Second load call waits on the in-flight download; progress is only wired to the first caller.
	}

	await loadPromise;

	if (isCancelled(requestId)) {
		throw cancelledError();
	}
}

async function loadModel(onProgress: (progress: LoadProgress) => void): Promise<void> {
	if (!('gpu' in navigator)) {
		throw workerError('webgpu_unavailable', 'WebGPU is not available on this device.');
	}

	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) {
		throw workerError('webgpu_unavailable', 'WebGPU is not available on this device.');
	}

	const fp16Supported = adapter.features.has('shader-f16');

	let totalLoaded = 0;
	let totalBytes = 0;
	let sawProgress = false;

	const progress_callback: ProgressCallback = (report) => {
		sawProgress = true;
		if (report.status === 'progress') {
			totalLoaded += report.loaded ?? 0;
			totalBytes += report.total ?? 0;
			const fraction =
				totalBytes > 0 ? Math.min(1, totalLoaded / totalBytes) : (report.progress ?? 0);
			onProgress({
				status: 'downloading',
				file: report.file ?? report.name ?? null,
				loadedBytes: totalLoaded,
				totalBytes,
				fraction
			});
		}
	};

	processor = (await AutoProcessor.from_pretrained(MODEL_ID, {
		progress_callback
	})) as ProcessorInstance;

	model = (await MultiModalityCausalLM.from_pretrained(MODEL_ID, {
		dtype: fp16Supported
			? {
					prepare_inputs_embeds: 'q4',
					language_model: 'q4f16',
					lm_head: 'fp16',
					gen_head: 'fp16',
					gen_img_embeds: 'fp16',
					image_decode: 'fp32'
				}
			: {
					prepare_inputs_embeds: 'fp32',
					language_model: 'q4',
					lm_head: 'fp32',
					gen_head: 'fp32',
					gen_img_embeds: 'fp32',
					image_decode: 'fp32'
				},
		device: {
			prepare_inputs_embeds: 'wasm',
			language_model: 'webgpu',
			lm_head: 'webgpu',
			gen_head: 'webgpu',
			gen_img_embeds: 'webgpu',
			image_decode: 'webgpu'
		},
		progress_callback
	})) as ModelInstance;

	if (sawProgress) {
		onProgress({
			status: 'compiling',
			file: null,
			loadedBytes: totalBytes,
			totalBytes,
			fraction: 1
		});
	}

	onProgress({
		status: 'ready',
		file: null,
		loadedBytes: totalBytes,
		totalBytes,
		fraction: 1
	});
}

async function generateImage(requestId: string, prompt: string): Promise<ImageBitmap> {
	if (!processor || !model) {
		throw workerError('internal', 'Model is not loaded.');
	}

	const conversation = [{ role: '<|User|>', content: prompt }];
	const inputs = await processor(conversation, { chat_template: 'text_to_image' });
	const numImageTokens = processor.num_image_tokens;

	let tokenCount = -1;
	const progressStreamer = {
		put: () => {
			tokenCount += 1;
			if (tokenCount > 0 && tokenCount % 8 === 0) {
				postReply({
					type: 'progress',
					id: requestId,
					progress: {
						status: 'compiling',
						file: null,
						loadedBytes: 0,
						totalBytes: 0,
						fraction: tokenCount / numImageTokens
					}
				});
			}
		},
		end: () => undefined
	};

	const outputs = await model.generate_images({
		...inputs,
		min_new_tokens: numImageTokens,
		max_new_tokens: numImageTokens,
		do_sample: true,
		streamer: progressStreamer
	});

	const rawImage = outputs[0];
	return rawImageToBitmap({
		data: rawImage.data,
		width: rawImage.width,
		height: rawImage.height,
		channels: rawImage.channels
	});
}

async function askQuestion(
	rawImage: RawImage,
	question: string,
	maxTokens: number
): Promise<string> {
	if (!processor || !model) {
		throw workerError('internal', 'Model is not loaded.');
	}

	const conversation = [
		{
			role: '<|User|>',
			content: `<image_placeholder>\n${question}`,
			images: [rawImage]
		}
	];
	const inputs = await processor(conversation);
	const outputs = await model.generate({
		...inputs,
		max_new_tokens: maxTokens,
		do_sample: false
	});

	const promptLength = inputs.input_ids.dims.at(-1) ?? 0;
	const tokenOutput = outputs as { slice: (dim: null, range: [number, null]) => unknown };
	const generated = tokenOutput.slice(null, [promptLength, null]) as Parameters<
		ProcessorInstance['batch_decode']
	>[0];
	return processor
		.batch_decode(generated, {
			skip_special_tokens: true
		})[0]
		.trim();
}

async function bitmapToRawImage(bitmap: ImageBitmap): Promise<RawImage> {
	const canvas = new OffscreenCanvas(CRITIQUE_SIZE, CRITIQUE_SIZE);
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw workerError('internal', 'Could not prepare image for critique.');
	}

	ctx.drawImage(bitmap, 0, 0, CRITIQUE_SIZE, CRITIQUE_SIZE);
	return RawImage.fromCanvas(canvas);
}

function isCancelled(requestId: string): boolean {
	return cancelledRequestId === requestId;
}

function cancelledError(): Error {
	return workerError('cancelled', 'The operation was cancelled.');
}

function workerError(code: EngineErrorCode, message: string): Error {
	const err = new Error(message) as Error & { code: EngineErrorCode };
	err.code = code;
	return err;
}

function postReply(message: WorkerResponse, transfer: Transferable[] = []): void {
	if (transfer.length > 0) {
		self.postMessage(message, { transfer });
	} else {
		self.postMessage(message);
	}
}

function postError(id: string, error: unknown): void {
	const code = readErrorCode(error);
	const message =
		error instanceof Error && error.message.trim().length > 0
			? error.message
			: 'Something went wrong. Please try again.';
	postReply({ type: 'error', id, message, code });
}

function readErrorCode(error: unknown): EngineErrorCode {
	if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
		const code = error.code;
		if (
			code === 'webgpu_unavailable' ||
			code === 'out_of_memory' ||
			code === 'download_failed' ||
			code === 'generation_failed' ||
			code === 'critique_failed' ||
			code === 'cancelled' ||
			code === 'internal'
		) {
			return code;
		}
	}

	const text = error instanceof Error ? error.message.toLowerCase() : '';
	if (text.includes('out of memory') || text.includes('oom')) {
		return 'out_of_memory';
	}
	if (text.includes('network') || text.includes('fetch')) {
		return 'download_failed';
	}
	return 'internal';
}
