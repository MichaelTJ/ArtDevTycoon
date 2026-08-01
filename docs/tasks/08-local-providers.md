# Spec 08 — Local providers (split models)

**Worktree:** `git worktree add -b agent/local-providers ../adt-wt-local-providers main`
**Depends on:** Spec 07 merged to `main`.
**Do not run concurrently with:** any agent editing `src/lib/engines/remote/**`,
`MyPcSetup.svelte`, `engineStore.svelte.ts`, or `+page.svelte` remote setup wiring.
**Next:** Spec 09 (BYO API) — **after** this branch is merged. Do not parallelize 08 and 09.

## Ownership zone

```
New:
  src/lib/engines/remote/providers/types.ts
  src/lib/engines/remote/providers/index.ts
  src/lib/engines/remote/providers/ollamaClient.ts
  src/lib/engines/remote/providers/ollamaClient.test.ts
  src/lib/engines/remote/providers/lmStudioClient.ts
  src/lib/engines/remote/providers/lmStudioClient.test.ts
  src/lib/engines/remote/providers/a1111Client.ts
  src/lib/engines/remote/providers/a1111Client.test.ts
  src/lib/engines/remote/providers/janusAdapter.ts
  src/lib/engines/remote/providers/README.md

Edit:
  src/lib/engines/remote/remoteConfig.ts
  src/lib/engines/remote/remoteConfig.test.ts
  src/lib/engines/remote/remoteEngine.ts
  src/lib/engines/remote/remoteEngine.test.ts
  src/lib/engines/remote/janusLinkClient.ts   ← only if needed for adapter typing
  src/lib/engines/remote/README.md
  src/lib/engines/README.md
  src/lib/components/MyPcSetup.svelte
  src/lib/components/MyPcSetup.svelte.test.ts
  src/lib/components/README.md
  src/lib/stores/engineStore.svelte.ts
  src/lib/stores/engineStore.svelte.test.ts
  src/lib/components/EnginePicker.svelte       ← copy only if needed
  src/lib/components/EnginePicker.svelte.test.ts
  src/routes/+page.svelte                      ← remote setup props only
  docs/tasks/README.md                         ← Wave G note (if not already)
  docs/agent-log.md                            ← handoff append
```

**MUST NOT** edit: `package.json`, `contracts.ts`, `docs/architecture.md`, any `+server.ts`.
No `npm install`. No state-changing git.

---

## Mission

Extend the existing My PC (`remote`) engine with a **provider framework** so players can use
local backends where **generation** and **critique** are different models.

Keep **JanusLink** as the default provider (one model does both). Add:

| Provider        | Default base URL         | Generate                       | Critique                                      |
| --------------- | ------------------------ | ------------------------------ | --------------------------------------------- |
| `januslink`     | (player Tailscale URL)   | existing `/api/janus/generate` | existing `/api/janus/understand`              |
| `ollama`        | `http://localhost:11434` | `POST /api/generate` (image)   | `POST /api/chat` with `images: [b64]`         |
| `lmstudio`      | `http://localhost:1234`  | `POST /v1/images/generations`  | `POST /v1/chat/completions` (vision parts)    |
| `automatic1111` | `http://127.0.0.1:7860`  | `POST /sdapi/v1/txt2img`       | via paired `critiqueProvider` ollama/lmstudio |

**Out of scope:** ComfyUI+SD (greyed "Coming soon"), OpenRouter/OpenAI (spec 09), ADT Cloud.

Pitch: **"My PC — pick JanusLink, Ollama, LM Studio, or Automatic1111. Split gen/critique models when your stack needs it."**

---

## Architecture

```
RemoteEngine
  → loadRemoteConfig()  (discriminated union)
  → getRemoteProviderClient(config.provider)
       ├─ januslink      → janusAdapter → createJanusLinkClient
       ├─ ollama         → ollamaClient
       ├─ lmstudio       → lmStudioClient
       └─ automatic1111  → a1111Client (generate)
                           + getRemoteProviderClient(critiqueProvider) for understand
```

Nothing outside `src/lib/engines/remote/**` knows HTTP shapes. Engine id stays `remote`.

---

## 1. Provider types — `providers/types.ts`

