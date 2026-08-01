# Engine layer

Plumbing between the game and any AI backend. Every engine implements `ArtEngine` from
`$lib/types/contracts`; the manager probes the device once, keeps `mock` as the floor,
and degrades gracefully when a real engine fails mid-commission.

## Public surface

Import from `$lib/engines`:

| Export                                                                                                                                | Role                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `EngineManager`                                                                                                                       | Probe, select, generate, critique with fallback |
| `ENGINE_REGISTRY`                                                                                                                     | Lazy factory descriptors for all tiers          |
| `detectCapability`, `meetsRequirements`                                                                                               | Device gating                                   |
| `EngineError`, `toEngineError`                                                                                                        | Player-safe failures                            |
| `buildKeywordQuestion`, `buildReviewPrompt`, `parseYesNo`, `accuracyFromHits`, `buildTitle`, `cleanReview`, `critiqueTargetsForBrief` | Shared vision-critique helpers for real engines |

The `mock` engine (`MockEngine`) lives at `$lib/engines/mock/mockEngine` and is wired
through the registry; consumers should use `EngineManager`, not construct engines
directly.

## Engine tiers

| id               | tier | Download | WebGPU | Desktop only | Status                                                                                |
| ---------------- | ---- | -------- | ------ | ------------ | ------------------------------------------------------------------------------------- |
| `mock`           | 0    | none     | no     | no           | **Complete** — procedural SVG + text scoring                                          |
| `janus-webgpu`   | 1    | ~1024 MB | yes    | no           | **Complete** — in-browser Janus (spec 05)                                             |
| `remote`         | 1    | none     | no     | no           | **Complete** — My PC (07–09): JanusLink, Ollama, LM Studio, A1111, OpenRouter, OpenAI |
| `sdturbo-webgpu` | 2    | ~1536 MB | yes    | yes          | **Complete** — SD-Turbo + Janus critique (spec 06)                                    |

### Sketch refine (spec 11)

`ArtEngine.generate` accepts optional `sketchImage?: Blob`. Engines that cannot edit
**ignore** it. Behaviour:

- **Mock** — returns the sketch as a data-URL artwork (prompt-only SVG when absent).
- **Remote / JanusLink** — when `sketchImage` is set and the provider implements `edit`,
  calls `POST /api/janus/edit` with the built Level 1 `prompt` (never a separate
  `playerPrompt` field). BAGEL-missing / 501 errors become a player-safe
  `EngineError('generation_failed', …)`; `EngineManager` falls back to mock.
- **Other My PC providers (08/09)** — no `edit`; sketch is ignored, generate as today.

## Invariants

- **`mock` is production tier.** A real share of players never load a model; the game
  must be complete on procedural art alone.
- **`Artwork.playerPrompt` is verbatim player input.** The built `prompt` (with hidden
  Level 1 modifiers) is never echoed back — that would break the central joke.
- **Never auto-download.** `EngineManager.init()` restores `localStorage['adt.engine']`
  only when the engine is available and already cached (`requiresDownload: false`).
- **Runtime failures fall back to `mock` once**, except `'cancelled'`, which propagates.
- **Critique without vision** routes to `mock` when `capabilities.critique === false`.
- **Critique targets** come from `critiqueTargetsForBrief(brief, playerPrompt)`, not a
  raw `preferredKeywords` slice. Empty targets (abstract parrot / no cluster) → Janus and
  Remote set `accuracyScore = 1` and still request review prose; mock keeps using
  `scorePrompt` and names the cluster label in review copy when a reading was committed.
- **Determinism:** `hashString`, `mulberry32`, and seeded template picks keep mock output
  stable for tests and replays.

## Adding an engine

1. Implement `ArtEngine` in `src/lib/engines/<name>/`.
2. Add a descriptor to `ENGINE_REGISTRY` with a dynamic `create` import.
3. Declare accurate `requirements` — `meetsRequirements` gates before `probe`.
4. Run inference in a Web Worker (specs 05/06); `mock` stays on the main thread.
   Remote engines use HTTP instead (no WebGPU download in the tab).
5. Use `critiqueProtocol` helpers for vision Q&A so accuracy matches the domain ladder.
6. Throw only `EngineError`; wrap unknowns with `toEngineError`.

## Deliberately not done here

- ADT Cloud accounts/credits (spec 10).
- ComfyUI as a first-class My PC provider (greyed Coming soon; A1111 covers local SD).

## Tests

```powershell
npm run test:unit -- --run --project=node src/lib/engines
npm run test:unit -- --run --project=client src/lib/engines/capability.svelte.test.ts
```
