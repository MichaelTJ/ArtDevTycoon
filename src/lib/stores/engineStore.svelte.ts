import { EngineManager } from '$lib/engines';
import type { EngineDescriptor } from '$lib/engines/registry';
import type {
	DeviceCapability,
	EngineAvailability,
	EngineId,
	EngineOption,
	EngineState,
	LoadProgress
} from '$lib/types/contracts';

function toOption(entry: EngineDescriptor & { availability: EngineAvailability }): EngineOption {
	return {
		id: entry.id,
		displayName: entry.displayName,
		description: entry.description,
		available: entry.availability.available,
		unavailableReason: entry.availability.available ? undefined : entry.availability.reason,
		requiresDownload: entry.availability.available ? entry.availability.requiresDownload : false,
		approxDownloadMb: entry.requirements.approxDownloadMb
	};
}

const STORAGE_KEY = 'adt.engine';

function readStoredEngineId(): EngineId | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'mock' || stored === 'janus-webgpu' || stored === 'sdturbo-webgpu') {
			return stored;
		}
	} catch {
		return null;
	}
	return null;
}

/** Reactive wrapper around {@link EngineManager} for the engine picker UI. */
export class EngineStore {
	state = $state<EngineState>('idle');
	activeId = $state<EngineId>('mock');
	capability = $state<DeviceCapability | null>(null);
	options = $state<EngineOption[]>([]);
	loadProgress = $state<LoadProgress | null>(null);
	loadError = $state<string | null>(null);
	noticeDismissed = $state(false);
	switchingLocked = $state(false);

	readonly #manager: EngineManager;
	#loadGeneration = 0;

	constructor(manager?: EngineManager) {
		this.#manager = manager ?? new EngineManager();
	}

	get manager(): EngineManager {
		return this.#manager;
	}

	ready = $state(false);

	realAiSupported = $derived(this.options.some((o) => o.id !== 'mock' && o.available));

	async init(): Promise<void> {
		try {
			this.state = 'probing';
			const stored = readStoredEngineId();
			if (stored) {
				this.activeId = stored;
			}
			await this.#manager.init((progress) => {
				this.state = 'loading';
				this.loadProgress = progress;
			});
			this.syncFromManager();
			this.loadProgress = null;
		} catch {
			this.activeId = 'mock';
			this.state = 'ready';
			this.syncOptions();
		} finally {
			this.ready = true;
		}
	}

	async select(id: EngineId): Promise<void> {
		const generation = ++this.#loadGeneration;
		this.activeId = id;
		this.state = 'loading';
		this.loadError = null;
		this.loadProgress = null;

		try {
			await this.#manager.select(id, (progress) => {
				if (generation === this.#loadGeneration) {
					this.loadProgress = progress;
				}
			});
			if (generation !== this.#loadGeneration) {
				return;
			}
			this.activeId = this.#manager.activeId;
			this.state = 'ready';
			this.loadProgress = null;
			this.loadError = null;
			this.syncOptions();
		} catch (error) {
			if (generation !== this.#loadGeneration) {
				return;
			}
			this.loadError =
				error instanceof Error ? error.message : 'Something went wrong loading that engine.';
			this.state = 'error';
			this.loadProgress = null;
			this.activeId = this.#manager.activeId;
			this.syncOptions();
		}
	}

	cancelLoad(): void {
		this.#loadGeneration++;
		this.loadProgress = null;
		this.loadError = null;
		void this.#manager.select('mock').then(() => {
			this.activeId = this.#manager.activeId;
			this.state = 'ready';
			this.syncOptions();
		});
	}

	dismissNotice(): void {
		this.noticeDismissed = true;
	}

	setSwitchingLocked(locked: boolean): void {
		this.switchingLocked = locked;
	}

	private syncFromManager(): void {
		this.capability = this.#manager.capability;
		this.activeId = this.#manager.activeId;
		this.state = this.#manager.state === 'error' ? 'error' : 'ready';
		this.syncOptions();
	}

	private syncOptions(): void {
		this.options = this.#manager.options.map(toOption);
	}
}

/** The one shared engine store used by the game screen and {@link GameStore}. */
export const engines = new EngineStore();