```ts
import type { RemoteEngineConfig } from '../remoteConfig';

export const LOCAL_PROVIDER_IDS = ['januslink', 'ollama', 'lmstudio', 'automatic1111'] as const;
export type LocalProviderId = (typeof LOCAL_PROVIDER_IDS)[number];

export interface RemoteProviderClient {
	testConnection(
		config: RemoteEngineConfig,
		signal?: AbortSignal
	): Promise<{ ok: true; device?: string } | { ok: false; reason: string }>;

	/** Optional — JanusLink has no model list. Return [] if unsupported. */
	listModels?(config: RemoteEngineConfig, signal?: AbortSignal): Promise<string[]>;

	generate(
		config: RemoteEngineConfig,
		body: { prompt: string; seed?: number },
		signal?: AbortSignal
	): Promise<{ images: Array<{ mimeType: string; base64: string }> }>;

	understand(
		config: RemoteEngineConfig,
		body: { image: Blob; question: string; filename?: string },
		signal?: AbortSignal
	): Promise<{ text: string }>;
}
```

### `providers/index.ts`

```ts
export function getRemoteProviderClient(provider: LocalProviderId | string): RemoteProviderClient;
```

- `januslink` → `createJanusAdapter()`
- `ollama` → `createOllamaClient()`
- `lmstudio` → `createLmStudioClient()`
- `automatic1111` → `createA1111Client()`
- Unknown → throw `Error('Unknown remote provider: ' + provider)`

Shared constants (export from `types.ts` or a tiny `constants.ts` inside providers):

```ts
export const CONNECTION_TEST_TIMEOUT_MS = 6000;
export const REQUEST_TIMEOUT_MS = 180_000;
```

---

## 2. Config — extend `remoteConfig.ts`

```ts
export const REMOTE_CONFIG_STORAGE_KEY = 'adt.engine.remote.config';

const urlSchema = z
	.string()
	.url()
	.transform((url) => url.replace(/\/+$/, ''));

const januslinkConfigSchema = z.object({
	provider: z.literal('januslink'),
	baseUrl: urlSchema,
	apiKey: z.string().min(24).max(256)
});

const ollamaConfigSchema = z.object({
	provider: z.literal('ollama'),
	baseUrl: urlSchema.default('http://localhost:11434'),
	apiKey: z.string().max(256).default(''),
	generateModel: z.string().min(1).max(200),
	critiqueModel: z.string().min(1).max(200)
});

const lmstudioConfigSchema = z.object({
	provider: z.literal('lmstudio'),
	baseUrl: urlSchema.default('http://localhost:1234'),
	apiKey: z.string().max(256).default(''),
	generateModel: z.string().min(1).max(200),
	critiqueModel: z.string().min(1).max(200)
});

const a1111ConfigSchema = z.object({
	provider: z.literal('automatic1111'),
	baseUrl: urlSchema.default('http://127.0.0.1:7860'),
	apiKey: z.string().max(256).default(''),
	/** Checkpoint name is optional — A1111 uses whatever is loaded in its UI. */
	generateModel: z.string().max(200).default(''),
	critiqueProvider: z.enum(['ollama', 'lmstudio']),
	critiqueBaseUrl: urlSchema,
	critiqueModel: z.string().min(1).max(200)
});

export const remoteEngineConfigSchema = z.discriminatedUnion('provider', [
	januslinkConfigSchema,
	ollamaConfigSchema,
	lmstudioConfigSchema,
	a1111ConfigSchema
]);

export type RemoteEngineConfig = z.infer<typeof remoteEngineConfigSchema>;
```

### Backward compatibility in `loadRemoteConfig`

Before `safeParse`, if the parsed object is a plain object with `baseUrl` + `apiKey` and
**no** `provider` field, inject `provider: 'januslink'`.

```ts
function migrateLegacy(raw: unknown): unknown {
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		const obj = raw as Record<string, unknown>;
		if (
			obj.provider === undefined &&
			typeof obj.baseUrl === 'string' &&
			typeof obj.apiKey === 'string'
		) {
			return { provider: 'januslink', ...obj };
		}
	}
	return raw;
}
```

**Defaults for UI** (not persisted until Connect):

| Provider      | Default baseUrl          |
| ------------- | ------------------------ |
| januslink     | `''` (player must paste) |
| ollama        | `http://localhost:11434` |
| lmstudio      | `http://localhost:1234`  |
| automatic1111 | `http://127.0.0.1:7860`  |

Export helper:

```ts
export function defaultBaseUrlForProvider(provider: RemoteEngineConfig['provider']): string;
```

**Tests (`remoteConfig.test.ts`):**

| Case                                              | Expected                         |
| ------------------------------------------------- | -------------------------------- |
| Legacy `{ baseUrl, apiKey }` (apiKey length ≥ 24) | loads as `provider: 'januslink'` |
| ollama with both models                           | round-trip                       |
| ollama missing `critiqueModel`                    | `load` → null; `save` throws     |
| trailing slash on baseUrl                         | stripped                         |
| malformed JSON                                    | null                             |

