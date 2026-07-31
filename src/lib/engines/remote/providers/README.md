# Remote providers

HTTP backends for the My PC (`remote`) engine. `RemoteEngine` picks a client via
`getRemoteProviderClient(provider)`.

## Public surface

| Export                    | Role                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| `getRemoteProviderClient` | Factory for januslink / ollama / lmstudio / automatic1111                    |
| `RemoteProviderClient`    | Shared interface (`testConnection`, `listModels?`, `generate`, `understand`) |
| `LOCAL_PROVIDER_IDS`      | Provider id list                                                             |

## Invariants

- Never send `playerPrompt` — only the built Level 1 `prompt`.
- Validate every JSON response with Zod.
- No real network in unit tests; inject `fetch`.
- Automatic1111 critiques via a paired Ollama or LM Studio client.

## Tests

```powershell
npm run test:unit -- --run src/lib/engines/remote/providers
```
