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
- Cloud clients must not leak API keys in error strings.

## Tests

```powershell
npm run test:unit -- --run src/lib/engines/remote/providers
```
