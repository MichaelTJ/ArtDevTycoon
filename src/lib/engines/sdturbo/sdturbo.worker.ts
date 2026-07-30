import { AutoTokenizer } from '@huggingface/transformers';
import * as ort from 'onnxruntime-web/webgpu';
import type {
	EngineErrorCode,
	LoadProgress,
	WorkerRequest,
	WorkerResponse
} from '$lib/types/contracts';
import { rawImageToBitmap, type RawImageLike } from '../janus/imageConversion';
import { mulberry32 } from '../random';

const MODEL_REPO = 'schmuell/sd-turbo-ort-web';
/** CLIP tokenizer compatible with Transformers.js — matches Microsoft's sd-turbo ORT example. */
const TOKENIZER_REPO = 'Xenova/clip-vit-base-patch16';
const MODEL_BASE = `https://huggingface.co/${MODEL_REPO}/resolve/main`;
const CACHE_NAME = 'onnx';

/** Match Microsoft's sd-turbo ORT example — WebGPU-only builds lack CPU kernels for graph opt. */
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

const SIGMA = 14.6146;
const VAE_SCALING_FACTOR = 0.18215;
const LATENT_SHAPE = [1, 4, 64, 64] as const;
const OUTPUT_SIZE = 512;
const UNET_TIMESTEP = 999n;
const CLIP_MAX_LENGTH = 77;
const CLIP_PAD_TOKEN_ID = 0;

/** ONNX shards and approximate sizes (bytes) for combined download progress. */
const MODEL_FILES = {
	text_encoder: { path: 'text_encoder/model.onnx', bytes: 681_393_168 },
	unet: { path: 'unet/model.onnx', bytes: 1_733_430_199 },
	vae_decoder: { path: 'vae_decoder/model.onnx', bytes: 99_094_314 }
} as const;

const TOTAL_MODEL_BYTES = Object.values(MODEL_FILES).reduce((sum, file) => sum + file.bytes, 0);

type ModelKey = keyof typeof MODEL_FILES;

type OrtSession = Awaited<ReturnType<typeof ort.InferenceSession.create>>;

interface ModelSessions {
	text_encoder: OrtSession;
	unet: OrtSession;
	vae_decoder: OrtSession;
}

let sessions: ModelSessions | null = null;
let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | null = null;
let loadPromise: Promise<void> | null = null;
let cancelledRequestId: string | null = null;

const sessionOptions: ort.InferenceSession.SessionOptions = {
	executionProviders: ['webgpu'],
	// 'all' triggers constant-folding on CPU during session creation; the webgpu bundle has
	// no CPU Sqrt kernel, which stalls or fails VAE decoder load (see Microsoft sd-turbo example).
	graphOptimizationLevel: 'disabled',
	enableMemPattern: false,
	enableCpuMemArena: false,
	extra: {
		session: {
			disable_prepacking: '1',
			use_device_allocator_for_initializers: '1',
			use_ort_model_bytes_directly: '1',
			use_ort_model_bytes_for_initializers: '1'
		}
	}
};

const modelSessionOptions: Record<ModelKey, ort.InferenceSession.SessionOptions> = {
	text_encoder: {
		...sessionOptions,
		freeDimensionOverrides: { batch_size: 1 },
		preferredOutputLocation: { last_hidden_state: 'gpu-buffer' }
	},
	unet: {
		...sessionOptions,
		freeDimensionOverrides: {
			batch_size: 1,
			num_channels: 4,
			height: 64,
			width: 64,
			sequence_length: 77
		}
	},
	vae_decoder: {
		...sessionOptions,
		freeDimensionOverrides: {
			batch_size: 1,
			num_channels_latent: 4,
			height_latent: 64,
			width_latent: 64
		}
	}
};

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
		await disposeSessions();
		postReply({ type: 'unloaded', id: request.id });
		return;
	}

	if (request.type === 'load') {
		try {
			await ensureLoaded(
				request.id,
				(progress) => {
					postReply({ type: 'progress', id: request.id, progress });
				},
				request.fromCache ?? false
			);
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
			const bitmap = await generateImage(request.prompt, request.seed);
			const generationMs = Math.max(0, Math.round(performance.now() - started));
			postReply({ type: 'generated', id: request.id, imageBitmap: bitmap, generationMs }, [bitmap]);
		} catch (error) {
			postError(request.id, error);
		}
	}
}

async function ensureLoaded(
	requestId: string,
	onProgress?: (progress: LoadProgress) => void,
	fromCache = false
): Promise<void> {
	if (sessions && tokenizer) {
		return;
	}

	if (!loadPromise) {
		loadPromise = loadPipeline(onProgress ?? (() => undefined), fromCache);
	}

	await loadPromise;

	if (isCancelled(requestId)) {
		throw cancelledError();
	}
}

