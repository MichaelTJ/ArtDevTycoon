# Remote engine — My PC

`RemoteEngine` implements `ArtEngine` against a player-run backend: JanusLink, local
servers (Ollama, LM Studio, Automatic1111), or BYO cloud keys (OpenRouter, OpenAI). No
WebGPU and no model download in the browser.

## Public surface

| Export                                                        | Role                                          |
| ------------------------------------------------------------- | --------------------------------------------- |
| `RemoteEngine`                                                | `ArtEngine` for registry id `remote`          |
| `loadRemoteConfig` / `saveRemoteConfig` / `clearRemoteConfig` | localStorage under `adt.engine.remote.config` |
| `remoteEngineConfigSchema`                                    | Discriminated Zod config by `provider`        |
| `defaultBaseUrlForProvider`                                   | UI defaults                                   |
| `getRemoteProviderClient`                                     | Provider HTTP factory (`providers/`)          |

Import the engine via the registry (`ENGINE_REGISTRY`); do not construct it from game code.

## Providers

| Provider        | Default base URL               | Generate                 | Critique                   |
| --------------- | ------------------------------ | ------------------------ | -------------------------- |
| `januslink`     | (Tailscale URL)                | `/api/janus/generate`    | `/api/janus/understand`    |
| `ollama`        | `http://localhost:11434`       | `/api/generate`          | `/api/chat` + images       |
| `lmstudio`      | `http://localhost:1234`        | `/v1/images/generations` | `/v1/chat/completions`     |
| `automatic1111` | `http://127.0.0.1:7860`        | `/sdapi/v1/txt2img`      | paired Ollama or LM Studio |
| `openrouter`    | `https://openrouter.ai/api/v1` | `/images/generations`    | `/chat/completions`        |
| `openai`        | `https://api.openai.com/v1`    | `/images/generations`    | `/chat/completions`        |

Legacy saves with only `baseUrl` + `apiKey` migrate to `provider: 'januslink'`.

Cloud keys are stored in this browser's `localStorage` and sent only to the configured
vendor. Cloud calls bill the player's own account.

## Player setup

1. Engine menu → **My PC** → Set up My PC.
2. Choose a provider.
3. Paste URL / models / key as required → **Test connection** → **Connect**.

### CORS / network

| Provider  | Note                                          |
| --------- | --------------------------------------------- |
| JanusLink | `JANUS_ALLOWED_ORIGINS` on the PC             |
| Ollama    | `OLLAMA_ORIGINS` must include the game origin |
| LM Studio | Enable CORS in Developer settings             |
| A1111     | Launch with `--api` and CORS allowlist        |
| Cloud     | Ordinary HTTPS to the vendor                  |

## Invariants

- Never send `playerPrompt` to providers — only the built Level 1 `prompt`.
- Validate every HTTP JSON response with Zod before use.
- Never echo API keys in errors or logs.
- No `+server.ts` in this game — the client talks to the provider directly.
- Runtime failures still fall back to `mock` via `EngineManager`.

## Tests

```powershell
npm run test:unit -- --run --project=node src/lib/engines/remote
```

All HTTP is faked; tests must never hit a real host.
