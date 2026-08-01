import type {
	ArtEngine,
	Artwork,
	ClientBrief,
	CritiqueDraft,
	DeviceCapability,
	EngineAvailability,
	EngineId,
	EngineState,
	LoadProgress
} from '$lib/types/contracts';
import { detectCapability, meetsRequirements } from './capability';
import { EngineError, toEngineError } from './errors';
import { MockEngine } from './mock/mockEngine';
import { ENGINE_REGISTRY, type EngineDescriptor } from './registry';

const STORAGE_KEY = 'adt.engine';
const DOWNLOADED_KEY = 'adt.engine.downloaded';

function isEngineId(value: unknown): value is EngineId {
	return (
		value === 'mock' || value === 'janus-webgpu' || value === 'sdturbo-webgpu' || value === 'remote'
	);
}

export interface EngineManagerDeps {
	capability?: DeviceCapability;
	registry?: readonly EngineDescriptor[];
}

/** Orchestrates engine probing, selection, and graceful fallback to mock. */
export class EngineManager {
	private readonly registry: readonly EngineDescriptor[];
	private capabilityValue: DeviceCapability | null = null;
	private activeEngineValue: ArtEngine;
	private readonly mockEngine: MockEngine;
	private activeIdValue: EngineId = 'mock';
	private stateValue: EngineState = 'idle';
	private availability = new Map<EngineId, EngineAvailability>();
	private initialized = false;

	constructor(deps?: EngineManagerDeps) {
		this.registry = deps?.registry ?? ENGINE_REGISTRY;
		this.mockEngine = new MockEngine();
		this.activeEngineValue = this.mockEngine;
		if (deps?.capability) {
			this.capabilityValue = deps.capability;
		}
	}

	get capability(): DeviceCapability | null {
		return this.capabilityValue;
	}

	get activeId(): EngineId {
		return this.activeIdValue;
	}

	get state(): EngineState {
		return this.stateValue;
	}

	get options(): Array<EngineDescriptor & { availability: EngineAvailability }> {
		return this.registry.map((descriptor) => ({
			...descriptor,
			availability: this.availability.get(descriptor.id) ?? {
				available: false,
				reason: 'Engine has not been probed yet.'
			}
		}));
	}

	/** Highest-tier available engine that needs no download — always at least mock. */
	get recommendedId(): EngineId {
		let best: EngineDescriptor | null = null;
		for (const descriptor of this.registry) {
			const availability = this.availability.get(descriptor.id);
			if (!availability?.available || availability.requiresDownload) {
				continue;
			}
			if (!best || descriptor.tier > best.tier) {
				best = descriptor;
			}
		}
		return best?.id ?? 'mock';
	}

	/** Probe the device and every registered engine. Call once at startup. */
	async init(onProgress?: (progress: LoadProgress) => void): Promise<void> {
		this.stateValue = 'probing';
		try {
			this.capabilityValue = this.capabilityValue ?? (await detectCapability());

			for (const descriptor of this.registry) {
				const engine = await descriptor.create();
				const deviceCheck = meetsRequirements(this.capabilityValue, descriptor.requirements);
				if (!deviceCheck.ok) {
					this.availability.set(descriptor.id, {
						available: false,
						reason: deviceCheck.reason
					});
					continue;
				}

				const probeResult = await engine.probe(this.capabilityValue);
				this.availability.set(descriptor.id, this.withDownloadState(descriptor.id, probeResult));
			}

			const restored = this.readStoredEngineId();
			if (restored) {
				const availability = this.availability.get(restored);
				if (availability?.available) {
					try {
						await this.select(restored, onProgress);
						this.stateValue = 'ready';
						this.initialized = true;
						return;
					} catch {
						this.activeEngineValue = this.mockEngine;
						this.activeIdValue = 'mock';
					}
				}
			}

			this.activeEngineValue = this.mockEngine;
			this.activeIdValue = 'mock';
			this.stateValue = 'ready';
		} catch {
			this.activeEngineValue = this.mockEngine;
			this.activeIdValue = 'mock';
			this.stateValue = 'ready';
		}
		this.initialized = true;
	}

