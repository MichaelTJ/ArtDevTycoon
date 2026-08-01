import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineManager } from '$lib/engines/manager';
import { getRemoteProviderClient } from '$lib/engines/remote/providers';
import { loadRemoteConfig, REMOTE_CONFIG_STORAGE_KEY } from '$lib/engines/remote/remoteConfig';
import type {
	DeviceCapability,
	EngineAvailability,
	EngineId,
	EngineState,
	LoadProgress
} from '$lib/types/contracts';
import { EngineStore } from './engineStore.svelte';

vi.mock('$lib/engines/remote/providers', () => ({
	getRemoteProviderClient: vi.fn()
}));

const capability: DeviceCapability = {
	webgpu: false,
	fp16: false,
	maxStorageBufferBindingMb: null,
	maxBufferMb: null,
	isMobile: true,
	deviceMemoryGb: null
};

function createFakeManager(
	overrides: Partial<{
		init: () => Promise<void>;
		select: (id: EngineId, onProgress?: (p: LoadProgress) => void) => Promise<void>;
		options: Array<{
			id: EngineId;
			displayName: string;
			description: string;
			requirements: { approxDownloadMb: number };
			availability: EngineAvailability;
		}>;
	}>
): EngineManager {
	const state = { value: 'ready' as EngineState, activeId: 'mock' as EngineId };

	return {
		capability,
		get activeId() {
			return state.activeId;
		},
		get state() {
			return state.value;
		},
		get options() {
			return (overrides.options ?? []).map((entry) => ({
				...entry,
				requirements: {
					webgpu: false,
					approxDownloadMb: entry.requirements.approxDownloadMb,
					minStorageBufferMb: 0,
					desktopOnly: false
				},
				tier: entry.id === 'mock' ? 0 : 1,
				create: async () => {
					throw new Error('not used in store tests');
				},
				availability: entry.availability
			}));
		},
		get recommendedId() {
			return 'mock';
		},
		init: overrides.init ?? (async () => {}),
		select:
			overrides.select ??
			(async (id: EngineId) => {
				state.activeId = id;
				state.value = 'ready';
			}),
		generate: vi.fn(),
		critique: vi.fn()
	} as unknown as EngineManager;
}

describe('EngineStore', () => {
	it('init() populates options and leaves activeId as mock', async () => {
		const store = new EngineStore(
			createFakeManager({
				init: async () => {},
				options: [
					{
						id: 'mock',
						displayName: 'Crayon Mode',
						description: 'Instant',
						requirements: { approxDownloadMb: 0 },
						availability: { available: true, requiresDownload: false, approxDownloadMb: 0 }
					},
					{
						id: 'janus-webgpu',
						displayName: 'Janus',
						description: 'AI',
						requirements: { approxDownloadMb: 1024 },
						availability: { available: false, reason: 'No WebGPU' }
					}
				]
			})
		);

		await store.init();

		expect(store.options).toHaveLength(2);
		expect(store.activeId).toBe('mock');
		expect(store.realAiSupported).toBe(false);
	});

	it('select writes progress updates in order', async () => {
		const fractions: number[] = [];
		const store = new EngineStore(
			createFakeManager({
				select: async (_id, onProgress) => {
					onProgress?.({
						status: 'downloading',
						file: 'model.bin',
						loadedBytes: 50,
						totalBytes: 100,
						fraction: 0.5
					});
					fractions.push(store.loadProgress?.fraction ?? -1);
					onProgress?.({
						status: 'ready',
						file: null,
						loadedBytes: 100,
						totalBytes: 100,
						fraction: 1
					});
					fractions.push(store.loadProgress?.fraction ?? -1);
				},
				options: [
					{
						id: 'mock',
						displayName: 'Crayon Mode',
						description: 'Instant',
						requirements: { approxDownloadMb: 0 },
						availability: { available: true, requiresDownload: false, approxDownloadMb: 0 }
					}
				]
			})
		);

		await store.select('mock');

		expect(fractions).toEqual([0.5, 1]);
		expect(store.state).toBe('ready');
		expect(store.loadProgress).toBeNull();
	});

	it('a failing select sets loadError and state error without throwing', async () => {
		const store = new EngineStore(
			createFakeManager({
				select: async () => {
					throw new Error('Download failed');
				},
				options: [
					{
						id: 'mock',
						displayName: 'Crayon Mode',
						description: 'Instant',
						requirements: { approxDownloadMb: 0 },
						availability: { available: true, requiresDownload: false, approxDownloadMb: 0 }
					}
				]
			})
		);

		await expect(store.select('mock')).resolves.toBeUndefined();
		expect(store.loadError).toBe('Download failed');
		expect(store.state).toBe('error');
	});
});

