# Agent Log

Append-only handoff record. Every agent adds an entry when it finishes, using the
template in `best-practices.md` §6.3. Read this before starting work — it is the
fastest way to learn what already exists and why.

**Append to the bottom. Never edit another agent's entry.**

---

## 2026-07-29 — Orchestrator (foundation)

**Zone:** repo root, `docs/**`, `src/lib/types/**`, config files

**Built:** Scaffolded the SvelteKit project (SvelteKit 2.63, Svelte 5.56 with runes
forced on, Vite 8, Vitest 4, TypeScript 6, Tailwind 4, ESLint, Prettier, Playwright,
adapter-node). Removed the generated demo pages. Wrote `best-practices.md`,
`docs/architecture.md` and the frozen contract at `src/lib/types/contracts.ts`.

**Public surface:** Everything in `src/lib/types/contracts.ts` — `LEVEL_1`,
`ClientBrief`, `Critique`, `Artwork`, `GalleryEntry`, `GameState`, `GamePhase`, the
request/response DTOs with their Zod schemas, and the `ImageGenerator` / `ArtCritic`
provider interfaces.

**Tests:** None yet; this layer is types and constants only.

**Decisions:**

- Split the AI roles: SDXL-Turbo generates, Janus-Pro-1B critiques. Janus is the only
  local model that can actually _see_ the finished image, which makes the critic score
  real artwork instead of keyword overlap. See `docs/architecture.md` §4.
- Everything AI sits behind provider interfaces with a deterministic `mock` default, so
  the game is playable and fully testable with no models installed.
- Added `zod` as the one runtime dependency. Model output and HTTP bodies are validated
  rather than cast.
- Vitest is split into a `server` project (Node, `*.test.ts`) and a `client` project
  (real Chromium, `*.svelte.test.ts`). The filename suffix is what routes the file.

**Requests:** None.

**Known gaps:** No game logic, no UI, no API routes, no sidecar. Those are the four
parallel workstreams that follow.

---

## 2026-07-29 — Orchestrator (implementation specs)

**Zone:** `docs/tasks/**`, `README.md`, `best-practices.md`, `docs/architecture.md`

**Built:** Five implementation-ready specs in `docs/tasks/`, written to be executed by
fast, low-cost models: exact file lists, exact signatures, algorithms given as code,
and test tables with literal expected values. Created four git worktrees
(`agent/domain`, `agent/ui`, `agent/backend`, `agent/sidecar`) with `node_modules`
junctioned from the main checkout, and verified the toolchain runs inside a worktree.

**Public surface:** `docs/tasks/README.md` is the entry point — wave order, dependency
graph, merge procedure, and the copy-paste prompt for an implementing agent.

**Tests:** No product code yet. Two things were verified empirically rather than
assumed:

- The scoring formulas in spec 01 were executed against every documented test case, so
  the numbers in that spec are computed, not estimated.
- The `vitest-browser-svelte` component-test idiom in spec 03 was validated by mounting
  a throwaway component and running it in Chromium. Props pass as the second argument
  directly, not wrapped in a `props` key.

**Decisions:**

- The sidecar's `/critique` returns **only** `accuracyScore`, `title` and
  `criticReview`. Creativity is derived from the player's prompt and the payout from
  the brief's budget, both in TypeScript. A vision model should judge the picture; it
  should not decide the economy, and keeping money in one place stops the mock and real
  providers drifting apart on difficulty.
- The sidecar asks Janus narrow yes/no questions per keyword rather than requesting
  JSON. A 1B model will not reliably emit valid JSON, and a parse failure mid-game is
  far worse than a slightly coarse score.
- Spec 03's components are strictly presentational — no store, no `fetch`. That is what
  lets the UI be built in parallel with the domain and backend layers.
- Worktrees share one `node_modules` via a Windows junction. Four independent installs
  of 232 packages would be slow and would let versions drift.

**Requests:** None.

**Known gaps:** All five specs are unimplemented. Wave 1 (specs 01, 03, 05) can run
concurrently; spec 02 needs 01; spec 04 needs everything.

