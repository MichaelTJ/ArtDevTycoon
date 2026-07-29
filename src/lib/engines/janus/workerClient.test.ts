import { describe, expect, it, vi } from 'vitest';
import type { LoadProgress, WorkerRequest, WorkerResponse } from '$lib/types/contracts';
import { EngineError } from '../errors';
import { JanusWorkerClient, type WorkerLike } from './workerClient';

/** In-memory worker double that replays canned responses for unit tests. */
class FakeWorker implements WorkerLike {
	readonly posted: WorkerRequest[] = [];
	private readonly handlers = new Map<string, (request: WorkerRequest) => WorkerResponse[]>();
	private readonly listeners = new Set<(event: MessageEvent<WorkerResponse>) => void>();

	register(
		type: WorkerRequest['type'],
		responder: (request: WorkerRequest) => WorkerResponse[]
	): void {
		this.handlers.set(type, responder);
	}

	postMessage(message: WorkerRequest, transfer?: Transferable[]): void {
		void transfer;
		this.posted.push(message);
		const responder = this.handlers.get(message.type);
		if (!responder) {
			return;
		}
		for (const reply of responder(message)) {
			this.dispatch(reply);
		}
	}

	terminate(): void {
		// no-op for fake
	}

	addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void {
		void type;
		this.listeners.add(listener);
	}

	removeEventListener(
		type: 'message',
		listener: (event: MessageEvent<WorkerResponse>) => void
	): void {
		void type;
		this.listeners.delete(listener);
	}

	private dispatch(data: WorkerResponse): void {
		const event = new MessageEvent('message', { data });
		for (const listener of this.listeners) {
			listener(event);
		}
	}
}

describe('JanusWorkerClient', () => {
	it('resolves load when loaded arrives', async () => {
		const fake = new FakeWorker();
		fake.register('load', (request) => [{ type: 'loaded', id: request.id }]);
		const client = new JanusWorkerClient(() => fake as unknown as Worker);

		await expect(client.load()).resolves.toBeUndefined();
		expect(fake.posted[0]).toMatchObject({ type: 'load', engineId: 'janus-webgpu' });
	});

	it('invokes progress callbacks in order during load', async () => {
		const fake = new FakeWorker();
		fake.register('load', (request) => [
			{
				type: 'progress',
				id: request.id,
				progress: {
					status: 'downloading',
					file: 'model.onnx',
					loadedBytes: 50,
					totalBytes: 100,
					fraction: 0.5
				} satisfies LoadProgress
			},
			{
				type: 'progress',
				id: request.id,
				progress: {
					status: 'compiling',
					file: null,
					loadedBytes: 100,
					totalBytes: 100,
					fraction: 1
				} satisfies LoadProgress
			},
			{ type: 'loaded', id: request.id }
		]);

		const client = new JanusWorkerClient(() => fake as unknown as Worker);
		const progress: LoadProgress[] = [];
		await client.load((p) => progress.push(p));

		expect(progress.map((p) => p.status)).toEqual(['downloading', 'compiling']);
	});

	it('rejects with EngineError when error reply arrives', async () => {
		const fake = new FakeWorker();
		fake.register('load', (request) => [
			{
				type: 'error',
				id: request.id,
				code: 'webgpu_unavailable',
				message: 'No GPU'
			}
		]);
		const client = new JanusWorkerClient(() => fake as unknown as Worker);

		await expect(client.load()).rejects.toMatchObject({
			code: 'webgpu_unavailable'
		});
	});

	it('does not interleave concurrent generate calls', async () => {
		const fake = new FakeWorker();
		fake.register('generate', (request) => {
			const bitmap = {
				width: 1,
				height: 1,
				close: vi.fn()
			} as unknown as ImageBitmap;
			return [
				{
					type: 'generated',
					id: request.id,
					imageBitmap: bitmap,
					generationMs: 10
				}
			];
		});

		const client = new JanusWorkerClient(() => fake as unknown as Worker);
		const first = client.generate('prompt-a');
		const second = client.generate('prompt-b');
		await Promise.all([first, second]);

		expect(fake.posted.map((msg) => msg.type)).toEqual(['generate', 'generate']);
		expect((fake.posted[0] as Extract<WorkerRequest, { type: 'generate' }>).prompt).toBe(
			'prompt-a'
		);
		expect((fake.posted[1] as Extract<WorkerRequest, { type: 'generate' }>).prompt).toBe(
			'prompt-b'
		);
	});

	it('rejects pending promises when terminate is called', async () => {
		const fake = new FakeWorker();
		fake.register('load', () => []);
		const client = new JanusWorkerClient(() => fake as unknown as Worker);
		const pending = client.load();

		client.terminate();
		await expect(pending).rejects.toBeInstanceOf(EngineError);
	});

	it('rejects with cancelled when abort signal fires', async () => {
		const fake = new FakeWorker();
		fake.register('generate', () => []);
		const client = new JanusWorkerClient(() => fake as unknown as Worker);
		const controller = new AbortController();
		controller.abort();

		await expect(client.generate('prompt', undefined, controller.signal)).rejects.toMatchObject({
			code: 'cancelled'
		});
	});
});