describe('EngineStore My PC remote setup', () => {
	const storeMap = new Map<string, string>();

	beforeEach(() => {
		storeMap.clear();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storeMap.get(key) ?? null,
			setItem: (key: string, value: string) => {
				storeMap.set(key, value);
			},
			removeItem: (key: string) => {
				storeMap.delete(key);
			},
			clear: () => {
				storeMap.clear();
			}
		});
		vi.mocked(getRemoteProviderClient).mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('openRemoteSetup shows the dialog and resets test state', () => {
		const store = new EngineStore(createFakeManager({}));
		store.remoteTestState = 'error';
		store.openRemoteSetup();
		expect(store.showRemoteSetup).toBe(true);
		expect(store.remoteTestState).toBe('idle');
		expect(store.remoteProvider).toBe('januslink');
	});

	it('testRemoteConnection succeeds and enables connect path', async () => {
		const testConnection = vi.fn().mockResolvedValue({ ok: true, device: 'cuda' });
		vi.mocked(getRemoteProviderClient).mockReturnValue({
			testConnection,
			listModels: vi.fn().mockResolvedValue([]),
			generate: vi.fn(),
			understand: vi.fn()
		});

		const store = new EngineStore(createFakeManager({}));
		store.remoteProvider = 'januslink';
		store.remoteBaseUrl = 'https://pc.tailnet-xxxx.ts.net';
		store.remoteApiKey = 'k'.repeat(32);

		await store.testRemoteConnection();

		expect(testConnection).toHaveBeenCalledOnce();
		expect(store.remoteTestState).toBe('success');
		expect(store.remoteTestError).toBeNull();
	});

	it('testRemoteConnection surfaces provider failure reason', async () => {
		vi.mocked(getRemoteProviderClient).mockReturnValue({
			testConnection: vi.fn().mockResolvedValue({
				ok: false,
				reason: 'Could not reach host. JANUS_ALLOWED_ORIGINS?'
			}),
			listModels: vi.fn().mockResolvedValue([]),
			generate: vi.fn(),
			understand: vi.fn()
		});

		const store = new EngineStore(createFakeManager({}));
		store.remoteBaseUrl = 'https://pc.tailnet-xxxx.ts.net';
		store.remoteApiKey = 'k'.repeat(32);

		await store.testRemoteConnection();

		expect(store.remoteTestState).toBe('error');
		expect(store.remoteTestError).toContain('JANUS_ALLOWED_ORIGINS');
	});

	it('connectRemote saves januslink config and selects remote', async () => {
		const select = vi.fn(async (id: EngineId) => {
			void id;
		});
		vi.mocked(getRemoteProviderClient).mockReturnValue({
			testConnection: vi.fn().mockResolvedValue({ ok: true }),
			listModels: vi.fn().mockResolvedValue([]),
			generate: vi.fn(),
			understand: vi.fn()
		});

		const store = new EngineStore(createFakeManager({ select }));
		store.remoteProvider = 'januslink';
		store.remoteBaseUrl = 'https://pc.tailnet-xxxx.ts.net/';
		store.remoteApiKey = 'a'.repeat(32);
		store.remoteTestState = 'success';
		store.showRemoteSetup = true;

		await store.connectRemote();

		expect(store.showRemoteSetup).toBe(false);
		expect(select).toHaveBeenCalledWith('remote', expect.any(Function));
		expect(storeMap.has(REMOTE_CONFIG_STORAGE_KEY)).toBe(true);
		expect(loadRemoteConfig()).toEqual({
			provider: 'januslink',
			baseUrl: 'https://pc.tailnet-xxxx.ts.net',
			apiKey: 'a'.repeat(32)
		});
	});

	it('connectRemote refuses when test has not succeeded', async () => {
		const select = vi.fn();
		const store = new EngineStore(createFakeManager({ select }));
		store.remoteBaseUrl = 'https://pc.tailnet-xxxx.ts.net';
		store.remoteApiKey = 'a'.repeat(32);
		store.remoteTestState = 'idle';

		await store.connectRemote();

		expect(select).not.toHaveBeenCalled();
		expect(store.remoteTestState).toBe('error');
		expect(store.remoteTestError).toMatch(/Test the connection/i);
	});

	it('setRemoteProvider applies default base URL and resets test state', () => {
		const store = new EngineStore(createFakeManager({}));
		store.remoteTestState = 'success';
		store.remoteTestError = 'stale';
		store.remoteAvailableModels = ['old'];
		store.setRemoteProvider('ollama');
		expect(store.remoteProvider).toBe('ollama');
		expect(store.remoteBaseUrl).toBe('http://localhost:11434');
		expect(store.remoteTestState).toBe('idle');
		expect(store.remoteTestError).toBeNull();
		expect(store.remoteAvailableModels).toEqual([]);
	});

	it('refreshRemoteModels works before model fields are filled', async () => {
		const listModels = vi.fn().mockResolvedValue(['flux', 'llava']);
		vi.mocked(getRemoteProviderClient).mockReturnValue({
			testConnection: vi.fn(),
			listModels,
			generate: vi.fn(),
			understand: vi.fn()
		});

		const store = new EngineStore(createFakeManager({}));
		store.remoteProvider = 'ollama';
		store.remoteBaseUrl = 'http://localhost:11434';
		store.remoteGenerateModel = '';
		store.remoteCritiqueModel = '';

		await store.refreshRemoteModels();

		expect(listModels).toHaveBeenCalledOnce();
		expect(store.remoteAvailableModels).toEqual(['flux', 'llava']);
	});

	it('connectRemote saves ollama config with split models', async () => {
		const select = vi.fn(async (id: EngineId) => {
			void id;
		});
		vi.mocked(getRemoteProviderClient).mockReturnValue({
			testConnection: vi.fn().mockResolvedValue({ ok: true }),
			listModels: vi.fn().mockResolvedValue([]),
			generate: vi.fn(),
			understand: vi.fn()
		});

		const store = new EngineStore(createFakeManager({ select }));
		store.remoteProvider = 'ollama';
		store.remoteBaseUrl = 'http://localhost:11434/';
		store.remoteApiKey = '';
		store.remoteGenerateModel = 'flux';
		store.remoteCritiqueModel = 'llava';
		store.remoteTestState = 'success';
		store.showRemoteSetup = true;

		await store.connectRemote();

		expect(select).toHaveBeenCalledWith('remote', expect.any(Function));
		expect(loadRemoteConfig()).toEqual({
			provider: 'ollama',
			baseUrl: 'http://localhost:11434',
			apiKey: '',
			generateModel: 'flux',
			critiqueModel: 'llava'
		});
	});

	it('setRemoteProvider applies OpenRouter cloud defaults', () => {
		const store = new EngineStore(createFakeManager({}));
		store.setRemoteProvider('openrouter');
		expect(store.remoteProvider).toBe('openrouter');
		expect(store.remoteBaseUrl).toBe('https://openrouter.ai/api/v1');
		expect(store.remoteTestState).toBe('idle');
	});

	it('refreshRemoteModels works for openrouter before models/key are filled', async () => {
		const listModels = vi.fn().mockResolvedValue(['black-forest-labs/flux', 'openai/gpt-4o']);
		vi.mocked(getRemoteProviderClient).mockReturnValue({
			testConnection: vi.fn(),
			listModels,
			generate: vi.fn(),
			understand: vi.fn()
		});

		const store = new EngineStore(createFakeManager({}));
		store.remoteProvider = 'openrouter';
		store.remoteBaseUrl = 'https://openrouter.ai/api/v1';
		store.remoteApiKey = '';
		store.remoteGenerateModel = '';
		store.remoteCritiqueModel = '';

		await store.refreshRemoteModels();

		expect(listModels).toHaveBeenCalledOnce();
		expect(store.remoteAvailableModels).toEqual(['black-forest-labs/flux', 'openai/gpt-4o']);
	});

	it('connectRemote saves openai cloud config', async () => {
		const select = vi.fn(async (id: EngineId) => {
			void id;
		});
		vi.mocked(getRemoteProviderClient).mockReturnValue({
			testConnection: vi.fn().mockResolvedValue({ ok: true }),
			listModels: vi.fn().mockResolvedValue([]),
			generate: vi.fn(),
			understand: vi.fn()
		});

		const store = new EngineStore(createFakeManager({ select }));
		store.remoteProvider = 'openai';
		store.remoteBaseUrl = 'https://api.openai.com/v1/';
		store.remoteApiKey = 'test-key-not-real-00000000';
		store.remoteGenerateModel = 'dall-e-3';
		store.remoteCritiqueModel = 'gpt-4o';
		store.remoteTestState = 'success';
		store.showRemoteSetup = true;

		await store.connectRemote();

		expect(select).toHaveBeenCalledWith('remote', expect.any(Function));
		expect(loadRemoteConfig()).toEqual({
			provider: 'openai',
			baseUrl: 'https://api.openai.com/v1',
			apiKey: 'test-key-not-real-00000000',
			generateModel: 'dall-e-3',
			critiqueModel: 'gpt-4o'
		});
	});
});
