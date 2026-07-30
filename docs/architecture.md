# Architecture — Art Gallery Tycoon, Level 1

Read this after `best-practices.md`. It explains how the pieces fit and, more usefully,
why they are arranged this way — so you can tell which decisions are load-bearing and
which are free to change.

---

## 1. The game in one paragraph

The player runs a garage art studio. A client turns up with a brief ("a cozy coffee cup
on a wooden table"), the player writes a prompt, and the game silently staples a set of
amateur-quality modifiers onto that prompt before generating an image. An art critic
then looks at the result and scores it against the brief, paying out a fraction of the
client's budget. Five commissions and $500 unlocks Level 2. The joke the whole design
rests on is that the player never sees the modifiers, so their grand ambitions keep
coming back rendered in crayon.

## 2. What kind of app this is

**A browser and mobile game with no backend.** It builds to static files via
`adapter-static` and hosts on any CDN. All AI inference runs _in the player's browser_
on WebGPU. Nothing is uploaded, there are no API keys, no server bill, and the game
works offline once the model is cached.

That single choice drives almost everything below. In particular it means the device —
not our infrastructure — decides what is possible, and devices vary enormously.

---

## 3. Layer map

```
┌──────────────────────────────────────────────────────────────────┐
│  Main thread                                                     │
│    routes/+page.svelte                                           │
│    lib/components/**      presentational, props in / events out  │
│    lib/stores/**          game state machine + engine manager    │
│    lib/game/**            pure rules: scoring, payout, prompts   │
└─────────────────────────────┬────────────────────────────────────┘
                              │  postMessage, ImageBitmap transfer
┌─────────────────────────────▼────────────────────────────────────┐
│  Web Worker — all inference, never the main thread               │
│    lib/engines/janus/worker.ts     Transformers.js + WebGPU      │
│    lib/engines/sdturbo/worker.ts   ONNX Runtime Web + WebGPU     │
└──────────────────────────────────────────────────────────────────┘

  lib/engines/mock/  runs on the main thread — it is instant and has no model
```

Pure game rules in `src/lib/game/**` depend on nothing — no Svelte, no DOM, no engine.
That is what makes them exhaustively unit-testable and reusable by every engine.

---

## 4. The decision that shapes everything: tiered engines

Every AI backend implements one interface, `ArtEngine` in
`src/lib/types/contracts.ts`. An engine manager probes the device once and picks the
best tier it can actually run.

| Tier | Engine           | Download      | Needs           | Role                                                           |
| ---- | ---------------- | ------------- | --------------- | -------------------------------------------------------------- |
| 0    | `mock`           | none          | nothing         | Procedural SVG art, text-based scoring. **Always available.**  |
| 1    | `janus-webgpu`   | ~1 GB         | WebGPU          | **Default.** Janus-Pro-1B does _both_ generation and critique. |
| 2    | `sdturbo-webgpu` | ~1.5 GB extra | WebGPU, desktop | SD-Turbo paints at 512px; Janus still critiques.               |
| 3    | `remote`         | none          | user's own key  | Reserved for a later phase.                                    |

Selection rules:

- Probe the device, then offer the best supported tier — but **never auto-download**.
  A gigabyte on someone's mobile data is not a decision we get to make for them.
- The player's choice persists in `localStorage`; the model itself is cached by the
  browser's Cache API, so the download happens once.
- Any engine failure at runtime falls back to `mock` and the game continues. Losing
  image quality is acceptable; a dead-ended commission is not.

**Corollary:** nothing outside `src/lib/engines/**` may branch on which engine is
active, except the one component that displays it. If a game rule depends on the
engine, the abstraction has leaked.

**What persists across a reload and what doesn't, deliberately:** the engine choice
(`localStorage`) and the downloaded model weights (Cache API) persist, because losing
either means re-downloading a gigabyte. `GameState` used to be fully session-only by design. Spec 12
(`docs/tasks/12-progression-persistence.md`) narrowed that: `cash`, `reputation`,
lifetime commission count and `galleryHistory`, plus every progression unlock from specs
13-16, now persist to `localStorage` under `adt.save.v1` and survive a reload. The
in-flight commission — `phase`, the current client/artwork/critique, the draft prompt —
still does not persist; a reload always lands back on `idle`. The reasoning that made
session-only state the right call for a five-commission Level-1 loop does not extend to
permanent purchases, and losing a half-typed prompt on refresh is an acceptable, honest
trade against silently erasing $5,000 of banked upgrades.

### Why Janus does both jobs

Janus-Pro-1B is a _unified_ multimodal model — the same weights handle text-to-image
generation and image understanding, switched by the chat template. So one ~1 GB
download gives us both the painter and the critic.

On mobile that is decisive. Pairing SD-Turbo with Janus would mean two model stacks and
roughly 2.5 GB before a player sees anything. Janus alone generates at 384×384, which
is exactly the right size for Level 1's deliberately amateur aesthetic.

There is a happy accident here. Janus produces markedly better images from _thorough_
prompts, and the Level 1 modifier suffix is itself a long descriptive string. The
mechanic that caps the player's style also improves the model's output.

### Why the critic is a vision model, not a keyword matcher

The critic asks the model a narrow yes/no question per brief keyword — "Does this
picture clearly show a coffee cup?" — and scores from the hit rate. It is judging the
picture that was actually produced, not the text the player typed. That is what makes
the critic feel alive, and it is the whole reason a vision model is worth a gigabyte.

**We never ask the model for JSON.** A 1B model will not reliably emit valid JSON, and a
parse failure mid-commission is a far worse experience than a slightly coarse score.
Narrow questions with trivially parseable answers are robust; structured output is not.

### The model never decides money

An engine returns a `CritiqueDraft`: a title, an accuracy score, and prose. The domain
layer then computes `creativityScore` from the player's prompt and `finalPayout` from
the brief's budget. Economy rules live in exactly one place, so the mock and real
engines cannot drift apart on difficulty, and a hallucinating model cannot mint cash.

---

## 5. Mobile is a constraint, not a target to hit later

WebGPU on mobile is **not a baseline**. As of 2026 it is roughly 70–75% of mobile
browsers, and the failure modes are harsh:

| Reality                                                               | What we do about it                               |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| Chrome Android needs 121+, Android 12+, Qualcomm/ARM GPU              | Probe, never assume                               |
| iOS needs Safari 26 — an OS-level wall, no browser can work around it | Fall back to `mock`                               |
| Safari's Metal backend caps buffers at 256 MB on older iPhones        | Gate on `maxStorageBufferBindingSize`             |
| Exceeding VRAM crashes the tab rather than throwing                   | Refuse to load below a measured threshold         |
| Cold shader compilation takes 10–15 s                                 | A `compiling` progress state, not a frozen screen |
| Thermal throttling on sustained inference                             | Never queue concurrent generations                |

`maxStorageBufferBindingSize` is the most reliable signal the platform gives us. A
device reporting 128 MB cannot run these models, and attempting it produces an "Aw
Snap" crash with no catchable error — so the probe is a hard gate, not a hint.

This is why `mock` is a **production tier**, not a development convenience. A real
share of players will never load a model, and the game must be complete for them.

---

## 6. Request flow for one commission

1. Player clicks **Create Art**. UI moves to `generating`; the engine menu is disabled
   for the duration of steps 1–5 so the active engine cannot be unloaded mid-flight.
2. `buildLevel1Prompt()` appends the hidden modifiers to the player's raw text. The
   player never sees the result. `ArtEngine.generate()` receives **both** strings —
   `playerPrompt` (raw) and `prompt` (with modifiers) — as separate fields; it sends
   only `prompt` to the model and echoes `playerPrompt` back into the returned
   `Artwork` untouched. The two are never allowed to merge into one field anywhere in
   the pipeline, because the moment they do there is no way to recover the raw prompt
   for display, and the whole Level 1 joke depends on the player only ever seeing what
   they typed.
3. The engine generates. For WebGPU engines this happens in a Web Worker and the
   result comes back as a transferred `ImageBitmap` — inference on the main thread
   would freeze the UI for the entire generation and get the tab killed on mobile.
4. UI moves to `critiquing`. The engine is asked one yes/no question per brief keyword
   plus one request for prose.
5. The domain layer converts the hit rate into `accuracyScore`, derives
   `creativityScore` from the player's prompt, and computes `finalPayout`.
6. UI moves to `results`. **Collect Cash** applies the payout via a tweened counter,
   pushes a `GalleryEntry` (tagged with the brief's `id` as `briefId`, so a future
   `inviteClient()` call can exclude it correctly) into the portfolio strip, and
   returns to `idle` — or to `levelComplete` if both win conditions are met.

Any failure moves the UI to `failed` with a player-safe message and a retry. The
player never loses their typed prompt.

---

## 7. Directory ownership

| Path                                                                 | Contents                                   | Spec         |
| -------------------------------------------------------------------- | ------------------------------------------ | ------------ |
| `src/lib/types/**`                                                   | Frozen shared contract                     | Orchestrator |
| `src/lib/game/**`, `src/lib/data/**`                                 | Pure rules and the brief pool              | 01           |
| `src/lib/engines/**` (except model subdirs)                          | Interface, manager, capability probe, mock | 02           |
| `src/lib/components/**`, `static/avatars/**`                         | Presentational components                  | 03           |
| `src/lib/stores/**`, `src/routes/**` (except `+layout.ts`), `e2e/**` | State machine, screen, end-to-end          | 04           |
| `src/lib/engines/janus/**`                                           | Janus-Pro-1B worker engine                 | 05           |
| `src/lib/engines/sdturbo/**`                                         | SD-Turbo desktop engine                    | 06           |

---

## 8. Known wart

`@huggingface/transformers` pulls `onnxruntime-node` and `sharp` as dependencies, and
`npm audit` reports high-severity advisories against them. Neither ever reaches a
browser bundle — Vite resolves the browser entry point, which uses `onnxruntime-web`.
They are build-tree noise, not shipped code. Do not "fix" this by pinning or forcing an
audit resolution; check the bundle instead.

---

## 9. Deliberately deferred

Upgrades, staff, gallery customisation, complex client types and extra art mediums are
out of scope. Leave seams — `LEVEL_1` is a config object so a `LEVEL_2` can slot in
beside it, and `ArtEngine` already accommodates the `remote` tier — but implement none
of it.

`GameState.reputation` is tracked from Level 1 onward (the domain layer already
computes a `reputationGain` per commission) but is not surfaced in any UI and gates
nothing. It is there so Level 2 — where reputation is expected to unlock better
clients — has a running total to build on instead of a retrofit. Do not wire it into
any Level 1 UI or win condition.

---

## 10. Deployment: secure context requirements

WebGPU and the Cache API both require a
[secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) —
HTTPS in production, or `localhost` in development. Any static host serving over HTTPS
(GitHub Pages, Netlify, Vercel, Cloudflare Pages) satisfies this by default; nothing
extra is needed. `SharedArrayBuffer`-based threading is not used by either
`@huggingface/transformers` or `onnxruntime-web` in their default WebGPU/WASM-SIMD
configuration here, so **COOP/COEP headers are not required** for this project. If a
future change enables multi-threaded WASM (a different execution path in
`onnxruntime-web`), revisit this — that mode does need
`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
require-corp`, which static hosts typically need custom configuration to send.
