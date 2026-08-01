# Remote providers

HTTP backends for the My PC (`remote`) engine. `RemoteEngine` picks a client via
`getRemoteProviderClient(provider)`.

## Public surface

| Export                    | Role                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| `getRemoteProviderClient` | Factory for all remote providers (local + OpenRouter/OpenAI)                 |
| `RemoteProviderClient`    | Shared interface (`testConnection`, `listModels?`, `generate`, `understand`) |
| `REMOTE_PROVIDER_IDS`     | Provider id list                                                             |

## Invariants

- Never send `playerPrompt` — only the built Level 1 `prompt`.
- Validate every JSON response with Zod.
- No real network in unit tests; inject `fetch`.
- Automatic1111 critiques via a paired Ollama or LM Studio client.
- A1111 `testConnection` tries `/sdapi/v1/sd-models`, then falls back to `/sdapi/v1/options`,
  then probes the paired critique provider.
- Cloud clients must not leak API keys in error strings.
- `EngineStore.refreshRemoteModels` may inject temporary model/key placeholders so listing
  works before the player types model ids; Connect still requires a full valid config.

## Tests

```powershell
npm run test:unit -- --run src/lib/engines/remote/providers
```
