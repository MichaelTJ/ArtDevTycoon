# Spec 09 — BYO API (OpenRouter, OpenAI)

**Worktree:** `git worktree add -b agent/byo-api ../adt-wt-byo-api main`
**Depends on:** Spec 08 merged to `main` (provider framework + `MyPcSetup` multi-provider UI).
**Do not run concurrently with:** any agent editing `src/lib/engines/remote/**`,
`MyPcSetup.svelte`, `engineStore.svelte.ts`, or `+page.svelte` remote setup wiring.
**Do not start until Wave G (spec 08) is merged.**

## Ownership zone

```
New:
  src/lib/engines/remote/providers/openAiCompatClient.ts
  src/lib/engines/remote/providers/openAiCompatClient.test.ts
  src/lib/engines/remote/providers/openrouterClient.ts
  src/lib/engines/remote/providers/openrouterClient.test.ts
  src/lib/engines/remote/providers/openaiClient.ts
  src/lib/engines/remote/providers/openaiClient.test.ts

Edit (additive only — do not break 08 providers):
  src/lib/engines/remote/remoteConfig.ts
  src/lib/engines/remote/remoteConfig.test.ts
  src/lib/engines/remote/providers/types.ts      ← extend provider id union
  src/lib/engines/remote/providers/index.ts     ← register openrouter + openai
  src/lib/engines/remote/providers/README.md
  src/lib/engines/remote/README.md
  src/lib/engines/README.md
  src/lib/engines/remote/remoteEngine.ts        ← only if displayName/description needs tweak
  src/lib/components/MyPcSetup.svelte
  src/lib/components/MyPcSetup.svelte.test.ts
  src/lib/components/README.md
  src/lib/stores/engineStore.svelte.ts
  src/lib/stores/engineStore.svelte.test.ts
  src/routes/+page.svelte                      ← bind new fields if any
  docs/agent-log.md                            ← handoff append
```

**MUST NOT** edit: `package.json`, `contracts.ts`, `docs/architecture.md`.
No `npm install`. No state-changing git. No `+server.ts`.

---

## Mission

Let the player paste their own **cloud API key** and run generate + critique from the browser
(still no game backend). Setup requires:

- **API key** (stored in `localStorage` — warn the player)
- **Generation model** id
- **Critique model** id (vision-capable chat)

| Provider     | Default baseUrl                   | List models        | Generate                 | Critique                |
| ------------ | --------------------------------- | ------------------ | ------------------------ | ----------------------- |
| `openrouter` | `https://openrouter.ai/api/v1`    | `GET /models`      | `POST /images/generations` | `POST /chat/completions` |
| `openai`     | `https://api.openai.com/v1`       | `GET /models`      | `POST /images/generations` | `POST /chat/completions` |

Pitch: **"Bring your own OpenRouter or OpenAI key. Pick an image model and a vision critic."**

---

## 1. Config additions

Extend the discriminated union in `remoteConfig.ts` with two new arms:

```ts
const cloudKey = z.string().min(8).max(512);

const openrouterConfigSchema = z.object({
	provider: z.literal('openrouter'),
	baseUrl: urlSchema.default('https://openrouter.ai/api/v1'),
	apiKey: cloudKey,
	generateModel: z.string().min(1).max(200),
	critiqueModel: z.string().min(1).max(200)
});

const openaiConfigSchema = z.object({
	provider: z.literal('openai'),
	baseUrl: urlSchema.default('https://api.openai.com/v1'),
	apiKey: cloudKey,
	generateModel: z.string().min(1).max(200),
	critiqueModel: z.string().min(1).max(200)
});
```

Add both to `remoteEngineConfigSchema`.

Update `defaultBaseUrlForProvider`:

| provider     | default |
| ------------ | ------- |
| openrouter   | `https://openrouter.ai/api/v1` |
| openai       | `https://api.openai.com/v1` |

**Tests:**

| Case | Expected |
| ---- | -------- |
| openrouter round-trip | provider + models + key preserved; baseUrl slash stripped |
| openai missing apiKey | load → null |
| apiKey length 7 | save throws |
| ollama config from spec 08 | still loads |