async function loadPipeline(
	onProgress: (progress: LoadProgress) => void,
	fromCache: boolean
): Promise<void> {
	if (!('gpu' in navigator)) {
		throw workerError('webgpu_unavailable', 'WebGPU is not available on this device.');
	}

	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) {
		throw workerError('webgpu_unavailable', 'WebGPU is not available on this device.');
	}

	if (!adapter.features.has('shader-f16')) {
		throw workerError(
			'webgpu_unavailable',
			'SD-Turbo needs WebGPU float16 (shader-f16). Try updating your browser or GPU drivers.'
		);
	}

	const fetchStatus: LoadProgress['status'] = fromCache ? 'loading' : 'downloading';
	let loadedBytes = 0;

	const reportProgress = (file: string | null, fileLoaded: number, fileTotal: number): void => {
		const fraction =
			fileTotal > 0
				? Math.min(0.98, (loadedBytes + fileLoaded) / TOTAL_MODEL_BYTES)
				: Math.min(0.98, loadedBytes / TOTAL_MODEL_BYTES);
		onProgress({
			status: fetchStatus,
			file,
			loadedBytes: loadedBytes + fileLoaded,
			totalBytes: TOTAL_MODEL_BYTES,
			fraction
		});
	};

	onProgress({
		status: fetchStatus,
		file: null,
		loadedBytes: 0,
		totalBytes: TOTAL_MODEL_BYTES,
		fraction: 0
	});

	const loaded: Partial<ModelSessions> = {};
	for (const [key, file] of Object.entries(MODEL_FILES) as [
		ModelKey,
		(typeof MODEL_FILES)[ModelKey]
	][]) {
		const modelBytes = await fetchModelBytes(file.path, (loadedChunk, total) => {
			reportProgress(file.path, loadedChunk, total);
		});
		loadedBytes += file.bytes;

		onProgress({
			status: 'compiling',
			file: file.path,
			loadedBytes,
			totalBytes: TOTAL_MODEL_BYTES,
			fraction: Math.min(0.99, loadedBytes / TOTAL_MODEL_BYTES)
		});

		loaded[key] = await ort.InferenceSession.create(modelBytes, modelSessionOptions[key]);
	}

	sessions = loaded as ModelSessions;

	tokenizer = await AutoTokenizer.from_pretrained(TOKENIZER_REPO, {
		progress_callback: (report) => {
			if (report.status === 'progress' || report.status === 'progress_total') {
				onProgress({
					status: fetchStatus,
					file: 'tokenizer',
					loadedBytes: TOTAL_MODEL_BYTES,
					totalBytes: TOTAL_MODEL_BYTES,
					fraction: 0.99
				});
			}
		}
	});
	tokenizer.pad_token_id = 0;

	onProgress({
		status: 'ready',
		file: null,
		loadedBytes: TOTAL_MODEL_BYTES,
		totalBytes: TOTAL_MODEL_BYTES,
		fraction: 1
	});
}

async function fetchModelBytes(
	modelPath: string,
	onChunk: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
	const url = `${MODEL_BASE}/${modelPath}`;

	try {
		const cache = await caches.open(CACHE_NAME);
		const cached = await cache.match(url);
		if (cached) {
			const buffer = await cached.arrayBuffer();
			onChunk(buffer.byteLength, buffer.byteLength);
			return buffer;
		}

		const response = await fetch(url);
		if (!response.ok) {
			throw workerError('download_failed', `Could not download ${modelPath}.`);
		}

		const buffer = await readResponseWithProgress(response, onChunk);
		await cache.put(url, new Response(buffer.slice(0)));
		return buffer;
	} catch (error) {
		if (error instanceof Error && 'code' in error) {
			throw error;
		}
		throw workerError('download_failed', `Could not download ${modelPath}.`);
	}
}

async function readResponseWithProgress(
	response: Response,
	onChunk: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
	const total = Number(response.headers.get('content-length') ?? 0);
	const reader = response.body?.getReader();
	if (!reader) {
		const buffer = await response.arrayBuffer();
		onChunk(buffer.byteLength, total || buffer.byteLength);
		return buffer;
	}

	const chunks: Uint8Array[] = [];
	let loaded = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		if (value) {
			chunks.push(value);
			loaded += value.byteLength;
			onChunk(loaded, total || loaded);
		}
	}

	const merged = new Uint8Array(loaded);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return merged.buffer;
}

/**
 * SD-Turbo single-step diffusion: one UNet forward pass with no classifier-free guidance.
 * Guidance is omitted because the distilled model expects it — adding CFG produces noise.
 */
async function generateImage(prompt: string, seed?: number): Promise<ImageBitmap> {
	if (!sessions || !tokenizer) {
		throw workerError('internal', 'Model is not loaded.');
	}

	const encoded = await tokenizer(prompt, {
		padding: 'max_length',
		max_length: CLIP_MAX_LENGTH,
		truncation: true,
		return_tensor: false
	});
	const ids = padClipInputIds(normalizeInputIds(encoded.input_ids));

	const textResult = await sessions.text_encoder.run({
		input_ids: new ort.Tensor('int32', ids, [1, CLIP_MAX_LENGTH])
	});
	const encoderHiddenStates = textResult.last_hidden_state as ort.Tensor;

	try {
		const latentSeed = seed ?? Math.floor(Math.random() * 0xffffffff);
		const latentData = seededLatents([...LATENT_SHAPE], SIGMA, latentSeed);
		const latent = new ort.Tensor('float32', latentData, [...LATENT_SHAPE]);
		const latentModelInput = scaleModelInputs(latent);

		const unetResult = await sessions.unet.run({
			sample: latentModelInput,
			timestep: new ort.Tensor('int64', [UNET_TIMESTEP], [1]),
			encoder_hidden_states: encoderHiddenStates
		});

		const outSample = unetResult.out_sample as ort.Tensor;
		const decodedLatents = schedulerStep(outSample, latent);

		const vaeResult = await sessions.vae_decoder.run({
			latent_sample: decodedLatents
		});

		const sample = vaeResult.sample as ort.Tensor;
		const rawImage = vaeTensorToRawImage(sample);
		return rawImageToBitmap(rawImage);
	} finally {
		if (typeof encoderHiddenStates.dispose === 'function') {
			encoderHiddenStates.dispose();
		}
	}
}

