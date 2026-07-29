import type { LoadProgress, WorkerRequest, WorkerResponse } from '$lib/types/contracts';
import { EngineError } from '../errors';

type PendingCall = {
	resolve: (value: unknown) => void;
	reject: (error: EngineError) => void;
	onLoadProgress?: (progress: LoadProgress) => void;
	onGenerateProgress?: (fraction: number) => void;
	signal?: AbortSignal;
	abortHandler?: () => void;
	kind: 'load' | 'generate' | 'critique';
};

/** Minimal worker surface used for RPC and test doubles. */
export interface WorkerLike {
	postMessage(message: WorkerRequest, transfer?: Transferable[]): void;
	terminate(): void;
	addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
	removeEventListener(
		type: 'message',
		listener: (event: MessageEvent<WorkerResponse>) => void
	): void;
}

type QueuedJob = {
	run: () => Promise<void>;
};

/**
 * Promise-based RPC wrapper over the Janus inference worker.
 * Serialises all requests so two generations never overlap in VRAM.
 */
export class JanusWorkerClient {
	private worker: WorkerLike;
	private nextId = 0;
	private readonly pending = new Map<string, PendingCall>();
	private readonly queue: QueuedJob[] = [];
	private draining = false;

	constructor(factory?: () => Worker) {
		this.worker =
			factory?.() ?? new Worker(new URL('./janus.worker.ts', import.meta.url), { type: 'module' });
		this.worker.addEventListener('message', this.handleMessage);
	}

	/** Download and compile the model shards in the worker. Safe to call twice. */
	load(onProgress?: (progress: LoadProgress) => void, signal?: AbortSignal): Promise<void> {
		return this.enqueue<void>('load', { onLoadProgress: onProgress, signal });
	}

	/**
	 * Generate a 384×384 image from the built prompt only — the player's raw text never
	 * crosses the worker boundary.
	 */
	generate(
		prompt: string,
		onProgress?: (fraction: number) => void,
		signal?: AbortSignal
	): Promise<{ bitmap: ImageBitmap; generationMs: number }> {
		return this.enqueue<{ bitmap: ImageBitmap; generationMs: number }>('generate', {
			prompt,
			onGenerateProgress: onProgress,
			signal
		});
	}

	/** Ask yes/no keyword questions plus one prose review against a transferred bitmap. */
	ask(
		bitmap: ImageBitmap,
		questions: string[],
		reviewPrompt: string,
		signal?: AbortSignal
	): Promise<{ answers: string[]; review: string }> {
		return this.enqueue<{ answers: string[]; review: string }>('critique', {
			bitmap,
			questions,
			reviewPrompt,
			signal
		});
	}

	/** Kill the worker and reject every pending promise. */
	terminate(): void {
		this.rejectAll(new EngineError('internal', 'Worker terminated.'));
		this.worker.removeEventListener('message', this.handleMessage);
		this.worker.terminate();
	}

	private enqueue<T>(
		kind: PendingCall['kind'],
		options: {
			prompt?: string;
			bitmap?: ImageBitmap;
			questions?: string[];
			reviewPrompt?: string;
			onLoadProgress?: (progress: LoadProgress) => void;
			onGenerateProgress?: (fraction: number) => void;
			signal?: AbortSignal;
		}
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.queue.push({
				run: () => this.dispatchRequest<T>(kind, options).then(resolve).catch(reject)
			});
			void this.drainQueue();
		});
	}

	private async drainQueue(): Promise<void> {
		if (this.draining) {
			return;
		}
		this.draining = true;
		while (this.queue.length > 0) {
			const job = this.queue.shift();
			if (job) {
				await job.run();
			}
		}
		this.draining = false;
	}

	private dispatchRequest<T>(
		kind: PendingCall['kind'],
		options: {
			prompt?: string;
			bitmap?: ImageBitmap;
			questions?: string[];
			reviewPrompt?: string;
			onLoadProgress?: (progress: LoadProgress) => void;
			onGenerateProgress?: (fraction: number) => void;
			signal?: AbortSignal;
		}
	): Promise<T> {
		if (options.signal?.aborted) {
			return Promise.reject(new EngineError('cancelled', 'The operation was cancelled.'));
		}

		const id = this.nextRequestId();

		return new Promise<T>((resolve, reject) => {
			const abortHandler = () => {
				this.worker.postMessage({ type: 'cancel', id });
				this.rejectPending(id, new EngineError('cancelled', 'The operation was cancelled.'));
			};

			this.pending.set(id, {
				resolve: resolve as (value: unknown) => void,
				reject,
				onLoadProgress: options.onLoadProgress,
				onGenerateProgress: options.onGenerateProgress,
				signal: options.signal,
				abortHandler,
				kind
			});

			options.signal?.addEventListener('abort', abortHandler, { once: true });

			if (kind === 'load') {
				this.worker.postMessage({ type: 'load', id, engineId: 'janus-webgpu' });
				return;
			}

			if (kind === 'generate') {
				this.worker.postMessage({ type: 'generate', id, prompt: options.prompt ?? '' });
				return;
			}

			const bitmap = options.bitmap;
			if (!bitmap) {
				this.rejectPending(id, new EngineError('internal', 'Critique requires an image bitmap.'));
				return;
			}

			this.worker.postMessage(
				{
					type: 'critique',
					id,
					questions: options.questions ?? [],
					reviewPrompt: options.reviewPrompt ?? '',
					imageBitmap: bitmap
				},
				[bitmap]
			);
		});
	}

	private handleMessage = (event: MessageEvent<WorkerResponse>): void => {
		const message = event.data;
		const entry = this.pending.get(message.id);
		if (!entry) {
			return;
		}

		if (message.type === 'progress') {
			if (entry.kind === 'generate') {
				entry.onGenerateProgress?.(message.progress.fraction);
			} else {
				entry.onLoadProgress?.(message.progress);
			}
			return;
		}

		if (message.type === 'error') {
			this.finishPending(message.id, () => {
				entry.reject(new EngineError(message.code, message.message));
			});
			return;
		}

		if (message.type === 'loaded') {
			this.finishPending(message.id, () => entry.resolve(undefined));
			return;
		}

		if (message.type === 'generated') {
			this.finishPending(message.id, () =>
				entry.resolve({ bitmap: message.imageBitmap, generationMs: message.generationMs })
			);
			return;
		}

		if (message.type === 'critiqued') {
			this.finishPending(message.id, () =>
				entry.resolve({ answers: message.answers, review: message.review })
			);
			return;
		}

		if (message.type === 'unloaded') {
			this.finishPending(message.id, () => entry.resolve(undefined));
		}
	};

	private finishPending(id: string, settle: () => void): void {
		const entry = this.pending.get(id);
		if (!entry) {
			return;
		}
		if (entry.abortHandler && entry.signal) {
			entry.signal.removeEventListener('abort', entry.abortHandler);
		}
		this.pending.delete(id);
		settle();
	}

	private rejectPending(id: string, error: EngineError): void {
		const entry = this.pending.get(id);
		if (!entry) {
			return;
		}
		if (entry.abortHandler && entry.signal) {
			entry.signal.removeEventListener('abort', entry.abortHandler);
		}
		this.pending.delete(id);
		entry.reject(error);
	}

	private rejectAll(error: EngineError): void {
		for (const [id, entry] of this.pending) {
			if (entry.abortHandler && entry.signal) {
				entry.signal.removeEventListener('abort', entry.abortHandler);
			}
			entry.reject(error);
			this.pending.delete(id);
		}
		this.queue.length = 0;
	}

	private nextRequestId(): string {
		this.nextId += 1;
		return `janus-${this.nextId}`;
	}
}
