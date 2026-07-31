import { EngineManager } from '$lib/engines';
import type { EngineDescriptor } from '$lib/engines/registry';
import { createJanusLinkClient } from '$lib/engines/remote/janusLinkClient';
import {
	loadRemoteConfig,
	remoteEngineConfigSchema,
	saveRemoteConfig
} from '$lib/engines/remote/remoteConfig';
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

function isPersistedEngineId(value: string | null): value is EngineId {
	return (
		value === 'mock' || value === 'janus-webgpu' || value === 'sdturbo-webgpu' || value === 'remote'
	);
}

function readStoredEngineId(): EngineId | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (isPersistedEngineId(stored)) {
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

	showRemoteSetup = $state(false);
	remoteBaseUrl = $state('');
	remoteApiKey = $state('');
	remoteTestState = $state<'idle' | 'testing' | 'success' | 'error'>('idle');
	remoteTestError = $state<string | null>(null);

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

	openRemoteSetup(): void {
		const existing = loadRemoteConfig();
		if (existing) {
			this.remoteBaseUrl = existing.baseUrl;
			this.remoteApiKey = existing.apiKey;
		}
		this.remoteTestState = 'idle';
		this.remoteTestError = null;
		this.showRemoteSetup = true;
	}

	closeRemoteSetup(): void {
		this.showRemoteSetup = false;
		this.remoteTestState = 'idle';
		this.remoteTestError = null;
	}

	async testRemoteConnection(): Promise<void> {
		this.remoteTestState = 'testing';
		this.remoteTestError = null;

		const parsed = remoteEngineConfigSchema.safeParse({
			baseUrl: this.remoteBaseUrl,
			apiKey: this.remoteApiKey
		});
		if (!parsed.success) {
			this.remoteTestState = 'error';
			this.remoteTestError = 'Enter a valid Tailscale HTTPS URL and an API key (24+ characters).';
			return;
		}

		const result = await createJanusLinkClient().testConnection(parsed.data);
		if (!result.ok) {
			this.remoteTestState = 'error';
			this.remoteTestError = result.reason;
			return;
		}

		this.remoteBaseUrl = parsed.data.baseUrl;
		this.remoteApiKey = parsed.data.apiKey;
		this.remoteTestState = 'success';
		this.remoteTestError = null;
	}

	async connectRemote(): Promise<void> {
		const parsed = remoteEngineConfigSchema.safeParse({
			baseUrl: this.remoteBaseUrl,
			apiKey: this.remoteApiKey
		});
		if (!parsed.success || this.remoteTestState !== 'success') {
			this.remoteTestState = 'error';
			this.remoteTestError = 'Test the connection successfully before connecting.';
			return;
		}

		saveRemoteConfig(parsed.data);
		this.showRemoteSetup = false;
		await this.select('remote');
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