function normalizeInputIds(
	inputIds:
		| Int32Array
		| BigInt64Array
		| number[]
		| number[][]
		| { data: Int32Array | BigInt64Array | number[] }
): Int32Array {
	if (Array.isArray(inputIds)) {
		if (inputIds.length > 0 && Array.isArray(inputIds[0])) {
			return normalizeInputIds(inputIds[0]);
		}
		return Int32Array.from(inputIds as number[]);
	}

	if (inputIds instanceof Int32Array) {
		return inputIds;
	}
	if (inputIds instanceof BigInt64Array) {
		return Int32Array.from(inputIds, (value) => Number(value));
	}

	const data = inputIds.data;
	if (data instanceof Int32Array) {
		return data;
	}
	if (data instanceof BigInt64Array) {
		return Int32Array.from(data, (value) => Number(value));
	}
	return Int32Array.from(data);
}

/** UNet free-dims fix sequence_length at 77 — pad/truncate regardless of tokenizer padding mode. */
function padClipInputIds(inputIds: Int32Array): Int32Array {
	const padded = new Int32Array(CLIP_MAX_LENGTH).fill(CLIP_PAD_TOKEN_ID);
	const copyLength = Math.min(inputIds.length, CLIP_MAX_LENGTH);
	padded.set(inputIds.subarray(0, copyLength));
	return padded;
}

function seededLatents(shape: number[], noiseSigma: number, seed: number): Float32Array {
	const rng = mulberry32(seed);
	const size = shape.reduce((product, dim) => product * dim, 1);
	const data = new Float32Array(size);

	for (let i = 0; i < size; i += 2) {
		const u = Math.max(rng(), 1e-10);
		const v = rng();
		const radius = Math.sqrt(-2 * Math.log(u));
		data[i] = radius * Math.cos(2 * Math.PI * v) * noiseSigma;
		if (i + 1 < size) {
			data[i + 1] = radius * Math.sin(2 * Math.PI * v) * noiseSigma;
		}
	}

	return data;
}

function scaleModelInputs(tensor: ort.Tensor): ort.Tensor {
	const input = tensor.data as Float32Array;
	const output = new Float32Array(input.length);
	const divisor = Math.sqrt(SIGMA ** 2 + 1);
	for (let i = 0; i < input.length; i++) {
		output[i] = input[i] / divisor;
	}
	return new ort.Tensor('float32', output, tensor.dims);
}

/** Minimal Euler step for SD-Turbo's single denoising step at timestep 0. */
function schedulerStep(modelOutput: ort.Tensor, sample: ort.Tensor): ort.Tensor {
	const output = new Float32Array(modelOutput.data.length);
	const sampleData = sample.data as Float32Array;
	const modelData = modelOutput.data as Float32Array;
	const sigmaHat = SIGMA;

	for (let i = 0; i < modelData.length; i++) {
		const predOriginalSample = sampleData[i] - sigmaHat * modelData[i];
		const derivative = (sampleData[i] - predOriginalSample) / sigmaHat;
		const dt = 0 - sigmaHat;
		output[i] = (sampleData[i] + derivative * dt) / VAE_SCALING_FACTOR;
	}

	return new ort.Tensor('float32', output, modelOutput.dims);
}

function vaeTensorToRawImage(tensor: ort.Tensor): RawImageLike {
	const dims = tensor.dims as [number, number, number, number];
	const height = dims[2] ?? OUTPUT_SIZE;
	const width = dims[3] ?? OUTPUT_SIZE;
	const floats = tensor.data as Float32Array;
	const pixelCount = width * height;
	const data = new Uint8ClampedArray(pixelCount * 3);

	for (let i = 0; i < pixelCount; i++) {
		for (let channel = 0; channel < 3; channel++) {
			let value = floats[channel * pixelCount + i];
			value = value / 2 + 0.5;
			value = Math.max(0, Math.min(1, value));
			data[i * 3 + channel] = Math.round(value * 255);
		}
	}

	return { data, width, height, channels: 3 };
}

async function disposeSessions(): Promise<void> {
	for (const session of Object.values(sessions ?? {})) {
		if (session && typeof session.release === 'function') {
			await session.release();
		}
	}
	sessions = null;
	tokenizer = null;
	loadPromise = null;
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
