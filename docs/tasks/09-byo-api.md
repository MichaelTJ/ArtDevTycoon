# Spec 09 — BYO API (OpenRouter, OpenAI) — STUB

**Status:** Placeholder. A full spec will replace this before implementation.
**Depends on:** Spec 07 merged; spec 08 provider framework helpful but not required.
**Priority:** Optional. After local providers or in parallel if provider interface exists.

## Mission (draft)

Let the player paste their own **API key** and call a cloud vendor from the browser (still no
game backend). Setup requires **two model selections** plus credentials:

- **Generation model** — e.g. DALL·E, Flux via OpenRouter, SDXL endpoint
- **Critique model** — vision-capable chat model on the same vendor
- **API key** — stored in `localStorage`; README must warn this is player-owned risk

Vendors to support (draft):

| Vendor     | List models      | Generate               | Vision critique          |
| ---------- | ---------------- | ---------------------- | ------------------------ |
| OpenRouter | `GET /v1/models` | Vendor-dependent       | Vision-capable models    |
| OpenAI     | `GET /v1/models` | `gpt-image-*` / DALL·E | `gpt-4o` / vision models |

## Config shape (draft)

```ts
{
  provider: 'openrouter' | 'openai',
  baseUrl?: string,           // optional override / proxy
  apiKey: string,
  generateModel: string,
  critiqueModel: string
}
```

UI: filter or tag suggested models ("image", "vision") where vendor metadata allows; always allow
manual model id entry.

## Ownership zone (draft)

```
src/lib/engines/remote/providers/openrouter.ts
src/lib/engines/remote/providers/openai.ts
RemoteEngineSetup (or BYOApiSetup.svelte)
remoteConfig.ts — apiKey field + provider enum
```

## Open questions for full spec

- Never log or echo API keys in errors
- Rate limits and cost disclosure in setup copy
- Whether OpenRouter single key can route both models (likely yes)
- Image gen response formats differ by model — normalize to `Artwork.imageUrl`

## Definition of done (TBD)

- [ ] Player picks **generate model** + **critique model** + enters API key
- [ ] One commission completes on OpenRouter **or** OpenAI (manual verify)
- [ ] Key persists across reload; clearing key marks engine unavailable
- [ ] No keys in test fixtures committed to repo