---

## 2. Shared OpenAI-compat client — `openAiCompatClient.ts`

Both vendors share nearly identical HTTP. Implement once:

```ts
export interface OpenAiCompatOptions {
	/** Extra headers on every request (OpenRouter referer/title). */
	extraHeaders?: Record<string, string>;
	/** Player-safe reachability / CORS hint. */
	reachabilityHint: string;
	fetch?: typeof fetch;
}

export function createOpenAiCompatClient(
	options: OpenAiCompatOptions
): RemoteProviderClient;
```

### Auth

Always `Authorization: Bearer ${config.apiKey}` when calling cloud providers.
**MUST NOT** put the apiKey into thrown Error messages. Prefer:
`'Authentication failed (401). Check your API key.'` — never echo the key.

### `listModels`

`GET {baseUrl}/models` with Bearer (+ extraHeaders).

OpenRouter returns `{ data: [{ id: string }] }`.
OpenAI returns `{ data: [{ id: string }] }`.

Zod:

```ts
z.object({
	data: z.array(z.object({ id: z.string().min(1) })).default([])
})
```

Return ids sorted lexicographically.

### `testConnection`

`listModels` with `CONNECTION_TEST_TIMEOUT_MS`. Success →
`{ ok: true, device: 'openrouter' | 'openai' }` — pass device via options:

```ts
export function createOpenAiCompatClient(
	options: OpenAiCompatOptions & { deviceLabel: string }
): RemoteProviderClient;
```

Failure → `{ ok: false, reason }` using reachabilityHint on network errors.

### `generate`

Require cloud config with `generateModel`.

`POST {baseUrl}/images/generations`

```json
{
  "model": "<generateModel>",
  "prompt": "<prompt>",
  "n": 1,
  "size": "1024x1024",
  "response_format": "b64_json"
}
```

(OpenAI `gpt-image-1` may ignore `response_format`; still send it. Accept either.)