---

## 3. Janus adapter — `providers/janusAdapter.ts`

Thin wrap of `createJanusLinkClient()`:

- `testConnection` / `generate` / `understand` delegate.
- `generate` return shape: map Janus result to `{ images: [{ mimeType, base64 }] }` (drop `promptId` / filename ok to keep).
- `listModels` omitted or returns `[]`.
- `testConnection` / errors: keep existing player-safe CORS copy about `JANUS_ALLOWED_ORIGINS`.

JanusLink config type narrowing: adapter methods only accept configs where
`config.provider === 'januslink'` — if called with wrong provider, throw
`'JanusLink client requires provider januslink'`.

---

## 4. Ollama — `providers/ollamaClient.ts`

```ts
export function createOllamaClient(deps?: { fetch?: typeof fetch }): RemoteProviderClient;
```

### Auth

If `config.apiKey` is non-empty, set `Authorization: Bearer ${apiKey}`. Otherwise no auth header.

### `listModels`

`GET {baseUrl}/api/tags` → zod:

```ts
z.object({ models: z.array(z.object({ name: z.string().min(1) })).default([]) });
```

Return `models.map(m => m.name)`.

### `testConnection`

Call `listModels` with `CONNECTION_TEST_TIMEOUT_MS`. On success `{ ok: true, device: 'ollama' }`.
On failure player-safe:

`'Could not reach ' + baseUrl + '. Is Ollama running? Enable CORS (OLLAMA_ORIGINS) for this game origin.'`

### `generate`

Only when `config.provider === 'ollama'`.

`POST {baseUrl}/api/generate` JSON:

```json
{ "model": "<generateModel>", "prompt": "<prompt>", "stream": false }
```

Include `options.seed` when `body.seed` is defined: `{ options: { seed: body.seed } }`.

Response zod (accept either image field):

```ts
z.object({
	response: z.string().optional(),
	images: z.array(z.string().min(1)).optional()
});
```

Image extraction order:

1. If `images` is a non-empty array → use `images[0]` as base64, `mimeType: 'image/png'`.
2. Else if `response` matches `/^[A-Za-z0-9+/=\s]+$/` and length > 256 → treat as base64 PNG.
3. Else throw: `'Ollama model did not return an image. Pick an image-capable generate model.'`

### `understand`

`POST {baseUrl}/api/chat` JSON:

```ts
{
  model: config.critiqueModel, // must be ollama config
  stream: false,
  messages: [
    {
      role: 'user',
      content: body.question,
      images: [await blobToRawBase64(body.image)] // no data: URL prefix
    }
  ]
}
```

Response: `{ message: { content: string } }` → `{ text: content }`.

For `automatic1111` critique routing, Ollama client may receive a **synthetic** ollama config
built by A1111 (see §6).

**Tests:** stub `fetch`; listModels names; generate with `images[0]`; generate text-only → throw;
understand returns content; network throw → CORS message. No real network.

---

## 5. LM Studio — `providers/lmStudioClient.ts`

OpenAI-compatible local server.

### `listModels`

`GET {baseUrl}/v1/models` → `{ data: [{ id: string }] }` → ids.

### `testConnection`

Same pattern; CORS message:

`'Could not reach ' + baseUrl + '. Is LM Studio running with a local server and CORS enabled?'`

### `generate`

`POST {baseUrl}/v1/images/generations`

```json
{
	"model": "<generateModel>",
	"prompt": "<prompt>",
	"n": 1,
	"size": "512x512",
	"response_format": "b64_json"
}
```

Parse:

```ts
z.object({
	data: z
		.array(
			z.object({
				b64_json: z.string().min(1).optional(),
				url: z.string().url().optional()
			})
		)
		.min(1)
});
```

Prefer `b64_json`. If only `url`, `fetch` the url → blob → base64 (injectable fetch). `mimeType: 'image/png'`.

Optional Bearer if `apiKey` non-empty.

### `understand`

`POST {baseUrl}/v1/chat/completions`

```ts
{
  model: critiqueModel,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: question },
      { type: 'image_url', image_url: { url: await blobToDataUrl(image) } }
    ]
  }]
}
```

Extract `choices[0].message.content` — if array of parts, join text parts; if string, use as-is.
Empty → `''`.

**Tests:** listModels; generate b64; understand content string; 401 reason; no network.

