# Engine layer

Plumbing between the game and any AI backend. Every engine implements `ArtEngine` from
`$lib/types/contracts`; the manager probes the device once, keeps `mock` as the floor,
and degrades gracefully when a real engine fails mid-commission.

## Public surface

Import from `$lib/engines`:

| Export                                                                                                     | Role                                            |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `EngineManager`                                                                                            | Probe, select, generate, critique with fallback |
| `ENGINE_REGISTRY`                                                                                          | Lazy factory descriptors for all tiers          |
| `detectCapability`, `meetsRequirements`                                                                    | Device gating                                   |
| `EngineError`, `toEngineError`                                                                             | Player-safe failures                            |
| `buildKeywordQuestion`, `buildReviewPrompt`, `parseYesNo`, `accuracyFromHits`, `buildTitle`, `cleanReview` | Shared vision-critique helpers for real engines |

The `mock` engine (`MockEngine`) lives at `$lib/engines/mock/mockEngine` and is wired
through the registry; consumers should use `EngineManager`, not construct engines
directly.

## Engine tiers

| id               | tier | Download | WebGPU | Desktop only | Status                                       |
| ---------------- | ---- | -------- | ------ | ------------ | -------------------------------------------- |
| `mock`           | 0    | none     | no     | no           | **Complete** — procedural SVG + text scoring |
| `janus-webgpu`   | 1    | ~1024 MB | yes    | no           | Stub — spec 05                               |
| `sdturbo-webgpu` | 2    | ~1536 MB | yes    | yes          | Stub — spec 06                               |

`remote` is reserved for a later phase and is not registered.

## Invariants

- **`mock` is production tier.** A real share of players never load a model; the game
  must be complete on procedural art alone.
- **`Artwork.playerPrompt` is verbatim player input.** The built `prompt` (with hidden
  Level 1 modifiers) is never echoed back — that would break the central joke.
- **Never auto-download.** `EngineManager.init()` restores `localStorage['adt.engine']`
  only when the engine is available and already cached (`requiresDownload: false`).
- **Runtime failures fall back to `mock` once**, except `'cancelled'`, which propagates.
- **Critique without vision** routes to `mock` when `capabilities.critique === false`.
- **Determinism:** `hashString`, `mulberry32`, and seeded template picks keep mock output
  stable for tests and replays.

## Adding an engine

1. Implement `ArtEngine` in `src/lib/engines/<name>/`.
2. Add a descriptor to `ENGINE_REGISTRY` with a dynamic `create` import.
3. Declare accurate `requirements` — `meetsRequirements` gates before `probe`.
4. Run inference in a Web Worker (specs 05/06); `mock` stays on the main thread.
5. Use `critiqueProtocol` helpers for vision Q&A so accuracy matches the domain ladder.
6. Throw only `EngineError`; wrap unknowns with `toEngineError`.

## Deliberately not done here

- Janus and SD-Turbo workers (specs 05 and 06 replace the stubs wholesale).
- Game state wiring (spec 04 `EngineStore`).
- Remote/user-supplied API tier.

## Tests

```powershell
npm run test:unit -- --run --project=node src/lib/engines
npm run test:unit -- --run --project=client src/lib/engines/capability.svelte.test.ts
```
