# Remote engine — My PC

`RemoteEngine` implements `ArtEngine` against a player-run backend: JanusLink on a home
GPU, or local servers (Ollama, LM Studio, Automatic1111). No WebGPU and no model download
in the browser.

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

| Provider        | Default base URL         | Generate                 | Critique                   |
| --------------- | ------------------------ | ------------------------ | -------------------------- |
| `januslink`     | (Tailscale URL)          | `/api/janus/generate`    | `/api/janus/understand`    |
| `ollama`        | `http://localhost:11434` | `/api/generate`          | `/api/chat` + images       |
| `lmstudio`      | `http://localhost:1234`  | `/v1/images/generations` | `/v1/chat/completions`     |
| `automatic1111` | `http://127.0.0.1:7860`  | `/sdapi/v1/txt2img`      | paired Ollama or LM Studio |

Legacy saves with only `baseUrl` + `apiKey` migrate to `provider: 'januslink'`.

## Player setup

1. Engine menu → **My PC** → Set up My PC.
2. Choose a provider.
3. Paste URL / models / key as required → **Test connection** → **Connect**.

### CORS

| Provider  | Note                                          |
| --------- | --------------------------------------------- |
| JanusLink | `JANUS_ALLOWED_ORIGINS` on the PC             |
| Ollama    | `OLLAMA_ORIGINS` must include the game origin |
| LM Studio | Enable CORS in Developer settings             |
| A1111     | Launch with `--api` and CORS allowlist        |

## Invariants

- Never send `playerPrompt` to providers — only the built Level 1 `prompt`.
- Validate every HTTP JSON response with Zod before use.
- No `+server.ts` in this game — the client talks to the provider directly.
- Runtime failures still fall back to `mock` via `EngineManager`.

## Tests

```powershell
npm run test:unit -- --run --project=node src/lib/engines/remote
```

All HTTP is faked; tests must never hit a real host.