---

## 6. Automatic1111 — `providers/a1111Client.ts`

### `listModels`

`GET {baseUrl}/sdapi/v1/sd-models` → array of `{ title: string }` or `{ model_name: string }` —
accept either field via zod union/optional; return titles.

### `testConnection`

Hit `GET {baseUrl}/sdapi/v1/sd-models` OR `GET {baseUrl}/sdapi/v1/options`. Success →
`{ ok: true, device: 'automatic1111' }`.

Also verify critique side: build synthetic critique config and call that client's `testConnection`.
If critique fails, return that failure reason.

### `generate`

`POST {baseUrl}/sdapi/v1/txt2img`

```json
{
  "prompt": "<prompt>",
  "steps": 20,
  "width": 512,
  "height": 512,
  "seed": <body.seed ?? -1>
}
```

If `generateModel` non-empty, also send `"override_settings": { "sd_model_checkpoint": generateModel }`.

Response: `{ images: z.array(z.string().min(1)).min(1) }` → first image base64 PNG.

### `understand`

Build synthetic config:

```ts
{
  provider: config.critiqueProvider, // 'ollama' | 'lmstudio'
  baseUrl: config.critiqueBaseUrl,
  apiKey: '',
  generateModel: config.critiqueModel, // unused for understand
  critiqueModel: config.critiqueModel
}
```

Delegate to `getRemoteProviderClient(config.critiqueProvider).understand(synthetic, body, signal)`.

**Tests:** txt2img parse; understand delegates (mock child client via deps if you add
`createA1111Client({ critiqueClients })` — optional; otherwise stub fetch for both hosts).

---

## 7. Shared helpers

Put in `providers/http.ts` (or inline in each file — prefer one shared module):

```ts
export async function blobToRawBase64(blob: Blob): Promise<string>;
export async function blobToDataUrl(blob: Blob): Promise<string>;
export function reachabilityReason(baseUrl: string, hint: string): string;
```

---

## 8. `RemoteEngine` changes

- Replace direct `createJanusLinkClient` with `getRemoteProviderClient(config.provider)`.
- `RemoteEngineDeps`:

```ts
export interface RemoteEngineDeps {
	getClient?: (provider: string) => RemoteProviderClient;
	loadConfig?: () => RemoteEngineConfig | null;
}
```

- `probe` reason when no config:
  `'Not connected. Set up My PC in the engine menu.'`
- `generate` / `critique` unchanged scoring path — still use `critiqueProtocol` helpers.
- Description string update:

```
'Your GPU or local AI server (JanusLink, Ollama, LM Studio, Automatic1111). No browser download.'
```

Keep `displayName = 'My PC'`.

**Tests:** inject fake client; ollama-shaped config probe; generate playerPrompt preserved;
critique four yes → accuracy 10. Legacy januslink path still works.

---

## 9. `MyPcSetup.svelte`

Presentational. Extend props (keep filename):

| Prop                                | Type                                                             | Notes                                                |
| ----------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| `provider`                          | `$bindable` `'januslink'\|'ollama'\|'lmstudio'\|'automatic1111'` |                                                      |
| `baseUrl`                           | `$bindable` string                                               |                                                      |
| `apiKey`                            | `$bindable` string                                               | password; required UI for januslink; optional others |
| `generateModel`                     | `$bindable` string                                               | hidden for januslink                                 |
| `critiqueModel`                     | `$bindable` string                                               | hidden for januslink                                 |
| `critiqueProvider`                  | `$bindable` `'ollama'\|'lmstudio'`                               | a1111 only                                           |
| `critiqueBaseUrl`                   | `$bindable` string                                               | a1111 only                                           |
| `availableModels`                   | `string[]`                                                       | datalist options                                     |
| `testState`                         | idle/testing/success/error                                       |                                                      |
| `testError`                         | `string \| null`                                                 |                                                      |
| `onrefreshmodels`                   | `() => void`                                                     |                                                      |
| `ontest` / `onconnect` / `oncancel` | `() => void`                                                     | Connect disabled until success                       |

UI:

1. Provider `<select>` with four options.
2. On provider change (parent handles defaults): show fields for that provider.
3. Model inputs: `<input list="adt-remote-models">` + datalist from `availableModels`;
   button **Refresh models** → `onrefreshmodels`.
4. JanusLink: keep existing Tailscale URL + API key + setup help.
5. Greyed **Coming soon**: ComfyUI, OpenRouter, OpenAI, Art Dev Tycoon Cloud.