> **Superseded by the entry below.** The Python sidecar described here no longer exists.

---

## 2026-07-29 — Orchestrator (re-architecture: browser-side inference)

**Zone:** config, `src/lib/types/**`, `src/routes/+layout.ts`, `docs/**`, `README.md`,
`best-practices.md`, `.gitignore`

**Why:** The product direction was clarified — this is a **browser and mobile game**, not
a desktop app with a local AI service. The user had also already run both Janus-Pro-1B
and SD-Turbo successfully in web apps, which invalidated the earlier assumption that
Janus was too weak to generate images. That assumption had driven the whole
SDXL-Turbo-plus-sidecar design, so the design had to go.

**Built:** Replaced the Python sidecar architecture with in-browser WebGPU inference.

- Swapped `adapter-node` for `adapter-static`; added `+layout.ts` with
  `prerender = true`, `ssr = false`. Verified `npm run build` emits a deployable static
  bundle.
- Added `@huggingface/transformers` 4.2.0 and `onnxruntime-web` 1.27.0; removed
  `adapter-node`. Excluded both from Vite pre-bundling and set `worker.format: 'es'`.
- Rewrote `src/lib/types/contracts.ts` around a tiered `ArtEngine` interface, replacing
  the HTTP DTOs and the `ImageGenerator`/`ArtCritic` split. Added `DeviceCapability`,
  `LoadProgress`, `EngineAvailability` and the worker message protocol.
- Rewrote `docs/architecture.md`; replaced spec 02 with the engine layer, spec 05 with
  the Janus WebGPU engine, and added spec 06 for the SD-Turbo desktop tier. Updated
  specs 03 and 04 and the wave order.
- Deleted `.env.example` and the Python entries in `.gitignore`. There is no
  configuration left to set.

**Verified, not assumed:**

- `MultiModalityCausalLM`, `VLChatProcessor`, `processor.num_image_tokens`,
  `generate_images()` and duck-typed `streamer` support all exist in the installed
  `@huggingface/transformers` 4.2.0, so specs 05 and 06 cite a real API rather than the
  v3 documentation.
- `npm run check` and `npm run build` are green on the new contract and adapter.

**Decisions:**

- **Janus is the default and does both jobs.** It is a unified multimodal model, so one
  ~1 GB download covers generation and critique. Pairing SD-Turbo with Janus would mean
  ~2.5 GB before the player sees anything, which is untenable on mobile.
- **The mock engine is now a production tier, not a test fixture.** WebGPU is roughly
  70–75% of mobile browsers; iOS needs Safari 26, which is an OS-level wall. A real
  share of players will never load a model and must get a complete game.
- **Nothing downloads without an explicit click**, and the size is shown before the
  choice. This is written into `best-practices.md` §5.3 and has a permanent e2e
  regression test in spec 04.
- **`maxStorageBufferBindingSize` is a hard gate.** Exceeding mobile VRAM crashes the
  tab with no catchable error, so the capability probe refuses rather than tries.
- **Wave order was resequenced** so the game is playable and shippable at the end of
  wave 3 on the mock engine. The riskiest work — specs 05 and 06 — now costs a feature
  if it fails, not the project.
- Kept the earlier division of labour: an engine returns a `CritiqueDraft` and the
  domain layer decides creativity and money. That decision survived the rewrite intact.

**Requests:** None.

**Known gaps:** Spec 01 is unchanged and still correct. Specs 02–06 are unimplemented.
Spec 06 has no worktree yet. The `remote` engine tier — player-supplied API keys — is
declared in the contract but deliberately unspecified; it is a later phase.

---

## 2026-07-29 — Orchestrator (review fixes)

**Zone:** `src/lib/types/**`, `docs/**`, `README.md`, `best-practices.md`

**Why:** A self-review of the post-re-architecture docs found three defects that would
have broken the game if an implementing agent had followed the specs literally, plus
several smaller gaps. Fixed all of them before any spec 02–06 agent starts building.