Response zod:

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
})
```

1. Prefer `b64_json` → `{ mimeType: 'image/png', base64 }`
2. Else `url` → fetch → blob → raw base64
3. Else throw `'Image API returned no image data.'`

If HTTP status is 404:

`'This model does not support image generation via /images/generations. Pick an image model.'`

### `understand`

`POST {baseUrl}/chat/completions`

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

Content extraction:

- `choices[0].message.content` string → use it
- array of `{ type:'text', text }` → join texts with space
- missing → `''`

**Tests (`openAiCompatClient.test.ts`):** listModels sort; generate b64; generate url fetch;
understand string; 401 without leaking key; 404 generate message; network → reachabilityHint.
Fake key only: `test-key-not-real-00000000`.

---

## 3. Vendor wrappers

### `openrouterClient.ts`

```ts
export function createOpenRouterClient(deps?: { fetch?: typeof fetch }): RemoteProviderClient {
	return createOpenAiCompatClient({
		fetch: deps?.fetch,
		deviceLabel: 'openrouter',
		reachabilityHint:
			'Could not reach OpenRouter. Check your network and API key.',
		extraHeaders: {
			'HTTP-Referer': 'https://art-dev-tycoon.local',
			'X-Title': 'Art Dev Tycoon'
		}
	});
}
```

### `openaiClient.ts`

```ts
export function createOpenAIClient(deps?: { fetch?: typeof fetch }): RemoteProviderClient {
	return createOpenAiCompatClient({
		fetch: deps?.fetch,
		deviceLabel: 'openai',
		reachabilityHint:
			'Could not reach OpenAI. Check your network and API key.'
	});
}
```

Thin tests that factory returns a client whose `testConnection` hits `/models` (one smoke test each).

---

## 4. Factory + types

In `providers/types.ts`, extend:

```ts
export const REMOTE_PROVIDER_IDS = [
	'januslink',
	'ollama',
	'lmstudio',
	'automatic1111',
	'openrouter',
	'openai'
] as const;
export type RemoteProviderId = (typeof REMOTE_PROVIDER_IDS)[number];
```

(If 08 used `LOCAL_PROVIDER_IDS`, rename or add `REMOTE_PROVIDER_IDS` that includes all six;
keep backward alias `LOCAL_PROVIDER_IDS = …` only if tests import it — prefer one name
`REMOTE_PROVIDER_IDS`.)

`getRemoteProviderClient`:

- `openrouter` → `createOpenRouterClient()`
- `openai` → `createOpenAIClient()`

---

## 5. UI — `MyPcSetup.svelte`

1. Add provider options **OpenRouter** and **OpenAI** (enable them; remove from Coming soon).
2. Coming soon remains: ComfyUI, Art Dev Tycoon Cloud.
3. For `openrouter` / `openai`:
   - Show API key (password), baseUrl (prefilled default, editable for proxies),
     generateModel, critiqueModel, Refresh models.
   - Warning paragraph (exact copy):

> Your API key is stored in this browser's localStorage and sent only to the provider you
> configure. Anyone with access to this device can read it. Clear it anytime with Disconnect
> settings (or clear site data).

4. Connect still requires successful Test.

**Tests:** openrouter shows API key + warning text; Coming soon does not include OpenRouter;
callbacks still work.

---

## 6. Store wiring

Extend `remoteProvider` state union with `'openrouter' | 'openai'`.

`buildRemoteConfigFromFields` branches:

```ts
if (remoteProvider === 'openrouter' || remoteProvider === 'openai') {
	return {
		provider: remoteProvider,
		baseUrl: remoteBaseUrl,
		apiKey: remoteApiKey,
		generateModel: remoteGenerateModel,
		critiqueModel: remoteCritiqueModel
	};
}
```

`setRemoteProvider` applies cloud defaults via `defaultBaseUrlForProvider`.

`connectRemote` / `testRemoteConnection` unchanged structurally — zod discriminates.

Optional: when clearing connection, ensure `clearRemoteConfig` still works (already exists).

---

## 7. Security rules (binding)

- **MUST NOT** log apiKey, put it in `testError` strings, or commit real keys.
- Test fixtures use only `test-key-not-real-00000000` (length ≥ 8).
- Error bodies from vendors may be shown **only after** redacting substrings that equal the
  current apiKey (`message.replaceAll(apiKey, '***')`).

---

## 8. RemoteEngine

No structural change required if 08 already uses `getRemoteProviderClient(config.provider)`.
Update description if helpful:

```
'Your GPU, local server, or cloud key (JanusLink, Ollama, LM Studio, A1111, OpenRouter, OpenAI).'
```

---

## 9. README

Document OpenRouter and OpenAI setup in `src/lib/engines/remote/README.md`:

1. Get an API key from the vendor.
2. Engine menu → My PC → choose OpenRouter or OpenAI.
3. Paste key, pick image model + vision model, Test, Connect.
4. Cost warning: cloud calls bill the player's account.

---

## 10. Manual verification

1. OpenRouter: one commission with a cheap image model + vision model (or record skip if no key).
2. OpenAI: same.
3. Wrong key → Test shows 401 without echoing key.
4. Reload page → config persists; engine still available.
5. `clearRemoteConfig` / change provider → previous key not sent to new host incorrectly
   (switching provider should reset test state; key field may remain — ok if user clears).

---

## 11. Definition of done

- [ ] `openrouter` and `openai` in config union + defaults
- [ ] `openAiCompatClient` + vendor wrappers registered in factory
- [ ] MyPcSetup enables both; warning copy present; Comfy/Cloud still Coming soon
- [ ] Store builds/saves cloud configs; models refresh works with fakes in tests
- [ ] No apiKey leakage in errors; no real network in tests; no `+server.ts`
- [ ] Spec 08 providers still pass their tests
- [ ] `npm run check` green; owned unit tests green
- [ ] README + agent-log handoff

---

## Files to create (summary)

| File | Contents |
| ---- | -------- |
| `providers/openAiCompatClient.ts` | shared OpenAI HTTP |
| `providers/openAiCompatClient.test.ts` | |
| `providers/openrouterClient.ts` | thin wrapper |
| `providers/openrouterClient.test.ts` | smoke |
| `providers/openaiClient.ts` | thin wrapper |
| `providers/openaiClient.test.ts` | smoke |