	async select(id: EngineId, onProgress?: (p: LoadProgress) => void): Promise<void> {
		if (!this.capabilityValue) {
			this.capabilityValue = await detectCapability();
		}

		const descriptor = this.registry.find((entry) => entry.id === id);
		if (!descriptor) {
			throw new EngineError('internal', 'Unknown engine selected.');
		}

		const availability = this.availability.get(id);
		if (!availability?.available) {
			const reason =
				availability && !availability.available
					? availability.reason
					: 'This engine is not available on this device.';
			throw new EngineError('internal', reason);
		}

		this.stateValue = 'loading';
		this.activeIdValue = id;
		const previous = this.activeEngineValue;

		try {
			await previous.unload();
			const engine = await descriptor.create();
			await engine.load({ onProgress });
			this.activeEngineValue = engine;
			this.activeIdValue = id;
			this.stateValue = 'ready';
			this.persistEngineId(id);
			if (id !== 'mock') {
				this.markEngineDownloaded(id);
			}
		} catch (error) {
			this.activeEngineValue = this.mockEngine;
			this.activeIdValue = 'mock';
			this.stateValue = 'error';
			await this.mockEngine.load();
			throw toEngineError(error, 'internal');
		}
	}

	async generate(input: {
		playerPrompt: string;
		prompt: string;
		seed?: number;
		signal?: AbortSignal;
		sketchImage?: Blob;
	}): Promise<Artwork> {
		this.ensureInitialized();
		try {
			return await this.activeEngineValue.generate(input);
		} catch (error) {
			return this.retryOnMockAfterFailure(error, 'generation_failed', () =>
				this.mockEngine.generate(input)
			);
		}
	}

	async critique(input: {
		brief: ClientBrief;
		playerPrompt: string;
		artwork: Artwork;
		signal?: AbortSignal;
	}): Promise<CritiqueDraft> {
		this.ensureInitialized();
		const engine =
			this.activeEngineValue.capabilities.critique === false
				? this.mockEngine
				: this.activeEngineValue;

		try {
			return await engine.critique(input);
		} catch (error) {
			return this.retryOnMockAfterFailure(error, 'critique_failed', () =>
				this.mockEngine.critique(input)
			);
		}
	}

	private ensureInitialized(): void {
		if (!this.initialized) {
			throw new EngineError('internal', 'Engine manager has not been initialized.');
		}
	}

	private async retryOnMockAfterFailure<T>(
		error: unknown,
		fallbackCode: 'generation_failed' | 'critique_failed',
		retry: () => Promise<T>
	): Promise<T> {
		const engineError = toEngineError(error, fallbackCode);
		if (engineError.code === 'cancelled') {
			throw engineError;
		}

		if (this.activeEngineValue === this.mockEngine) {
			throw engineError;
		}

		this.activeEngineValue = this.mockEngine;
		this.activeIdValue = 'mock';
		await this.mockEngine.load();
		return retry();
	}

	private readStoredEngineId(): EngineId | null {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (isEngineId(stored)) {
				return stored;
			}
		} catch {
			return null;
		}
		return null;
	}

	private persistEngineId(id: EngineId): void {
		try {
			localStorage.setItem(STORAGE_KEY, id);
		} catch {
			// Persistence is best-effort; gameplay continues without it.
		}
	}

	private readDownloadedEngines(): Set<EngineId> {
		try {
			const raw = localStorage.getItem(DOWNLOADED_KEY);
			if (!raw) {
				return new Set();
			}
			const parsed: unknown = JSON.parse(raw);
			if (!Array.isArray(parsed)) {
				return new Set();
			}
			return new Set(parsed.filter(isEngineId));
		} catch {
			return new Set();
		}
	}

	private isEngineDownloaded(id: EngineId): boolean {
		return id !== 'mock' && this.readDownloadedEngines().has(id);
	}

	private withDownloadState(id: EngineId, availability: EngineAvailability): EngineAvailability {
		if (!availability.available || id === 'mock') {
			return availability;
		}
		if (this.isEngineDownloaded(id) || this.readStoredEngineId() === id) {
			return { ...availability, requiresDownload: false };
		}
		return availability;
	}

	private markEngineDownloaded(id: EngineId): void {
		if (id === 'mock') {
			return;
		}

		try {
			const downloaded = this.readDownloadedEngines();
			downloaded.add(id);
			localStorage.setItem(DOWNLOADED_KEY, JSON.stringify([...downloaded]));
		} catch {
			// Persistence is best-effort; gameplay continues without it.
		}

		const availability = this.availability.get(id);
		if (availability?.available) {
			this.availability.set(id, { ...availability, requiresDownload: false });
		}
	}
}