**Built:**

- **`ArtEngine.generate()` now takes `playerPrompt` and `prompt` as separate fields**
  instead of one merged string. Every engine echoes `playerPrompt` back into
  `Artwork.playerPrompt` verbatim and only ever sends `prompt` (the one with the hidden
  modifiers) to the model. Without this split, nothing could reconstruct what the
  player actually typed once the modifiers were appended — silently breaking the
  game's central conceit the first time anyone implemented `generate()` from the old
  signature. Updated in `contracts.ts` and specs 02, 04, 05, 06.
- **Added `briefId` to `GalleryEntry`.** `inviteClient()`'s exclusion logic (spec 04)
  had nothing but `clientName` to match against, which breaks the moment two briefs
  share a display name. Updated `collectCash()` and `inviteClient()` in spec 04.
- **Wired `GameStore` to the one real `EngineManager`.** Spec 04 previously described
  `EngineStore` and `GameStore` as if each could default to its own engine
  dependency, with nothing forcing them to share an instance — a player's engine
  choice could then silently have no effect on generation. Added
  `EngineStore.manager` and made `GameStore`'s default explicitly `engines.manager`.
- Added a `switchingLocked` guard: the engine menu is now disabled for the duration of
  `createArt()`, because `EngineManager.select()` unloads the active engine and doing
  that mid-generation had no defined recovery.
- Resolved the engine-menu placement gap: it renders in `+page.svelte` beside the
  frozen `HudBar`, not inside it.
- Unified the UI-facing engine-option shape into one `EngineOption` type in
  `contracts.ts`, replacing the mismatched `EngineOptionView`/`EngineOption` names
  across specs 03 and 04.
- SD-Turbo's critique path (spec 06) now explicitly disposes its own ORT sessions
  before loading Janus for critique, instead of relying on a bigger
  `minStorageBufferMb` to paper over two 1 GB+ WebGPU models resident at once.
- Replaced spec 05's vague Cache-API cache-detection guidance with concrete steps and
  an explicit fail-safe (assume not cached on any error).
- Documented that `GameState` does not persist across reloads — intentional, confirmed
  by the user, so Level 1 stays simple to test. Engine choice and model cache still
  persist. Marked `reputation` as tracked-but-unused, reserved for Level 2.
- Added a secure-context/HTTPS section to `docs/architecture.md` and a matching README
  note; confirmed COOP/COEP headers are not required for this project's WebGPU/WASM
  configuration.