**Tests:** provider select visible; connect disabled until success; januslink hides model fields;
ollama shows both model fields; callbacks fire; accessible labels.

---

## 10. Store + page wiring

### `engineStore.svelte.ts`

Add state:

```ts
remoteProvider = $state<'januslink' | 'ollama' | 'lmstudio' | 'automatic1111'>('januslink');
remoteGenerateModel = $state('');
remoteCritiqueModel = $state('');
remoteCritiqueProvider = $state<'ollama' | 'lmstudio'>('ollama');
remoteCritiqueBaseUrl = $state('http://localhost:11434');
remoteAvailableModels = $state<string[]>([]);
```

Methods:

- `openRemoteSetup()` — preload from `loadRemoteConfig()` into fields; set defaults per provider
- `closeRemoteSetup()`
- `setRemoteProvider(p)` — switch provider; apply `defaultBaseUrlForProvider`; reset test state
- `refreshRemoteModels()` — `getRemoteProviderClient(provider).listModels?.(partialConfig)` →
  `remoteAvailableModels` (ignore errors; leave list empty)
- `testRemoteConnection()` — build config via zod safeParse from fields; on fail set error;
  else `getRemoteProviderClient(...).testConnection`
- `connectRemote()` — parse + `saveRemoteConfig` + `select('remote')` + close

Building config from fields (exact):

```ts
function buildRemoteConfigFromFields(): unknown {
	if (remoteProvider === 'januslink') {
		return { provider: 'januslink', baseUrl: remoteBaseUrl, apiKey: remoteApiKey };
	}
	if (remoteProvider === 'ollama' || remoteProvider === 'lmstudio') {
		return {
			provider: remoteProvider,
			baseUrl: remoteBaseUrl,
			apiKey: remoteApiKey,
			generateModel: remoteGenerateModel,
			critiqueModel: remoteCritiqueModel
		};
	}
	return {
		provider: 'automatic1111',
		baseUrl: remoteBaseUrl,
		apiKey: remoteApiKey,
		generateModel: remoteGenerateModel,
		critiqueProvider: remoteCritiqueProvider,
		critiqueBaseUrl: remoteCritiqueBaseUrl,
		critiqueModel: remoteCritiqueModel
	};
}
```

### `+page.svelte`

Pass new bindables and `onrefreshmodels={() => engines.refreshRemoteModels()}`.

---

## 11. README updates

`src/lib/engines/remote/README.md` — document all four providers, CORS notes:

| Provider  | CORS note                                    |
| --------- | -------------------------------------------- |
| JanusLink | `JANUS_ALLOWED_ORIGINS`                      |
| Ollama    | `OLLAMA_ORIGINS` must include game origin    |
| LM Studio | Enable CORS in Developer settings            |
| A1111     | launch with `--cors-allow-origins` / `--api` |

`providers/README.md` — public surface of factory + clients.

---

## 12. Manual verification

1. JanusLink path still connects and completes one commission.
2. Ollama with an image model + vision model: one commission.
3. LM Studio: one commission if server supports images + vision chat.
4. A1111 + Ollama critique: generate from A1111, critique from Ollama.
5. Stop server mid-run → mock fallback, no dead-end.

---

## 13. Definition of done

- [x] Discriminated `remoteEngineConfigSchema` with legacy januslink migration
- [x] `getRemoteProviderClient` + four providers (janus adapter, ollama, lmstudio, a1111)
- [x] `RemoteEngine` routes via factory; `playerPrompt` never sent to providers
- [x] `MyPcSetup` provider select + split model fields; Coming soon for Comfy/OpenRouter/OpenAI/Cloud
- [x] Store/page wiring for new fields
- [x] No real network in unit tests; no `+server.ts`
- [x] `npm run check` green; unit tests green for owned files
- [x] READMEs + `docs/agent-log.md` handoff

> Note (post Spec 09): OpenRouter/OpenAI are live providers, not Coming soon. DoD item above
> retains the original Spec 08 wording; UI Coming soon is ComfyUI + ADT Cloud only.

---

## Files to create (summary)

| File                                 | Contents        |
| ------------------------------------ | --------------- |
| `providers/types.ts`                 | interface + ids |
| `providers/index.ts`                 | factory         |
| `providers/janusAdapter.ts`          | wrap JanusLink  |
| `providers/ollamaClient.ts` + test   |                 |
| `providers/lmStudioClient.ts` + test |                 |
| `providers/a1111Client.ts` + test    |                 |
| `providers/README.md`                |                 |
| optional `providers/http.ts`         | base64 helpers  |
