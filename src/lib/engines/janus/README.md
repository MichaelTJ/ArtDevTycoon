# Janus-Pro-1B WebGPU engine

Janus-Pro-1B runs entirely in a Web Worker on WebGPU. One ~1 GB download covers both
text-to-image generation (384×384) and vision-based critique — the default real-AI tier
for Level 1.

## Public surface

Import from `$lib/engines/janus/janusEngine` (the registry lazy-loads this module):

| Export            | Role                                      |
| ----------------- | ----------------------------------------- |
| `JanusEngine`     | `ArtEngine` implementation                |
| `JanusEngineDeps` | Optional `{ createClient }` for tests     |
| `isModelCached`   | Best-effort Cache API probe for `probe()` |

Supporting modules (usually not imported by game code):

| Module               | Role                                     |
| -------------------- | ---------------------------------------- |
| `workerClient.ts`    | Promise RPC over `postMessage`           |
| `janus.worker.ts`    | Transformers.js inference (worker entry) |
| `imageConversion.ts` | `RawImage` ⇄ `ImageBitmap` ⇄ blob URL    |

## Invariants

- **All inference in the worker.** The main thread never loads model weights.
- **`playerPrompt` never enters the worker.** Only the built `prompt` (with hidden Level 1
  modifiers) is sent for generation; `playerPrompt` is echoed verbatim into `Artwork`.
- **No JSON from the model.** Critique uses narrow yes/no questions plus one prose prompt;
  scoring runs in `janusEngine.ts` via `critiqueProtocol` helpers.
- **Serialised worker requests.** Concurrent `generate` calls queue — never overlap in VRAM.
- **Object URLs tracked.** Every `blob:` URL is stored and revoked in `unload()` so the
  portfolio strip can keep showing earlier pieces until the engine is torn down.
- **Fail soft.** Errors become `EngineError`; the manager falls back to `mock`.

## Deliberately not done here

- SD-Turbo painting (spec 06) — separate engine tier.
- Creativity scoring and payout — domain layer in `$lib/game`.
- Engine picker / download UI — `$lib/stores` and `$lib/components`.

## Manual verification

Automated tests use injected fake workers and never download the model. After merging,
verify once in Chrome or Edge:

```powershell
npm run dev
```

Pick **Janus Pro 1B**, accept the download, complete one commission. Confirm download
progress, a responsive UI during generation, a 384×384 image, sensible critique, and
faster second generation when cached.

## Tests

```powershell
npm run test:unit -- --run --project=node src/lib/engines/janus
npm run test:unit -- --run --project=client src/lib/engines/janus/imageConversion.svelte.test.ts
```