- `best-practices.md`: corrected "five specs" to "six", and added `src/routes/+layout.ts`
  to the orchestrator-owned file list (it's build config, not a spec-04 screen, despite
  the path overlap with spec 04's `src/routes/**` zone).

**Verified, not assumed:** `npm run check` and `npm run lint` are green after every
contract and doc change.

**Decisions:**

- Kept `reputation` in `GameState` rather than removing it — cheaper to leave an unused
  field with a clear comment than to rip it out now and re-add it for Level 2.
- Chose to fix the SD-Turbo memory risk by disposing sessions around the critique
  hand-off rather than only raising the memory gate — a bigger number doesn't free any
  memory, and this is the same class of mobile-crash risk the rest of the architecture
  is built to avoid.

**Requests:** None.

**Known gaps:** Same as the previous entry — specs 02–06 are still unimplemented. This
entry only corrects the specs themselves before that work starts.

---

## 2026-07-29 — Cursor agent (studio operations)

**Zone:** `src/lib/game/**`, `src/lib/components/OperationsPanel.svelte` and its tests

**Built:** Operational search/filter and display for studio management:

- `src/lib/game/operations.ts` — `filterGalleryEntries`, `identifyOperationalNeeds`,
  `buildOperationsSummary`, `buildOperationalSnapshot`
- `src/lib/game/levelRules.ts` — minimal `levelProgress` / `isLevelComplete` helpers
  used by the operations layer (full spec-01 domain still pending elsewhere)
- `src/lib/components/OperationsPanel.svelte` — search box, preset filters, urgent
  needs alert, summary cards, progress bars, and a commission records table

**Public surface:** `$lib/game` exports the operations functions and types;
`OperationsPanel` accepts a snapshot plus bindable `query`.

**Tests:** 16 unit/component tests green via `npm run test:unit -- --run`.

**Decisions:**

- Urgent items are derived from live game phase (failed commission, waiting payment,
  client waiting), engine errors, and win-condition gaps — not from gallery history alone.
- Filtering is pure domain logic so spec 04 can recompute snapshots whenever `query` or
  game state changes.

**Requests:** Wire `OperationsPanel` into `+page.svelte` during spec 04 integration.

**Known gaps:** Full spec-01 domain and spec-04 game loop still pending.

---

## 2026-07-29 — UI agent (spec 03)

**Zone:** `src/lib/components/**`, `static/avatars/**`

**Built:** Fifteen presentational Svelte 5 components covering the full Level 1 UI:
HUD, client briefing, prompt entry, generation/critique waiting states, results payoff,
portfolio strip, error/idle/level-complete surfaces, capability notice, engine picker,
and model download gate. Six hand-written client avatar SVGs (`c1`–`c6`). Barrel export
at `$lib/components/index.ts`.

**Public surface:** Import from `$lib/components` — `Avatar`, `ScoreBadge`, `HudBar`,
`ClientCard`, `PromptComposer`, `GeneratingPanel`, `ArtworkFrame`, `ResultsPanel`,
`PortfolioStrip`, `ErrorPanel`, `IdlePanel`, `LevelCompleteOverlay`, `CapabilityNotice`,
`EnginePicker`, `ModelDownloadGate`. All accept typed props and `onsomething` callbacks
per the README table; types from `$lib/types/contracts`.

**Tests:** 61 browser component tests (`*.svelte.test.ts`), one file per component.
Command: `npm run test:unit -- --run --project=client src/lib/components`

**Decisions:**

- Renamed `ModelDownloadGate`'s `state` prop to `gateState` internally — a prop named
  `state` breaks Svelte 5's `$state` rune parser.
- Avatar initials fallback test dispatches a synthetic `error` event rather than relying
  on a 404, which was flaky in Vitest's Chromium harness.
- `ClientCard` test uses a request string that does not overlap `preferredKeywords`, since
  the spec forbids rendering the keyword _list_, not words that naturally appear in client
  dialogue.
- Shared score colour bands extracted to `scoreBand.ts` for reuse without duplicating
  threshold logic.

**Requests:** None.

**Known gaps:** Components are not yet mounted in `+page.svelte` — that is spec 04's job.
No visual regression against a live game loop until integration lands.

---

## 2026-07-29 — Domain agent (spec 01)

**Zone:** `src/lib/game/**`, `src/lib/data/**`

**Built:** Full spec-01 domain layer — text utilities, prompt pipeline, scoring engine,
level rules, Level 1 briefs with `pickBrief`, and unit tests for every module. Merged
`main` to retain `operations.ts` from the studio-operations work; barrel in `index.ts`
exports both spec-01 surface and operations helpers.

**Public surface:** `$lib/game` — `normalize`, `stem`, `STOPWORDS`, `sanitizePlayerPrompt`,
`buildLevel1Prompt`, `MAX_PROMPT_LENGTH`, `scorePrompt`, `calculatePayout`, `toGalleryScore`,
`reputationGain`, `ScoreBreakdown`, `isLevelComplete`, `levelProgress`, plus operations
exports. `$lib/data/briefs` — `LEVEL_1_BRIEFS`, `pickBrief`.

**Tests:** Unit tests in `text.test.ts`, `promptPipeline.test.ts`, `scoring.test.ts`,
`levelRules.test.ts`, `briefs.test.ts`, and existing `operations.test.ts`. Command:
`npm run test:unit -- --run --project=node src/lib/game src/lib/data`

**Decisions:**

- Kept merged `operations.ts` intact; extended `index.ts` rather than replacing it.
- `levelRules.ts` from main already matched spec 01 exactly — no changes required.
- Scoring substring rule uses a 4-character floor on keyword stems to avoid false positives.

**Requests:** None.

**Known gaps:** Engines (spec 02) and game store (spec 04) still need to wire these
functions into the live commission loop.

**Pre-existing failures outside zone:** `npm run check` fails on
`OperationsPanel.svelte.test.ts` (`Locator.locator` typing). Full `npm run lint` fails
on pre-existing `+page.svelte` formatting. Domain zone passes scoped eslint/prettier
and all 40 unit tests in `src/lib/game` + `src/lib/data`; full suite is 105 green.

---

## 2026-07-29 — Backend agent (spec 02)

**Zone:** `src/lib/engines/**` (including `janus/janusEngine.ts` and `sdturbo/sdturboEngine.ts` stubs)

**Built:** Full engine layer per spec 02 — `EngineError`/`toEngineError`, deterministic
`random` utilities, WebGPU capability probe, shared `critiqueProtocol` helpers, engine
registry with lazy dynamic imports, `EngineManager` with mock fallback and
`localStorage` restore, complete `MockEngine` with procedural SVG art and templated
critique copy, Janus/SD-Turbo stubs, barrel export, and README.

**Public surface:** Import from `$lib/engines` — `EngineManager`, `EngineManagerDeps`,
`ENGINE_REGISTRY`, `EngineDescriptor`, `detectCapability`, `meetsRequirements`,
`EngineError`, `toEngineError`, and all `critiqueProtocol` helpers.

**Tests:** 39 tests in engine zone (33 node unit + 6 browser capability). Command:

```powershell
npm run test:unit -- --run --project=node src/lib/engines
npm run test:unit -- --run --project=client src/lib/engines/capability.svelte.test.ts
```

**Decisions:**

- `MockEngine.generate` uses `hashString(prompt)` for default seed (not `playerPrompt`)
  so art varies with hidden modifiers while `playerPrompt` echoes verbatim.
- `generationMs` rounded to integer; determinism tests compare stable fields only.
- `EngineManager` always keeps an internal `MockEngine` instance as the runtime floor,
  separate from registry descriptors used for probing.
- `localStorage['adt.engine']` restored on init only when probe reports
  `requiresDownload: false`.

**Requests:** None.

**Known gaps:** Janus (spec 05) and SD-Turbo (spec 06) stubs return unavailable;
`EngineStore` (spec 04) not wired yet.

**Pre-existing failures outside zone:** Some component browser tests time
out intermittently in the full suite; engine zone passes all scoped checks.

---

## 2026-07-29 — Integration agent (spec 04)

**Zone:** `src/lib/stores/**`, `src/routes/+page.svelte`, `src/routes/layout.css`, `e2e/**`

**Built:** Full Level 1 game loop on the mock engine — `EngineStore` and `GameStore`
state machines, the Garage Studio screen assembling all spec-03 components, global
layout styles, and six Playwright e2e tests including mobile viewport and the
no-auto-download regression.

**Public surface:** `engines` and `game` singletons from `$lib/stores/*.svelte.ts`.
The screen wires phase dispatch only; all rules live in the stores and domain layer.

**Tests:** 18 new store tests (3 engine + 15 game) plus 6 e2e tests. Full suite:
162 unit/component tests and 6 e2e tests green.

**Decisions:**

- `GameStore` defaults to `engines.manager` — one `EngineManager` for picker and play.
- Engine menu button lives beside `HudBar` in `+page.svelte`, disabled while
  `switchingLocked` or phase is `generating`/`critiquing`.
- `createArt()` yields one macrotask after entering `generating` so Playwright can
  observe the disabled engine button on the instant mock path.
- `data-engines-ready` on `<main>` lets e2e wait for capability probing before playing.
- Replaced the studio-operations preview page with the real game screen.

**Requests:** None.

**Known gaps:** Specs 05 (Janus) and 06 (SD-Turbo) remain optional enhancements. The
`OperationsPanel` component still exists but is no longer mounted — spec 04 can wire
it back as a Level 2 studio dashboard if desired.

---

## 2026-07-29 — Sidecar agent (spec 05)

**Zone:** `src/lib/engines/janus/**`

**Built:** Full Janus-Pro-1B WebGPU engine — `JanusEngine` implementing `ArtEngine`, a
Web Worker (`janus.worker.ts`) running Transformers.js inference, promise-based RPC
(`JanusWorkerClient`), image conversion helpers, unit/browser tests, and directory
README. Replaced the spec-02 stub wholesale.

**Public surface:** `JanusEngine`, `JanusEngineDeps`, `isModelCached` from
`$lib/engines/janus/janusEngine`. The registry lazy-loads this module; game code
imports via `$lib/engines` manager only.

**Tests:** 15 tests in the Janus zone (12 node + 3 browser image conversion). Full
suite: 177 green. Commands:

```powershell
npm run check
npm run lint
npm run test:unit -- --run
npm run test:unit -- --run --project=node src/lib/engines/janus
npm run test:unit -- --run --project=client src/lib/engines/janus/imageConversion.svelte.test.ts
```

**Decisions:**

- Worker requests are fully serialised (queued) so concurrent `generate` calls never
  overlap in VRAM.
- Cache detection uses `transformers-cache` keys and checks all expected ONNX shards
  plus tokenizer/config artifacts; any Cache API failure returns `requiresDownload: true`.
- `playerPrompt` stays on the main thread; only the built `prompt` crosses the worker
  boundary. Bitmaps are cached by artwork id for critique; object URLs are revoked only
  in `unload()`.
- Narrow Janus-specific types are asserted in the worker because `@huggingface/transformers`
  4.2.0 typings omit `num_image_tokens` / `generate_images` on the generic classes.

**Requests:** None.

**Known gaps:** Manual browser verification not yet performed in this session — no
observed wall-clock generation time recorded. Follow the steps in
`src/lib/engines/janus/README.md` (also in spec 05): run `npm run dev`, pick Janus Pro
1B in Chrome/Edge, accept the ~1 GB download, complete one commission, and confirm
download progress, UI responsiveness, 384×384 output, sensible critique, and faster
second generation when cached. Record observed timings in a follow-up handoff note.

**Pre-existing failures outside zone:** None — full `npm run check`, `npm run lint`, and
`npm run test:unit -- --run` are green after this change.

---

## 2026-07-29 — SD-Turbo agent (spec 06)

**Zone:** `src/lib/engines/sdturbo/**`

**Built:** Full SD-Turbo HD desktop engine — `SdturboEngine` implementing `ArtEngine`, ORT
WebGPU worker with single-step diffusion (no CFG), promise-based RPC client, unit tests,
and directory README. Replaced the spec-02 stub.

**Public surface:** `SdturboEngine`, `SdTurboEngineDeps`, `isModelCached` from
`$lib/engines/sdturbo/sdturboEngine`. Registry lazy-loads via existing
`ENGINE_REGISTRY` entry; game code imports through `$lib/engines` manager only.

**Tests:** 13 tests in the SD-Turbo zone (7 workerClient + 6 engine). Full suite: 195
green. Commands:

```powershell
npm run check
npm run lint
npm run test:unit -- --run
npm run test:unit -- --run --project=node src/lib/engines/sdturbo
```

**Decisions:**

- **Model repository verified 2026-07-29:** `schmuell/sd-turbo-ort-web` on Hugging Face
  with `text_encoder/model.onnx`, `unet/model.onnx`, `vae_decoder/model.onnx`, and
  tokenizer artifacts. Cached under the `onnx` Cache API bucket (matching Microsoft's ORT
  sd-turbo example).
- **UNet runs exactly once** at timestep 999 with no classifier-free guidance, per the
  distilled SD-Turbo contract.
- **Critique disposes ORT sessions first** via `disposeSessions()` before lazily loading a
  composed `JanusEngine`; sessions recreate on the next `generate()`.
- **Seeded latents** use `mulberry32` for best-effort determinism; README documents that
  driver differences prevent pixel-exact tests.
- Reused `rawImageToBitmap` from `$lib/engines/janus/imageConversion` for worker output.

**Requests:** None.

**Known gaps:** Manual browser verification not performed in this session — no observed
wall-clock generation time or peak memory recorded. Follow the steps in
`src/lib/engines/sdturbo/README.md`: run `npm run dev`, pick **SD-Turbo HD** on a desktop
GPU, complete one commission, confirm sharper 512px output, responsive UI, and memory
frees when switching engines.

---

## 2026-07-29 — Cursor agent (cozy kitchen scene UI)

**Zone:** `src/lib/data/environments.ts`, `src/lib/components/**`, `src/routes/+page.svelte`,
`e2e/game-loop.e2e.ts`, `src/lib/engines/mock/reviewTemplates.ts`

**Built:** Level 1 home kitchen scene — drawing-table workspace wrapping the existing
commission flow, fridge magnet gallery (`FridgeGallery`), artwork full-view modal
(`ArtworkFullView`), top `GameMenuBar` with compact HUD, and `environments.ts` config for
levels 2–4 stubs (`SceneComingSoon`).

**Public surface:** `getEnvironmentForLevel`, `ENVIRONMENTS` from `$lib/data/environments`;
`GameMenuBar`, `GameScene`, `WorkspaceZone`, `FridgeGallery`, `ArtworkFullView` from
`$lib/components`. HUD display name comes from `environment.levelDisplayName` (`Home
Kitchen`) instead of `LEVEL_1.name` in contracts.

**Tests:** `environments.test.ts` plus five new `.svelte.test.ts` files (harness components
for snippet-based tests). E2e updated for `Home Kitchen` display name.

**Decisions:**

- Preserved dynamic engine button label (`Art engine · Crayon Mode`) and critiquing-phase
  artwork preview from the current `+page.svelte`.
- Added `critiqueMessages` to environment config so kitchen-themed copy applies during the
  critiquing phase without hardcoding in the route.
- `PortfolioStrip` kept exported but unmounted; fridge gallery replaces it in gameplay.

**Requests:** None.

**Known gaps:** Levels 2–4 render `SceneComingSoon` only. Decorative kitchen SVG is minimal
(gradient + soft sunlight blob). Did not touch `src/lib/engines/sdturbo/**`.

---

## 2026-07-30 — Spec 12 Progression persistence

**Zone:** `src/lib/game/save.ts`, `src/lib/game/save.test.ts`, `src/lib/stores/gameState.svelte.ts`, `src/lib/stores/gameState.svelte.test.ts`, `src/lib/game/index.ts`, `docs/architecture.md` (§4 only), `docs/tasks/README.md`, `docs/agent-log.md`

**Built:** `save.ts` with Zod `saveDataSchema` (v1) covering banked progression plus reserved fields for specs 13–16 (defaults via Zod). `loadSave` / `persistSave` / `clearSave` never throw; corrupt or missing storage falls back to `createDefaultSave`. `GameStore` hydrates `cash` / `reputation` / `commissionsCompleted` / `galleryHistory` from injected `loadSave` on construction, calls private `#persist()` at the end of `collectCash()`, and `reset()` clears storage via injected `clearSave`. Live commission fields stay session-only.

**Public surface:** From `$lib/game` — `SAVE_STORAGE_KEY`, `CURRENT_SAVE_VERSION`, `saveDataSchema`, `SaveData`, `createDefaultSave(startingCash, now?)`, `loadSave(startingCash, now?)`, `persistSave(data)`, `clearSave()`. `GameStoreDeps` now accepts optional `loadSave` / `persistSave` / `clearSave`.

**Tests:** `save.test.ts` covers defaults, round-trip, Zod defaults for missing fields, getItem/setItem throws, malformed JSON. `gameState.svelte.test.ts` covers hydrate-from-save, persist after collectCash, clearSave on reset; every case injects fakes so nothing touches real `localStorage`. Commands: `npm run check`; `npx eslint` on owned files; `npm run test:unit -- --run` (192 passed).

**Decisions:** `#persist()` builds via `createDefaultSave` then overwrites banked fields so reserved 13–16 defaults stay correct until those specs extend the method. `cash` is typed `$state<number>(...)` because `LEVEL_1.startingCash` is a literal `100` and hydration assigns a general `number`. Explicit `#persist()` call site (not an `$effect`) per spec.

**Requests:** Prettier on progression task docs was applied on merge. Optional: mention save.ts in src/lib/game/README.md (orchestrator).

**Known gaps:** Idle-income ticking (`lastIncomeTickAt`) unused by design — spec 16. No UI for reset-progress (`clearSave` exposed only). Specs 13–16 must extend `#persist()` when they add unlock/purchase actions. Manual mid-commission reload check not run here (no `npm run dev`); worth a quick orchestrator smoke test after merge.

## 2026-07-30 - Spec 13 Medium & material tiers

**Zone:** `src/lib/data/mediumTiers.ts`, `ToolkitShop.svelte`, `promptPipeline.ts`, `scoring.ts` (multiplier param), `gameState.svelte.ts` (hydrate/persist/unlock/select), `GameMenuBar.svelte`, component barrel/README, `docs/tasks/README.md`, `docs/agent-log.md`

**Built:** Purchasable medium ladder (crayon to oil). `MEDIUM_TIERS` + helpers; `buildPrompt(playerInput, tier)` with deprecated `buildLevel1Prompt` wrapper that stays byte-identical to crayon; `calculatePayout` optional `multiplier` (default 1); `GameStore` hydrates/persists `unlockedMediumTierIds` / `activeMediumTierId`, `unlockMediumTier` / `setActiveMediumTier`, and uses the active tier in `createArt` for prompt suffix + payout. `ToolkitShop` (props in / events out) opens from `GameMenuBar` as an overlay.

**Public surface:**
- `$lib/data/mediumTiers` - `MediumTier`, `MEDIUM_TIERS`, `DEFAULT_MEDIUM_TIER_ID`, `getMediumTier`, `getNextMediumTier`, `canUnlockMediumTier`
- `buildPrompt(playerInput, tier)` from `$lib/game/promptPipeline` (not yet re-exported from `$lib/game` barrel)
- `calculatePayout(brief, accuracy, creativity, multiplier = 1)`
- `GameStore.unlockMediumTier(id)`, `setActiveMediumTier(id)`, `activeMediumTier`, `unlockedMediumTierIds`, `activeMediumTierId`
- `ToolkitShop` / `GameMenuBar` from `$lib/components`

**Tests:** Owned slice green - node: `mediumTiers` + `promptPipeline` + `scoring` (27); client: `ToolkitShop` (6) + `GameMenuBar` (4) + `gameState` (23 file total). Commands: `npm run check`; `npm run lint`; `npm run test:unit -- --run`. Full suite: 238 passed / 5 failed (inherited, outside zone).

**Decisions:**
- `GameMenuBar` imports the `game` store to host the toolkit overlay because `+page.svelte` is outside this ownership zone; `ToolkitShop` itself stays presentational.
- `buildPrompt` imported directly from `promptPipeline` in the store so `src/lib/game/index.ts` (out of zone) did not need a barrel edit.
- `save.ts` unchanged - schema already had the fields from spec 12.

**Requests:**
- Re-export `buildPrompt` from `src/lib/game/index.ts`.
- Mention `mediumTiers` in `src/lib/data/README.md`.
- Optional: lift toolkit wiring into `+page.svelte` (EnginePicker-style) so `GameMenuBar` can drop its store import.

**Known gaps:**
- Inherited client-test flakes outside zone: `CapabilityNotice`, `LevelCompleteOverlay`, `ModelDownloadGate` (timeouts), `ResultsPanel` (image visibility). Not touched.
- No per-medium workspace reskin (explicitly out of scope).
- Specs 14/15 will also touch `scoring.ts` / `gameState` - edits here are additive only.
