# Remote engine — My PC (JanusLink)

`RemoteEngine` implements `ArtEngine` against a [JanusLink](https://github.com/MichaelTJ/ADTLocalServe)
install on the player's home GPU. No WebGPU, no model download in the browser — generate and
critique run on the PC over Tailscale HTTPS with Bearer auth.

## Public surface

| Export                                                        | Role                                          |
| ------------------------------------------------------------- | --------------------------------------------- |
| `RemoteEngine`                                                | `ArtEngine` for registry id `remote`          |
| `loadRemoteConfig` / `saveRemoteConfig` / `clearRemoteConfig` | localStorage under `adt.engine.remote.config` |
| `createJanusLinkClient`                                       | HTTP client for `/api/janus/*`                |
| `remoteEngineConfigSchema`                                    | Zod config (`baseUrl` + `apiKey`)             |

Import the engine via the registry (`ENGINE_REGISTRY`); do not construct it from game code.

## Player setup

1. Install JanusLink on the GPU PC (`installer/install.ps1` in ADTLocalServe).
2. Join Tailscale on the PC and on the device running the game.
3. In `phone-app/.env` on the PC, allow this game's origin:
   ```
   JANUS_ALLOWED_ORIGINS=http://localhost:5173,https://your-game-host.example
   ```
4. In the game: **Art engine → My PC → Set up My PC**.
5. Paste the Tailscale HTTPS URL and `JANUS_API_KEY`, **Test connection**, then **Connect**.

## Auth note

JanusLink session cookies are `SameSite=lax`, so they are not sent on cross-origin fetches from a
static game host. This engine uses `Authorization: Bearer <JANUS_API_KEY>` only. The key stays in
the player's browser `localStorage` and is only sent to their own Tailscale host.

## Invariants

- Never send `playerPrompt` to JanusLink — only the built Level 1 `prompt`.
- Validate every HTTP JSON response with Zod before use.
- No `+server.ts` in this game — the client talks to JanusLink directly.
- Runtime failures still fall back to `mock` via `EngineManager`.

## Tests

```powershell
npm run test:unit -- --run --project=node src/lib/engines/remote
```

All HTTP is faked; tests must never hit a real JanusLink host.
