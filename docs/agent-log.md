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

---

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

---

## 2026-07-30 — Spec 14 Gallery real estate & presentation

**Zone:** `src/lib/data/galleryVenues.ts`, `galleryLayouts.ts`, `galleryAtmosphere.ts` (+ tests), `src/lib/components/GalleryUpgradeShop.svelte` (+ test), edits to `scoring.ts`, `gameState.svelte.ts`, `FridgeGallery.svelte`, `GameMenuBar.svelte`, `components/index.ts`, `components/README.md`, `docs/tasks/README.md`, `docs/agent-log.md`

**Built:** Three purchasable gallery systems — Venue (linear capacity), Layout (switchable curation multiplier + CSS class), Atmosphere (stacking payout bonuses). `GameStore` exposes `presentationMultiplier` (medium × layout × (1 + atmosphere)), `displayedGalleryEntries` (capacity-capped; `galleryHistory` uncapped), and unlock/buy/select methods that persist via `#persist()`. `calculatePayout` gained optional `multiplier = 1` (spec 13 signature). `GalleryUpgradeShop` is a three-tab presentational overlay; `GameMenuBar` shows an optional "Gallery Upgrades" button; `FridgeGallery` accepts optional `layoutClassName` with layout CSS.

**Public surface:**

- `$lib/data/galleryVenues` — `GALLERY_VENUES`, `DEFAULT_VENUE_ID`, `getVenue`, `canUnlockVenue`
- `$lib/data/galleryLayouts` — `GALLERY_LAYOUTS`, `DEFAULT_LAYOUT_ID`, `getLayout`, `canUnlockLayout`
- `$lib/data/galleryAtmosphere` — `ATMOSPHERE_ITEMS`, `getAtmosphereItem`, `totalAtmosphereBonus`
- `$lib/components` — `GalleryUpgradeShop`; `FridgeGallery.layoutClassName?`; `GameMenuBar.onopengalleryupgrades?`
- `GameStore` — `unlockedVenueId`, `unlockedLayoutIds`, `activeLayoutId`, `ownedAtmosphereIds`, `venue`, `displayedGalleryEntries`, `presentationMultiplier`, `activeMediumTier` (stub), `unlockVenue`, `unlockLayout`, `setActiveLayout`, `buyAtmosphereItem`

**Tests:** Data unit tests + scoring multiplier cases + GameStore unlock/display/persist/payout cases + component tests for shop tabs, FridgeGallery layout prop, GameMenuBar button. Commands: `npm run check`; `npm run lint`; `npm run test:unit -- --run` (262 passed).

**Decisions:**

- Spec 13 is **not** in this worktree. Stubbed `activeMediumTier.payoutMultiplier` at `1` via `MEDIUM_TIER_STUB` so `presentationMultiplier` still composes correctly. Merge **either order** works: if 13 lands first it owns the real `activeMediumTier`; if 14 lands first, 13 should replace the stub and keep multiplying into `presentationMultiplier` (not pass medium alone to `calculatePayout`).
- `onopengalleryupgrades` is optional so `+page.svelte` keeps typechecking without a page edit (outside ownership).
- Venue unlock is strictly next-tier-only; layouts are free to switch once owned; atmosphere has no active slot.

**Requests:** Page/scene wiring and medium×presentation merge completed by orchestrator on main.

**Known gaps:** Page/scene not wired (ownership). No per-venue visual re-skins. Manual drag-and-drop curation deferred. Spec 13 medium factor still stubbed at 1 until that branch merges.

---

## 2026-07-30 — Spec 15 Client prestige & demographics

**Zone:** `src/lib/types/contracts.ts` (additive), `src/lib/data/clientTiers*`, corporate/billionaire/auction brief pools, `src/lib/data/briefs*`, `src/lib/game/auction*`, `src/lib/game/paletteSeries*`, `src/lib/game/save.ts` (`seriesOnBrandFlags`), `src/lib/stores/gameState*`, `ClientTierBadge` / `AuctionResultPanel`, components barrel + README, `docs/tasks/README.md`, `docs/agent-log.md`

**Built:** Reputation-gated client tiers (walk-in / corporate / billionaire / auction-house). Corporate series play in order 1→2→3 with palette on-brand checks and a 300 completion bonus. Auction-house payouts use `resolveAuction` (uncapped by budget). `GameStore` branches invite/payout, persists `seriesOnBrandFlags`, and exposes `currentAuctionResult` for the results UI.

**Public surface:**

- `CLIENT_TIERS`, `ClientTier`; `clientBriefSchema` fields `tier` (default `walk-in`), `seriesId`, `seriesPosition`, `paletteConstraint`
- `$lib/data/clientTiers` — `CLIENT_TIER_INFO`, `getClientTierInfo`, `unlockedClientTiers`
- `CORPORATE_BRIEFS`, `BILLIONAIRE_BRIEFS`, `AUCTION_BRIEFS`
- `pickBrief({ excludeIds?, unlockedTiers?, completedSeriesIds?, random? })`
- `resolveAuction(qualityScore, reservePrice, random?)` → `AuctionResult`
- `checkPaletteUsage`, `seriesCompletionBonus`, `fullyCompletedSeriesIds`
- `ClientTierBadge`, `AuctionResultPanel`; `GameStore.currentAuctionResult`, `seriesOnBrandFlags`
- Save: `seriesOnBrandFlags: Record<string, boolean[]>` (Zod default `{}`)

**Tests:** Unit coverage for tiers, auction worked examples, palette series, pickBrief gating/order, GameStore invite/payout/bonus paths; component tests for both new panels + ClientCard still green. Commands: `npm run check`; `npm run lint`; `npm run test:unit -- --run` (node 132 + client 117).

**Decisions:**

- `ClientBrief` is `z.input<typeof clientBriefSchema>` so existing literals omitting `tier` still type-check; runtime parse still defaults `tier` to `walk-in`.
- Exported `keywordMatches` from `scoring.ts` (one-line) so palette checks reuse the exact brief-keyword matcher.
- Reused existing `/avatars/c1.svg`…`c6.svg` paths for prestige clients (no new avatar assets).
- `calculatePayout` has no multiplier param on this branch — non-auction call sites unchanged.
- Wired `ClientTierBadge` into `ClientCard` and `AuctionResultPanel` into `+page.svelte` results (small UI edits outside the listed ownership paths, required for DoD §8).

**Requests:** None.

**Known gaps / merge notes:** Expect conflicts with specs 13/14 on `gameState.svelte.ts` (`inviteClient`, `createArt` payout branch, `#persist`, `GameStoreDeps`) and possibly `calculatePayout` if they add a multiplier — pass any medium/venue multiplier through on non-auction paths when merging. Also touched `ClientCard.svelte`, `+page.svelte`, `scoring.ts` (export), and `save.test.ts` outside the strict ownership list for wiring/additivity.

## 2026-07-30 — Spec 16 Studio automation & staffing

**Zone:** `src/lib/data/staffRoles*`, `src/lib/game/idleIncome*`, `src/lib/components/StaffOffice*`, `IdleEarningsModal*`, edits to `save*`, `gameState*`, `FridgeGallery`, `GameMenuBar*`, `components/index.ts`, `components/README.md`, `+page.svelte`, `docs/tasks/README.md`, `docs/agent-log.md`

**Built:** Four hireable staff/automation roles with offline-safe idle cash accrual (`computeIdleEarnings` + `MAX_IDLE_MS`), Marketing Director auto-invite while idle, and Curator-aware gallery ordering / `effectiveLayoutId` for presentation. `GameStore.hireStaff` / `startIncomeTicker` / `idleEarningsToShow`; `StaffOffice` shop + `IdleEarningsModal` on page load; `loadSave` stamps `lastIncomeTickAt` when null.

**Public surface:**

- `$lib/data/staffRoles` — `STAFF_ROLES`, `getStaffRole`, `canHireStaff`, `totalIncomePerSecond`
- `$lib/game/idleIncome` — `MAX_IDLE_MS`, `BASE_AUTO_INVITE_DELAY_MS`, `computeIdleEarnings`
- `$lib/components` — `StaffOffice`, `IdleEarningsModal`
- `GameStore` — `hiredStaffIds`, `lastIncomeTickAt`, `idleEarningsToShow`, `incomePerSecond`, `effectiveLayoutId`, `hireStaff`, `startIncomeTicker`, `dismissIdleEarnings`; curator-aware `displayedGalleryEntries` / `presentationMultiplier`
- Save: confirmed `hiredStaffIds` + `lastIncomeTickAt`; null tick → `now()` on load

**Tests:** staffRoles + idleIncome unit; GameStore hire/catch-up/auto-invite/curator; StaffOffice / IdleEarningsModal / GameMenuBar component tests. Commands: `npm run check` (0 errors); `npx eslint .` green; node project `183` passed; owned client tests `19` passed (`StaffOffice`, `IdleEarningsModal`, `GameMenuBar`, `FridgeGallery`). Full `npm run test:unit -- --run` previously green at `348` passed / `57` files; a later full client run showed timeout flakes across many files (including outside zone: `ModelDownloadGate`, `ResultsPanel`, `PromptComposer`, `GalleryUpgradeShop`) — inherited Chromium flake pattern, not Spec 16 regressions. `npm run lint` (prettier) fails only on inherited `src/lib/data/README.md`.

**Decisions:**

- `FridgeGallery` no longer re-sorts by `completedAt` — preserves store order so Curator score-ordering reaches the wall.
- `effectiveLayoutId` feeds both `presentationMultiplier` and page `galleryLayoutClassName` without mutating `activeLayoutId`.
- Income ticker started via `onMount` (cleanup returned from `startIncomeTicker`); auto-invite uses max speed multiplier, not sum.
- `idleEarningsToShow` stays `null` when catch-up earns 0 (modal truthiness gate).

**Requests:**

- Format / update `src/lib/data/README.md` to mention `staffRoles` (out of ownership zone; Prettier currently fails on it).
- Optional: re-export `computeIdleEarnings` / `BASE_AUTO_INVITE_DELAY_MS` from `src/lib/game/index.ts`.

**Known gaps:**

- No firing/salaries/sprites (explicitly out of scope).
- Inherited Prettier failure: `src/lib/data/README.md` only.
- Inherited intermittent client-test timeouts under full-suite load (same class noted by specs 13–15).

## 2026-07-31 — Spec 07 JanusLink My PC remote engine

**Zone:** `src/lib/engines/remote/**`, `src/lib/components/MyPcSetup*`, edits to registry/manager/engineStore/EnginePicker/`+page.svelte`/READMEs/`docs/tasks/07-api-engine.md`/`docs/architecture.md` (remote tier row) / `contracts.ts` comment only

**Built:** Rewrote spec 07 away from ComfyUI to JanusLink ([ADTLocalServe](https://github.com/MichaelTJ/ADTLocalServe)). Registered `remote` as **My PC** — static-game browser client talks to the player's Tailscale `phone-app` with Bearer auth (no `+server.ts`; cookies are SameSite=lax and unusable cross-origin). Setup dialog, store wiring (`testRemoteConnection` / `connectRemote`), picker `onconfigure`.

**Public surface:**

- `$lib/engines/remote/remoteEngine` — `RemoteEngine` (`ArtEngine`, id `remote`)
- `$lib/engines/remote/remoteConfig` — `loadRemoteConfig` / `saveRemoteConfig` / `clearRemoteConfig`
- `$lib/engines/remote/janusLinkClient` — `createJanusLinkClient`
- `$lib/components` — `MyPcSetup`; `EnginePicker` gains optional `onconfigure`

**Tests:** remoteConfig / janusLinkClient / remoteEngine (node); MyPcSetup / EnginePicker (client). Commands: `npm run check` (0 errors); node remote+manager+engineStore green; client MyPcSetup+EnginePicker green.

**Decisions:**

- Bearer API key only (not cookie pairing) so adapter-static stays intact.
- Did not copy ADTLocalServe `game-integration/` drop-in (it assumes a Node game server + loopback `pair/start`).
- Tier 1 alongside in-browser Janus; probe health-checks the configured host.

**Requests:** None.

**Known gaps:**

- Manual E2E against a live JanusLink install not run in this session (needs GPU PC + Tailscale + `JANUS_ALLOWED_ORIGINS`).
- Specs 08–11 still stubs for other providers.

## 2026-07-31 — Spec 17 Phaser studio floor

**Zone:** `src/lib/studio/**`, `StudioFloor` / `StudioHudOverlay`, `static/studio/**`, edits to `gameState` (`setAutoInviteAction`), `GameScene`, `+page`, e2e, `package.json` (phaser only), architecture §3.1 / ownership row, tasks README

**Built:** Walkable Level 1 kitchen on Phaser 3.88.2. Player moves with WASD/arrows (touch pad on coarse pointers); clients walk in on invite / Marketing Director; E (or `?studioDebug=1` Talk) opens briefing; desk work loop during generate/critique; venue-scaled fridge magnets / easels show displayed art. Svelte HUD keeps the existing commission panels. `STUDIO_FLOOR_ENABLED` falls back to `KitchenScene`.

**Public surface:**

- `$lib/studio/bridge` — `StudioBridge`, snapshot/command types
- `$lib/studio/createGame` — `createPhaserGame(parent, bridge)`
- `$lib/studio/config` — `STUDIO_FLOOR_ENABLED`, speeds, tile constants
- `$lib/studio/rooms` / `easelLayout` — room grids + venue slot anchors
- `$lib/components` — `StudioFloor`, `StudioHudOverlay`

**Tests:** bridge / rooms / easelLayout (node); StudioFloor / StudioHudOverlay (client); `setAutoInviteAction` in gameState; e2e via `/?studioDebug=1`. Commands: `npm run check` green; scoped unit tests green; `npm run test:e2e` 6/6 green.

**Decisions:**

- No new `GamePhase` — summon is visual; talk calls existing `inviteClient()`.
- Kenney Tiny Dungeon (CC0) for tiles/characters; ADT-authored work pencil frames + E prompt (`static/studio/CREDITS.md`).
- Dynamic-import Phaser inside `StudioFloor` so SSR never loads WebGL.
- Furniture Kit / Toon Characters packs 404’d from mirrors; Tiny Dungeon alone covers floors, props, and NPCs.

**Requests:** None (phaser already added).

**Known gaps:**

- Levels 2–4 reuse the kitchen room stub (TODO in `rooms.ts`).
- Full-suite `npm run lint` still fails on inherited Prettier drift in `src/lib/modifier-explorer/**` (outside zone).
- Inherited intermittent client-test flake (`ResultsPanel` / route.fulfill) under full-suite load.

## 2026-08-01 — Spec 18a — abstract prompts domain

**Zone:** `src/lib/data/kitchenBriefs*`, `src/lib/data/briefs*`, `src/lib/game/abstractCritique*`, `src/lib/game/scoring*`, `src/lib/game/index.ts`, `src/lib/game/README.md`, `src/lib/data/README.md`, `src/lib/engines/critiqueProtocol*`, `src/lib/engines/mock/mockEngine*`, `src/lib/engines/janus/janusEngine*`, `src/lib/engines/README.md`, `src/lib/stores/gameState.svelte*`, `docs/agent-log.md`

**Built:** Progressive kitchen walk-in ladder (Mum concrete to evocative to pure mood) with interpretation-cluster scoring. `pickBrief` gates bands by `commissionsCompleted` and forces Mum openers on the first invite. Engines ask `critiqueTargetsForBrief`; mock names the committed cluster in review copy. `GameStore.inviteClient` passes lifetime commissions into `pickBrief`.

**Public surface:**

- `KITCHEN_BRIEFS` / `LEVEL_1_BRIEFS`; `maxWalkInAbstractness`, `isBriefEligibleForProgress`
- `pickBrief({ excludeIds?, unlockedTiers?, completedSeriesIds?, commissionsCompleted?, random? })`
- `usesInterpretationScoring`, `selectBestCluster`, `critiqueTargetsForBrief`, `isAbstractParrot`, `ClusterMatch`
- `scorePrompt` abstract branch; `calculatePayout` 0.5/0.5 when interpretation scoring; `creativityFromPrompt`
- Engines: `critiqueTargetsForBrief` re-export; Janus empty targets => accuracy 1; mock abstract review templates

**Tests:** kitchenBriefs, abstractCritique worked examples, scoring (c1 cat + c6 parrot/cluster + abstract payout 130/72), pickBrief band gates, mock/janus critique targets, GameStore opener + abstractness-2 invite. Commands: `npm run check` (0 errors); `npm run test:unit -- --run` (64 files / 408 tests passed). `npm run lint` fails only on pre-existing Prettier outside this zone.

**Decisions:**

- Spec table listed ratio 0.75 for `a faded sepia photograph in a family album`, but that prompt hits all four `nostalgia-photo` keywords so the algorithm yields 1.0 / accuracy 10. Kept algorithmic truth for that prompt; added `a faded sepia photograph of relatives` (3/4) to cover the 0.75 -> accuracy 8 ladder.
- `remoteEngine.ts` was absent from the worktree — skipped; wire `critiqueTargetsForBrief` on main when remote lands.
- Prestige `inviteClient` test sets `lifetimeCommissions: 4` so the opener guarantee does not block corporate/billionaire/auction draws.

**Requests:** None (no new deps).

**Known gaps:**

- Apply `critiqueTargetsForBrief` to `remoteEngine` once that file is on main.
- Prettier failures outside zone noted by the implementing agent.

## 2026-08-01 — Spec 18b — abstract prompts UI

**Zone:** `src/lib/components/AbstractBriefHint.svelte*`, `src/lib/components/index.ts`, `src/lib/components/README.md`, `src/routes/+page.svelte` / `StudioHudOverlay`, `docs/architecture.md` (§9 blurb only), `docs/agent-log.md`

**Built:** Presentational `AbstractBriefHint` shown during briefing when `currentClient.abstractness >= 1`, with exact band-1 / band-2 coaching copy from spec 18 §8. Band 0 renders nothing. Architecture §1 gains the exact spec §9 abstractness paragraph. On main with Phaser studio, the hint mounts inside `StudioHudOverlay`.

**Public surface:**

- `$lib/components` — `AbstractBriefHint` (`abstractness: AbstractnessLevel`)

**Tests:** `AbstractBriefHint.svelte.test.ts` — band 2 / band 1 copy visible, band 0 empty (3/3).

**Decisions:** Worktree mounted in `+page.svelte` (no StudioHudOverlay there); main remounts into `StudioHudOverlay` briefing.

**Requests:** None from this slice.

**Known gaps:** None for the UI slice.

## 2026-08-01 — Spec 19 office spaces & resident Mum

**Zone:** `src/lib/studio/**` (npcWander, venueRooms, rooms, easelLayout, bridge, createGame, scenes), `StudioFloor.svelte` (+ test if needed), `+page.svelte` summon/dismiss/spawn-visitor only, `static/studio/CREDITS.md`, architecture §3.1 blurb, agent-log

**Built:** Fridge kitchen shrunk to exact 6×6 with Mum as a resident patrol NPC (never door enter/leave). Distinct venue floor plans: garage 12×10, storefront 18×12 (work+window), gallery-hall 22×14 (atelier+gallery), mega-museum 28×16 (atelier+gallery+foyer). Phaser rebuilds on `activeVenueId` change. Bridge gains `residentClientArmed` + `spawn-visitor`; kitchen summon arms Mum, non-Mum invites spawn a door visitor while Mum keeps wandering. `easelLayout` stays in-bounds on 6×6.

**Public surface:**

- `getRoomForVenue` / `roomIdForVenue` — venue → authored `RoomDef`
- `nextWanderTarget` / `stepToward` — pure Mum patrol helpers
- `StudioSnapshot.residentClientArmed`, command `spawn-visitor`
- `createPhaserGame(parent, bridge, { initialVenueId? })`
- `RoomDef.zones` / `residents` / `palette`

**Tests:** npcWander, venueRooms, rooms (6×6 + venue table), easelLayout (6×6 bounds), bridge (`residentClientArmed: false` fixtures). Command: `npm run test:unit -- --run src/lib/studio` → 6 files / 18 tests passed. `npm run check` green after remoteEngine `critiqueTargetsForBrief` wire-up (spec 18a gap) and a skill-XP fixture fill in `save.test.ts` (partial spec 20 schema already on tree).

**Decisions:**

- No `mum.png` yet — tint `clients` frame 0 with `0xffc9a8` (documented in studio README / CREDITS).
- Added `mega-museum` to the `RoomId` union so hall vs mega stay distinct under `getRoomForVenue`.
- Prefer `spawn-visitor` after `inviteClient()` when the brief is not Mum in a Mum-resident room.

**Requests:** None.

**Known gaps:**

- Optional dedicated Mum spritesheet.
- Pathfinding around furniture for Mum (waypoint slide only, per spec).
- Inherited `npm run check` failures outside ownership zone.

## 2026-08-01 — Spec 20 progression feedback & craft skills

**Zone:** `src/lib/game/skills*`, `nextUnlock*`, `save.ts` skill XP fields, `gameState` wiring, `ProgressMeter` / `ProgressPanel` / `WorkGainToast`, `HudBar` / `GameMenuBar` / `ResultsPanel` / `StudioHudOverlay`, `+page` pending-gains props, docs

**Built:** HUD progress meters for commissions, cash goal, and reputation-to-next-unlock; three persisted craft skills (Prompting, Imagination, Hustle) that gain XP on collect with a soft payout bonus (`skillPayoutMultiplier`, capped +15%). Progress panel from the menu bar; results show pending XP/rep via `WorkGainToast`; skill meters emphasize while generating/critiquing and show deltas on results/collect.

**Public surface:**

- `$lib/game` — `skillProgress`, `previewSkillGains`, `applySkillGains`, `skillPayoutMultiplier`, `buildProgressMeters`, skill/unlock types
- `$lib/components` — `ProgressMeter`, `ProgressPanel`, `WorkGainToast`; extended `HudBar` / `ResultsPanel` / `StudioHudOverlay`
- `GameStore` — `skillXp`, `pendingSkillGains`, `lastCollectedGains`, `skillProgressList`, `progressMeters`, `clearLastCollectedGains()`

**Tests:** skills / nextUnlock / save (skill XP) unit; GameStore hydrate/apply/multiplier; ProgressMeter / ProgressPanel / WorkGainToast / HudBar / GameMenuBar / ResultsPanel component tests. Commands: `npm run check` (0 errors); scoped unit suite 101 passed; eslint on owned Svelte/TS green.

**Decisions:**

- Skill XP persists as three integer fields on `saveDataSchema` (Zod defaults) rather than a nested map — matches existing flat save style.
- Auction payouts stay bid-driven (no skill multiplier); auction still awards skill XP from the winning bid as `finalPayout`.
- `presentationMultiplier` absorbs `skillPayoutMultiplier` so there is still one payout multiplier seat.

**Requests:** None.

**Known gaps:**

- No Phaser desk XP bars (Svelte menus only, per spec).
- Skill trees / respec deliberately out of scope.

## 2026-08-01 � Spec 08 Local providers (split models)

**Zone:** `src/lib/engines/remote/**`, `MyPcSetup.svelte*`, `engineStore.svelte*`, `+page.svelte` (setup wiring), engine/component READMEs, agent-log

**Built:** Provider framework for My PC. Discriminated `remoteEngineConfigSchema` (januslink / ollama / lmstudio / automatic1111) with legacy JanusLink migration. `getRemoteProviderClient` routes HTTP; Automatic1111 critiques via paired Ollama or LM Studio. `MyPcSetup` provider select + split model fields; Coming soon for ComfyUI / OpenRouter / OpenAI / Cloud.

**Public surface:**

- `/engines/remote/providers` � `getRemoteProviderClient`, `RemoteProviderClient`, local clients
- `remoteEngineConfigSchema` � discriminated union + `defaultBaseUrlForProvider`
- `EngineStore` � provider fields, `setRemoteProvider`, `refreshRemoteModels`
- `MyPcSetup` � multi-provider bindables

**Tests:** remoteConfig migration/round-trip; remoteEngine via injected clients; ollama/lmstudio/a1111 client unit tests; MyPcSetup provider/model UI. Commands: `npm run check`; `npm run test:unit -- --run src/lib/engines/remote`; MyPcSetup + engineStore tests.

**Decisions:**

- Keep filename `MyPcSetup.svelte` to avoid export churn.
- A1111 always requires critique provider fields in schema (no MockEngine compose at runtime).
- Registry picker blurb left for orchestrator (outside ownership zone).

**Requests:** Update `registry.ts` My PC description to mention local providers; `docs/architecture.md` remote tier row.

**Known gaps:**

- ComfyUI / cloud BYO left to specs 09�10.
- Manual E2E against live Ollama/LM Studio/A1111 not run in this session.

## 2026-08-01 � Spec 09 BYO API (OpenRouter, OpenAI)

**Zone:** `src/lib/engines/remote/**`, `MyPcSetup.svelte*`, `engineStore.svelte*`, READMEs, agent-log

**Built:** Cloud BYO providers on the My PC engine. Shared `openAiCompatClient` plus OpenRouter/OpenAI wrappers. Config union gains `openrouter` / `openai` (apiKey min 8, generate + critique models). Setup enables both tabs with localStorage key warning; Coming soon is ComfyUI + ADT Cloud only.

**Public surface:**

- `createOpenAiCompatClient` / `createOpenRouterClient` / `createOpenAIClient`
- `REMOTE_PROVIDER_IDS` includes cloud vendors
- `remoteEngineConfigSchema` cloud arms + defaults

**Tests:** openAiCompatClient (list sort, b64/url generate, 401 no key leak, 404 image message); openrouter/openai smoke; remoteConfig cloud round-trip; MyPcSetup warning copy. Commands: `npm run check`; `npm run test:unit -- --run src/lib/engines/remote`; MyPcSetup tests.

**Decisions:**

- Never echo apiKey in errors (401 fixed copy + `replaceAll` redaction).
- OpenRouter sends `HTTP-Referer` + `X-Title` on every request.
- Spec 08 local providers unchanged.

**Requests:** None.

**Known gaps:**

- Manual live commission against OpenRouter/OpenAI not run (needs player keys).

## 2026-08-01 � Spec 11 BAGEL sketch + paint tools

**Zone:** `SketchCanvas`, `sketchBlank`, `StudioHudOverlay` / `+page` sketch wiring, `gameState` draft sketch, mock + JanusLink `/edit` client, ADTLocalServe companion

**Built:** Optional briefing sketch pad with brush, eraser, size, colour swatches, clear, undo. `createArt` passes `sketchImage` when strokes exist. Mock returns the sketch as artwork. Remote JanusLink calls `POST /api/janus/edit` (ADTLocalServe; FakeEngine stub / 501 without BAGEL). ComfyUI not used.

**Public surface:**

- `SketchCanvas` � paint props + `onexportready`
- `isSketchBlank` / `setDraftSketch` / `generate({ sketchImage? })`
- `JanusLinkClient.edit` + `RemoteProviderClient.edit?`

**Tests:** sketchBlank, SketchCanvas, StudioHudOverlay briefing sketch, mock sketch generate, remote edit vs generate routing, janusLink edit multipart. `npm run check` green; scoped unit tests green.

**Decisions:**

- Paint tools stay presentational; export happens on Create Art.
- ADTLocalServe FakeEngine re-encodes PNG; real JanusEngine returns 501 until `BAGEL_MODEL_DIR` + BAGEL runtime.

**Requests:** None.

**Known gaps:**

- Real BAGEL MoT inference not wired in ADTLocalServe yet (endpoint + stub ready).
- ADTLocalServe pytest needs project venv with torch (not on PATH here).

## 2026-08-01 — Spec 07 gap review (JanusLink / My PC)

**Zone:** `src/lib/engines/remote/**`, `MyPcSetup*`, `EnginePicker*`, `engineStore*`, engine/component READMEs, `docs/agent-log.md` (no redesign of 08/09 providers)

**Built:** Closed Spec 07 quality gaps against the current multi-provider architecture. JanusLink client now sets `credentials: 'omit'`, falls back to HTTP status text when the error body lacks `{ error }`, and is typed to the `januslink` config arm only. Restored the full JanusLink player setup guide (Tailscale, `JANUS_ALLOWED_ORIGINS`, Bearer-only auth) in `remote/README.md` and the My PC setup help. Added missing unit/component coverage for load failure/progress, CORS on generate, status-text errors, EngineStore remote test/connect, and picker “Change My PC server”.

**Public surface:** Unchanged APIs; `JanusLinkConfig` type exported from `janusLinkClient`.

**Tests:** `janusLinkClient` / `remoteEngine` / `remoteConfig` (node); `engineStore` My PC suite; `MyPcSetup` / `EnginePicker` (client). Commands: `npm run check` (0 errors); scoped `npm run test:unit -- --run src/lib/engines/remote src/lib/stores/engineStore.svelte.test.ts src/lib/components/MyPcSetup.svelte.test.ts src/lib/components/EnginePicker.svelte.test.ts` → 12 files / 77 tests passed. Owned-file prettier/eslint clean.

**Decisions:**

- Left Spec 08/09 provider framework intact; only tightened Spec 07 JanusLink path + docs/tests.
- Probe copy stays “Set up My PC” (not JanusLink-only) because 08/09 widened providers.

**Requests:**

- `npm run lint` still fails prettier on out-of-zone `docs/tasks/21-*.md`, `22-*.md`, `23-*.md`, and `docs/tasks/README.md` — orchestrator should format those.
- Optional: `docs/architecture.md` remote tier row already mentions 07–09 providers; `contracts.ts` comment still says JanusLink-only — widen comment if desired.

**Known gaps:**

- Manual E2E against a live JanusLink install still not run (needs GPU PC + Tailscale + allowlisted origin).
- Full-repo `npm run lint` red only from unowned task-doc prettier drift.

## 2026-08-01 � Spec 17 gap review (Phaser studio floor)

**Zone:** `src/lib/studio/**`, `StudioFloor*`, `StudioHudOverlay*` (tests/docs only), `static/studio/**` (unchanged), DoD ticks in `docs/tasks/17-phaser-studio.md`, `docs/agent-log.md`

**Built:** Closed remaining Spec 17 quality gaps without redesigning Specs 18�21 studio extensions.

- `slotsForVenue`: storefront / gallery-hall / mega-museum are easels-only; fridge magnets + garage 3+3 mix preserved (spec 19).
- `isSafeStudioImageUrl` + StudioScene easel loader: reject unsafe URLs; unload `art-<id>` textures on replace; ignore stale async loads.
- Door visitor faces room center on arrive.
- `StudioFloor` loading / error / boot-timeout UI; destroy-on-unmount hardened; BootScene sets `studioBootFailed` on asset loaderror.
- Component tests for loading, ready, destroy; easel kind tests; safeImageUrl unit tests.
- Spec 17 Definition of done ticked; studio + components READMEs updated.

**Public surface:**

- `isSafeStudioImageUrl(url: string): boolean` from `/studio/safeImageUrl`
- `StudioFloor` boot status (loading until bridge `ready`)

**Tests:** `npm run check` green; `npm run test:unit -- --run src/lib/studio src/lib/components/StudioFloor.svelte.test.ts src/lib/components/StudioHudOverlay.svelte.test.ts` ? 9 files / 29 passed. Full suite: 541 passed; 1 pre-existing flake in `ResultsPanel.svelte.test.ts` (out of zone). Owned-file prettier/eslint clean.

**Decisions:**

- Did not add a new bridge event for boot failure (keeps Spec 17 exact surface); registry flag + StudioFloor timeout instead.
- Left Mum / venue rebuild / deliver-to-client / work progress bar from Specs 19�20 intact.
- 4-dir walk anims remain flipX + single sheet (Tiny Dungeon constraint; documented in studio README).

**Requests:**

- Full-repo `npm run lint` may still fail prettier on unowned `docs/tasks/21-*.md` / `22` / `23` / task README � format centrally if still drifting.
- Optional: re-run `npm run test:e2e` with `studioDebug=1` (not run this session; path already present).

**Known gaps:**

- Manual playtest of touch D-pad / easel thumbnails under real WebGL not re-run here.
- Player anims still not true 4-direction sheets (asset limitation; intentional).

## 2026-08-01 — Spec 08 gap review (local providers)

**Zone:** `src/lib/engines/remote/**` (providers + config + RemoteEngine), `MyPcSetup*`, `engineStore*`, READMEs, Spec 08 DoD, agent-log

**Built:** Gap audit against Spec 08 after the large initial landing (+ Spec 09 coexistence). Core provider framework was already present. Closed remaining quality gaps:

- `refreshRemoteModels` works before model fields are filled (placeholder injection for Zod).
- A1111 `testConnection` falls back to `/sdapi/v1/options` when `/sd-models` fails, then still probes critique.
- Spec 08 test table gaps: Ollama seed + response-base64 path; LM Studio 401 without key leak; A1111 override_settings / options fallback / critique failure; factory unknown provider; store setRemoteProvider + ollama connect + early refresh; MyPcSetup A1111 critique fields.
- Spec 08 Definition of done ticked (with note that Spec 09 enabled OpenRouter/OpenAI).

**Public surface:** Unchanged — `getRemoteProviderClient`, local clients, discriminated `remoteEngineConfigSchema`, `EngineStore` remote fields, `MyPcSetup` bindables.

**Tests:** Owned Spec 08 paths covered via `src/lib/engines/remote/**`, `engineStore.svelte.test.ts`, `MyPcSetup.svelte.test.ts`. Commands: `npm run check`; `npm run lint`; `npm run test:unit -- --run`.

**Decisions:**

- Left Spec 09 OpenRouter/OpenAI clients, config arms, and UI tabs intact.
- Placeholders for list-models are store-only; Connect/Test still require a real valid config.

**Requests:** None (registry description / architecture remote-tier wording remain orchestrator-owned if still stale).

**Known gaps:**

- Manual E2E against live Ollama/LM Studio/A1111 not run in this session.
- ComfyUI still Coming soon (intentional).

## 2026-08-01 — Spec 18 gap review (abstract prompts)

**Zone:** Spec 18 D1+D2 paths (`kitchenBriefs*`, `briefs*`, `abstractCritique*`, `scoring*`, engines critique wiring, `AbstractBriefHint*`, `StudioHudOverlay` mount, READMEs, architecture §1 already present, task DoD, agent-log)

**Built:** Gap audit against Spec 18. Core ladder / cluster scoring / pickBrief gating / UI hint / architecture blurb were already present from 18a/18b. Closed remaining quality gaps:

- Remote critique now sets `accuracyScore = 1` when `critiqueTargetsForBrief` returns empty (matches Janus; no longer only via `accuracyFromHits(0,0)`).
- Remote unit tests for abstract parrot (empty targets) and sunday-dinner cluster keyword questions.
- Scoring test for invent-but-unrecognised abstract prompts → accuracy 2.
- Mum band-0 briefs (`c1`–`c3`, `c7`) share `/avatars/c1.svg` per §2.2; kitchen tests assert cluster keyword counts 2–6.
- Spec 18 Definition of done ticked; game/engines README wording tightened.

**Public surface:** Unchanged from Spec 18a/18b (`KITCHEN_BRIEFS`, abstract critique helpers, `AbstractBriefHint`, `critiqueTargetsForBrief` engine path).

**Tests:** Owned Spec 18 suite green (`kitchenBriefs`, `briefs`, `abstractCritique`, `scoring`, `critiqueProtocol`, `mockEngine`, `janusEngine`, `remoteEngine`, `gameState` opener/abstractness, `AbstractBriefHint`). Commands: `npm run check` (0 errors); `npm run lint` green; full `npm run test:unit -- --run` → 91 files / 545 passed.

**Decisions:**

- Did not retag billionaire briefs with clusters (explicitly out of scope).
- Spec table ratio 0.75 for the four-keyword nostalgia prompt remains documented as algorithmic 1.0; the 3/4 ladder case stays covered separately.
- At `commissionsCompleted === 0`, opener guarantee still forces Mum band-0 even when billionaire is unlocked (spec §5.2 wins over the §5.4 “billionaire may appear” wording).

**Requests:** None for Spec 18. Optional: format any remaining unowned task-doc prettier drift centrally.

**Known gaps:**

- None material for Spec 18 acceptance criteria.
- Pre-existing out-of-zone client flake (`ResultsPanel`) may still appear under full-suite load.

## 2026-08-01 — Spec 19 gap review (office spaces / Mum)

**Zone:** `src/lib/studio/**`, `+page.svelte` summon wiring (read-only audit), `StudioFloor.svelte.test.ts` only if needed, Wave E / architecture §3.1 / agent-log

**Built:** Gap audit of Spec 19 DoD vs code. Core venue plans, Mum resident patrol, `residentClientArmed` / `spawn-visitor`, venue rebuild, and `+page` kitchen wiring were already shipped (specs 17–19 + Spec 20 summon glue). Closed remaining quality gaps:

- Storefront / gallery-hall / mega-museum easel slots are easels-only (no fridge magnets) via `magnetCountForVenue` — matches Spec 17 §6.5 / studio README.
- `rooms.test` now asserts walkable desk/door/wait/spawn on every higher venue and real vertical-divider doorway gaps (≥1 storefront/hall, ≥2 mega).
- Mum `spriteKey` aligned to `'mum'` (StudioScene still tints `clients` until `mum.png` ships).
- Kept existing studio hardening already on the tree: `isSafeStudioImageUrl` for easel loads, BootScene `studioBootFailed`, StudioFloor loading/error UX (component file owned elsewhere).

**Public surface:** Unchanged — `getRoomForVenue`, `npcWander`, `residentClientArmed`, `spawn-visitor`, `inspect-zone`.

**Tests:** `npm run check` (0 errors); `npm run lint` green; `npm run test:unit -- --run` → 91 files / 545 passed. Scoped studio: `src/lib/studio` green.

**Decisions:**

- Did not queue a missing `mum.png` load (would 404 every boot); tint fallback remains Spec 19 §5 acceptable path.
- Did not edit dirty architecture / tasks README rows outside Wave E §3.1 (21.x catalog prep left for orchestrator).
- Did not touch sibling Spec 20 / 08 worktrees or out-of-zone dirty files.

**Requests:** None.

**Known gaps:**

- Optional dedicated `mum.png` spritesheet (Spec 21a).
- Mum waypoint slide has no furniture pathfinding (explicitly out of scope).

## 2026-08-01 — Spec 09 gap review (BYO API)

**Zone:** `src/lib/engines/remote/**` (cloud clients/config), `MyPcSetup*`, `engineStore*`, READMEs, Spec 09 DoD, agent-log

**Built:** Gap audit against Spec 09 after the initial BYO landing (+ Spec 08 coexistence). Core OpenRouter/OpenAI path was already present. Closed remaining quality gaps:

- `openAiCompatClient.understand` treats missing `content` as `''`; joins array text parts (covered by tests).
- Spec table gaps: openai missing apiKey → null; apiKey length 7 save throws; generate no-image + 401 no key leak; factory registers cloud providers; store setRemoteProvider/openrouter refresh/openai connect.
- MyPcSetup intro + baseUrl placeholders mention cloud vendors; Coming soon stays ComfyUI + ADT Cloud.
- Remote README adds dedicated OpenRouter/OpenAI setup steps + cost warning; Spec 09 DoD ticked.

**Public surface:** Unchanged — `createOpenAiCompatClient` / `createOpenRouterClient` / `createOpenAIClient`, cloud arms of `remoteEngineConfigSchema`, `REMOTE_PROVIDER_IDS`, `EngineStore` cloud fields, `MyPcSetup` OpenRouter/OpenAI tabs.

**Tests:** Owned Spec 09 paths via `openAiCompatClient*`, `openrouterClient*`, `openaiClient*`, `remoteConfig*`, `providers/index*`, `engineStore.svelte.test.ts`, `MyPcSetup.svelte.test.ts`. Commands: `npm run check`; `npm run lint`; `npm run test:unit -- --run`.

**Decisions:**

- Left Spec 08 local providers intact; only tightened Spec 09 cloud clients/UI/tests/docs.
- Refresh-models still injects temporary key/model placeholders for Zod; Connect requires a full valid cloud config.

**Requests:** None.

**Known gaps:**

- Manual live commission against OpenRouter/OpenAI not run (needs player keys).
- ComfyUI / Art Dev Tycoon Cloud remain Coming soon (intentional).

## 2026-08-01 — Spec 20 gap review (progression feedback)

**Zone:** Spec 20 ownership (`skills*`, `nextUnlock*`, `save` skill XP, `gameState` skill wiring, `ProgressMeter` / `ProgressPanel` / `WorkGainToast`, `HudBar` / `GameMenuBar` / `ResultsPanel` / `StudioHudOverlay`, docs)

**Built:** Gap audit against Spec 20. Core domain math, save fields, GameStore XP/multiplier wiring, HUD meters, Progress panel, and pending results toast were already present. Closed remaining quality gaps:

- `ProgressMeter` treats `max <= 0` as a full bar (capped skills).
- `ProgressPanel` shows skill taglines; capped skill meters no longer render empty.
- Compact `HudBar` reputation hint now includes the next-unlock label.
- `GameMenuBar` mounts `WorkGainToast` in `collected` mode from `lastCollectedGains`.
- `nextUnlock` Max prestige uses current/current (not `max(rep, 1)`).
- `ResultsPanel` tests use a data-URL artwork (no `/test.png` 404 flake).
- Added StudioHudOverlay pending-gains coverage + ProgressMeter max-0 / banked-toast tests.

**Public surface:** Unchanged from Spec 20 (`skillProgress`, `previewSkillGains`, `buildProgressMeters`, `ProgressMeter` / `ProgressPanel` / `WorkGainToast`, GameStore skill fields).

**Tests:** Spec 20 suite green; full `npm run test:unit -- --run` → 91 files / 548 passed. Commands: `npm run check` (0 errors); `npm run lint` green.

**Decisions:**

- Banked toast lives on `GameMenuBar` (results UI unmounts on collect; menu strip stays visible for the 1.6s pulse).
- Did not redesign shop unlock tables or Phaser desk XP bars (out of scope).

**Requests:** None.

**Known gaps:**

- None material for Spec 20 acceptance criteria.
- Skill trees / Phaser desk XP bars remain deliberately out of scope.

## 2026-08-01 — Spec 21a gap review (Living NPCs)

**Zone:** `staffPresence*`, `clientLooks*`, `bridge.ts` (+ test), `BootScene.ts`, `StudioScene.ts`, `README.md`, `static/studio/CREDITS.md`, `mum.png` / `staff.png`, `+page.svelte`, `docs/tasks/21a-living-npcs.md` (DoD), `docs/agent-log.md`

**Built:** Gap audit found Spec 21a unimplemented on this branch (prior impl lived only on `agent/living-npcs`). Ported and closed DoD: `hiredRoleIds` + `client.tier` on snapshot / `+page` sync; BootScene loads optional `mum`/`staff` sheets while preserving Spec 19 `studioBootFailed` for required assets; floor staff (apprentice / marketing-director / curator; never print-shop); curator patrol; `clientLookForTier` door looks. Shipped CC0 `mum.png` / `staff.png` (Kenney strips derived from `clients.png`). Dedicated mum/staff idle anims so Phaser does not swap textures back to `clients`; staff idle keeps role frames.

**Public surface:**

- `StudioSnapshot.hiredRoleIds: readonly string[]` (default `[]`)
- `StudioSnapshot.client.tier: string` when client ≠ null
- `floorStaffFromHired` / `staffAnchorForRole` / `curatorPatrol` / `staffLookForRole`
- `clientLookForTier(tier) → { frame, tint }`

**Tests:** `staffPresence.test.ts`, `clientLooks.test.ts`, bridge fixture `hiredRoleIds: []`. Commands: `npm run check`; `npm run lint`; `npm run test:unit -- --run src/lib/studio`.

**Decisions:**

- Kept Spec 19 boot-failure gate; only `mum`/`staff` 404s are ignored (prior 21a branch dropped `studioBootFailed`).
- Shipped mum/staff sheets (preferred §4.3) rather than tint-only fallback.
- Did not edit 21b–21f, contracts, game/data, or sibling worktrees.

**Requests:** None.

**Known gaps:**

- A4–A8 (pedestrians, rival, critic ghost, pet, museum crowd) remain out of scope.
- Mum/staff sheets are the same Kenney strip as clients for now — distinct art can replace them later without code changes.

## 2026-08-01 — Spec 22 gap review (multiple saves)

**Zone:** Spec 22 ownership (`saveSlots*`, `SaveSlotsPanel*`, `save.ts`/`save.test.ts`,
GameStore slot seams, `GameMenuBar`, `+page` slot dismiss wire, docs)

**Built:** Spec 22 was entirely missing in this worktree. Implemented three named save
slots end-to-end:

- `saveSlots.ts` — Zod-validated `adt.save.slots.v1`, active pointer, legacy
  `adt.save.v1` → slot 0 migration, list/peek/activate/new/delete/rename/copy.
- `save.ts` — `loadSave` / `persistSave` / `clearSave` route through the active slot
  (Spec 20 skill XP fields unchanged on the `SaveData` schema).
- `GameStore` — `switchToSlot` / `newGameInSlot` / `deleteSaveSlot` / `renameSaveSlot` /
  `copySaveSlot`, plus `saveSlotsList` / `activeSaveSlotId`; mid-commission switch
  aborts to `idle` and rehydrates meta-progress.
- `SaveSlotsPanel` + GameMenuBar **Saves** entry; `+page` `onafterslotchange` dismisses
  the studio client after slot mutations.

**Public surface:**

- `$lib/game`: `SLOTS_STORAGE_KEY`, `ACTIVE_SLOT_KEY`, `SLOT_IDS`, `MAX_SAVE_SLOTS`,
  `ensureSaveSlotsMigrated`, `listSaveSlots`, `activateSlot`, `newGameInSlot`,
  `deleteSlot`, `renameSlot`, `copySlot`, `getActiveSlotId` / `setActiveSlotId`, types.
- `GameStore` slot methods above; `SaveSlotsPanel` props/callbacks per Spec 22 §6.

**Tests:** Migration + activate/new/delete/copy tables; active-slot round-trip + skill XP
preservation; GameStore mid-commission switch; SaveSlotsPanel + GameMenuBar component
tests. Commands: `npm run check` (0 errors); `npm run lint` green; scoped
`npm run test:unit -- --run` on owned files → 5 files / 95 passed.

**Decisions:**

- Slot file Zod schema is built lazily to avoid circular init with `saveDataSchema`.
- Deleting a non-active slot refreshes the list only; deleting the active slot
  rehydrates from the newly chosen active (or `newGameInSlot('0')` when all empty).
- Panel owns confirm dialogs; page owns studio dismiss via `onafterslotchange`.

**Requests:** None.

**Known gaps:**

- No export/import JSON (Spec 23).
- No cloud sync / more than 3 slots (explicitly out of scope).

## 2026-08-01 — Spec 11 gap review (BAGEL sketch)

**Zone:** `SketchCanvas`, `sketchBlank`, `StudioHudOverlay`, `gameState` draft sketch, mock + JanusLink `/edit`, engines/game/component READMEs, `docs/agent-log.md`, `docs/tasks/11-bagel-sketch.md`

**Built:** Closed Spec 11 quality gaps against the existing sketch/edit path (no redesign; Spec 09 cloud providers untouched).

- Split `SketchCanvas` mount vs exporter effects so parent callback identity cannot wipe strokes.
- `RemoteEngine` maps BAGEL / 501 / not-installed edit failures to the spec's player-safe `EngineError`.
- `collectCash` / `dismissError` clear `draftSketchBlob` (`inviteClient` already did).
- Added missing unit/component coverage for sketch into `createArt`, clear/hasStrokes, BAGEL error copy, accessible paint controls.
- Documented sketch/edit in component, engine, and game READMEs; marked Spec 11 DoD checkboxes done.

**Public surface:** Unchanged APIs — `SketchCanvas`, `isSketchBlank`, `setDraftSketch`, `generate({ sketchImage? })`, `JanusLinkClient.edit` / `RemoteProviderClient.edit?`.

**Tests:** `npm run check` (0 errors); scoped `npm run test:unit -- --run` on sketchBlank, SketchCanvas, StudioHudOverlay, mockEngine, janusLinkClient, remoteEngine, gameState → 7 files / 109 tests passed. Owned-file prettier/eslint clean after fixes.

**Decisions:**

- Keep paint tools presentational; exporter registration must not re-init the canvas.
- Retry still keeps `draftSketchBlob` so a failed refine can be re-attempted without re-drawing; dismiss clears it.

**Requests:** None (architecture.md BAGEL one-liner and `contracts.sketchImage` already present).

**Known gaps:**

- Real BAGEL MoT inference still lives in ADTLocalServe (endpoint + 501 stub); not this game repo.
- `+page.svelte` sketch wiring is outside this zone (already landed).

## 2026-08-01 — Spec 21b gap review (Interactables)

**Zone:** `interactables*`, `rooms.ts` (+ test), `bridge.ts` (+ test), `StudioScene.ts`
(furniture + interact tails only), `README.md`, `GameMenuBar*` (nonce open), `+page.svelte`,
`docs/tasks/21b-interactables.md` (DoD), `docs/architecture.md` §3.1, `docs/agent-log.md`

**Built:** Gap audit found Spec 21b unimplemented on this branch (prior impl lived only
on `agent/interactables` @ `40285ce`; HEAD already had 21a). Ported B1/B2/B5 without
touching staff/Mum spawn: data-driven `interactables.ts`; kitchen fridge + garage
workbench tags; outbound `open-shop` / `prop-bark`; scene prop tail after talk/deliver/
desk/easel/look; fridge frame swap + bark + 2s auto-close; toolkit shelf →
`openToolkitNonce` → existing `ToolkitShop`.

**Public surface:**

- `InteractableId`, `StudioShopId`, `FRIDGE`, `TOOLKIT_SHELF`
- `nearestInteractable` / `defForInteractable` / `fridgeBarkLine` / `interactPromptText`
- `FurnitureProp.interactableId?`
- Bridge: `{ type: 'open-shop'; shop }` / `{ type: 'prop-bark'; propId; text }`
- `GameMenuBar` prop `openToolkitNonce?: number`

**Tests:** `interactables.test.ts` §8.1 table; rooms tag assertions; bridge emit coverage;
GameMenuBar nonce opens toolkit. Commands: `npm run check`; `npm run lint`;
`npm run test:unit -- --run` (owned files + full unit gate).

**Decisions:**

- Kept 21a spawn / Mum / staff methods untouched; scene edits limited to conflict-table
  areas (`#placeFurniture`, `#nearestTarget` prop tail, `#tryInteract` prop branch,
  `#updateInteractPrompt`).
- Preferred nonce wiring over lifting `showToolkit` to `+page`.
- `prop-bark` toast left as optional no-op in `+page` (Phaser frame swap is the feedback).

**Requests:** None.

**Known gaps:**

- B3–B12 catalog extras remain follow-up / out of scope (radio needs 21c, etc.).
- Full verb polish for talk/deliver/desk is 21f F4 — props only get `E — …` text labels.

## 2026-08-01 — Spec 23 gap review (Dev mode)

**Zone:** `src/lib/dev/**`, `DevPanel*`, `GameMenuBar*`, `StudioHudOverlay*`,
`gameState` `dev*` methods, `+page` resolve wiring, `e2e/game-loop.e2e.ts`,
`docs/tasks/23-dev-mode.md`, architecture blurb, agent-log

**Built:** Spec 23 was entirely missing. Implemented gated Dev mode end-to-end:

- `devMode.ts` — `resolveDevMode` (`?dev=1`/`true`, `?dev=0` hard-off, latch,
  Vite DEV, `?studioDebug=1` alias), latch load/persist/clear (never throws).
- `cheats.ts` — cash/rep clamps + `peekLevel1ModifierSuffix` (crayon medium source).
- `GameStore` — `devSetCash` / `devSetReputation` / `devSetLifetimeCommissions` /
  `devUnlockAllProgression` / `devForceIdle` / `devExportSave` / `devImportSave`;
  `createArt` aborts cleanly if force-idle mid-flight.
- `DevPanel` + GameMenuBar **Dev** entry; “Open saves” links Spec 22 panel.
- `+page` wires `resolveDevMode` → menu + `studioDebug`; e2e uses `?dev=1`.

**Public surface:**

- `$lib/dev`: `resolveDevMode`, latch helpers, `clampCheatCash` / `clampCheatRep`,
  `peekLevel1ModifierSuffix`, `DevCheatPort`
- `GameStore.dev*`; `DevPanel` props per Spec 23 §4 (+ optional `onopensaves`)

**Tests:** resolveDevMode table + latch swallow; clamps/peek; import validation;
DevPanel hide/show + peek; GameMenuBar Dev gate; GameStore cheats/force-idle.
Commands: `npm run check`; `npm run lint`; scoped
`npm run test:unit -- --run` on owned files.

**Decisions:**

- Client-tier unlock via max `CLIENT_TIER_INFO` reputation (runtime gate), not the
  unused save `unlockedClientTiers` field.
- Modifier peek only inside DevPanel; `buildLevel1Prompt` for full modified text.
- Did not touch contracts, engines, Phaser internals, or sibling worktrees.

**Requests:** None.

**Known gaps:**

- None material for Spec 23 DoD.
- Production players without query/latch never see Dev tools (by design).

## 2026-08-01 — Spec 10 gap review (ADT Cloud STUB)

**Zone:** `docs/tasks/10-adt-cloud.md`, `docs/agent-log.md`, MyPcSetup Coming soon
copy / tests / READMEs (read-only audit; no product code)

**Built:** Gap audit only. Spec 10 remains an intentional stub — no backend, no
`+server.ts`, no `adt-cloud` engine id, no fake cloud auth. Confirmed UI/docs already
match deferred status; no copy fixes required.

**Public surface:** None (no new exports).

**Tests:** None run (no code changes). Existing MyPcSetup Coming soon list includes
“Art Dev Tycoon Cloud”; Spec 09 tests keep OpenRouter/OpenAI out of that list.

**Decisions:**

- Did not invent a Spec 10 implementation — hosted credits need a real server and break
  `adapter-static` / best-practices §5.3; orchestrator must own contracts + backend first.
- Left MyPcSetup / component README / remote README unchanged — they already treat ADT
  Cloud as Coming soon / out of scope, distinct from BYO OpenRouter/OpenAI keys.

**Requests:** None until product wants a full Spec 10 (auth, billing, inference proxy,
`contracts.ts` session/credits).

**Known gaps:**

- Full Spec 10 DoD (accounts, credits, paid generate+critique path) deliberately
  unfinished; no code path to build yet.
- ComfyUI remains Coming soon alongside ADT Cloud (unrelated stub).

## 2026-08-01 — Spec 21d gap review (Studio VFX)

**Zone:** `src/lib/studio/vfx.ts`, `vfx.test.ts`, `bridge.ts` (+ test, `reducedVfx` only),
`scenes/StudioScene.ts` (emitter helpers only), `src/routes/+page.svelte` (matchMedia → sync),
`src/lib/studio/README.md`, `docs/tasks/21d-studio-vfx.md` (DoD ticks), `docs/agent-log.md`

**Built:** Gap audit found Spec 21d unimplemented on this branch (prior impl lived only on
`agent/studio-vfx` @ `18268b2`; HEAD already had 21a/21b). Ported D3/D4 without touching
NPC/interact/audio: pure `vfx.ts` caps + helpers; additive `StudioSnapshot.reducedVfx`;
`+page` `matchMedia('(prefers-reduced-motion: reduce)')` → every `syncStudio()`; Phaser
desk dust during `generating`/`critiquing` and one-shot cash confetti on Collect Cash
phase edges (`results` → `idle`/`levelComplete`). In-scene `textures.generate('vfx-dot')`
— no new PNGs / CREDITS lines. HudBar cash tween untouched.

**Public surface:**

- Caps: `WORK_PARTICLE_MAX` (12), `WORK_PARTICLE_FREQUENCY_MS` (90), `CASH_BURST_COUNT` (18),
  `CASH_BURST_LIFESPAN_MS` (700)
- `shouldEmitWorkParticles` / `shouldBurstCashConfetti` / `shouldTriggerCashBurst` /
  `queryPrefersReducedMotion` / `clampWorkParticleCount` / `clampCashBurstCount`
- Snapshot field `reducedVfx: boolean` (default `false`)

**Tests:** `vfx.test.ts` covers the §6.1 table. Bridge fixture includes `reducedVfx: false`.
Commands: `npm run check` (0 errors); `npm run lint` green;
`npm run test:unit -- --run` → 101 files / 648 passed.

**Decisions:**

- Cash burst origin = player sprite (desk fallback) so floor-deliver feels local.
- Continuous emitters: one desk work emitter only; cash is `explode` one-shot.
- Destroy emitters on `#teardownFloor` + scene `SHUTDOWN`; recreate after venue rebuild.
- Kept 21a spawn / Mum / staff and 21b interact methods untouched; scene edits limited to
  emitter fields + create/sync/destroy hooks.
- Did not edit `package.json`, contracts, audio, interact registry, or HudBar.

**Requests:** None (no new npm deps).

**Known gaps:**

- Manual / observational Phaser checks (desk dust + confetti + reduced-motion DevTools)
  not run headless — unit helpers cover gating/caps only.
- D1/D2/D5–D10 catalog extras out of scope.
- StudioFloor.svelte.test.ts needed no `reducedVfx` mock (component does not build
  snapshots).

## 2026-08-01 — Spec 21c gap review (Studio audio)

**Zone:** `src/lib/audio/**`, `AudioSettingsPanel*`, `static/studio/audio/**`,
`GameMenuBar*`, `components/index.ts` + README, `+page.svelte`, studio CREDITS,
`docs/tasks/21c-studio-audio.md`, `docs/agent-log.md`

**Built:** Gap audit found Spec 21c entirely missing (no `$lib/audio`, no Phaser
audio either — correct design). Implemented mute-first HTMLAudioElement pipeline:

- Schema `adt.audio.v1` (Zod clamp/defaults; music default `0`) + load/persist
  swallow policy.
- Catalog beds by venue + work/stinger SFX; `isAudioEnabled` for future snapshot.
- `MuteSafePlayer` + `createStudioAudio` / `studioAudio` singleton; gesture unlock
  via `attachAudioUnlock`; rejecting `play()` never throws.
- Cue wiring in `+page` (venue bed, phase loops, cash + level-up stingers).
- `AudioSettingsPanel` + GameMenuBar **Audio** entry (beside Progress / Saves / Dev).
- CC0 near-silent WAV stubs under `static/studio/audio/**` + CREDITS.

**Public surface:**

- `$lib/audio`: `studioAudio`, `createStudioAudio`, `attachAudioUnlock`,
  `isAudioEnabled`, `playSfx`, prefs schema/helpers, catalog ids
- `AudioSettingsPanel` props: `prefs`, `onchange`, `onclose`

**Tests:** schema/levels/catalog/player/controller tables; AudioSettingsPanel +
GameMenuBar Audio entry. Commands: `npm run check` (0 errors); `npm run lint`;
scoped `npm run test:unit -- --run` on owned files → 7 files / 48 passed; full unit
gate also run.

**Decisions:**

- Zero Phaser / bridge edits — `audioEnabled` not on snapshot yet; export ready.
- WAV stubs (valid RIFF) instead of broken empty MP3; catalog URLs point at `.wav`.
- Singleton `studioAudio` shared by `+page` + GameMenuBar; `dispose()` rebuilds the
  element pool so page teardown does not permanently kill the controller.
- Left Spec 23 Dev and Spec 22 Saves menu entries untouched aside from inserting Audio.

**Requests:** None.

**Known gaps:**

- C2 / C5 / C6 / C7 catalog extras remain out of scope (seams via `playSfx`).
- Richer CC0 beds can replace stubs without code changes.
- Bridge `audioEnabled` sync waits on orchestrator freeze.

## 2026-08-01 — Spec 21 parent docs gap review (living-meta)

**Zone:** `docs/tasks/21-living-studio.md`, `docs/tasks/21-boss-plan.md`,
`docs/tasks/README.md`, `docs/architecture.md`, `docs/agent-log.md`

**Built:** Docs-only audit of Spec 21 parent catalog vs HEAD. Boss plan still claimed
21a–21f were all `ready_for_review` / unmerged; living-studio still described a
pre-21a floor and left “specs written” unticked. Cross-checked agent-log + DoD ticks +
code presence (`staffPresence`, `interactables`, `$lib/audio`, `vfx`, bridge fields).
Updated parents so **21a–21d MVP is marked shipped on this tip** and **21e/21f stay
open**; deferred catalog rows (A4–A8, B3–B12 extras, C2/C5–C7, D1–D2/D5–D10, E2–E7,
most of F) remain explicitly unticked. Architecture §3.1 / §9 living-studio blurbs
synced. No Phaser / `src/**` edits.

**Public surface:** None (docs only).

**Tests:** None run (documentation only). Verification = read DoD ticks on 21a–21d
(x), 21e/21f ([ ]), confirm missing `pathfind.ts` / bark pool on this tip.

**Decisions:**

- Treat gap-review merge commits on this tip as source of truth for ship status, not
  historical `agent/living-npcs` etc. branch tips alone.
- Clarified boss freeze: `audioEnabled` on snapshot remains unused (21c prefs only).
- Did not tick E1/F1/F4 — siblings own those zones.

**Requests:** None.

**Known gaps:**

- 21e (E1 barks) and 21f (F1/F4/F6 consumers) still open in sibling worktrees.
- Deferred catalog rows remain future follow-ups; parent now tracks them honestly.

## 2026-08-01 — Spec 21f gap review (Studio QoL)

**Zone:** `src/lib/studio/pathfind*`, `interactPrompt*`, `npcWander*` (+ path-queue
helpers), `scenes/StudioScene.ts` (prompt draw + Mum path-follow + camera lerp only),
`README.md`, `docs/tasks/21f-studio-qol.md` (DoD ticks), `docs/agent-log.md`

**Built:** Gap audit found Spec 21f missing on this branch (prior impl only on
`agent/studio-qol` @ `bf1c11f`; HEAD already had 21a–21d including `reducedVfx`).
Ported F1/F4/F6 without touching spawn/registry/particles: `interactPromptLabel` +
text world prompts; 4-neighbour BFS Mum pathfinding over `RoomDef.collision`;
`reducedVfx` consumers for Mum pause (~600 ms) and hard camera follow. Reused 21d
`+page` / `queryPrefersReducedMotion` snapshot wiring — did not rename or re-add the
field.

**Public surface:**

- `findPath(grid, start, goal)` / `findPathInRoom(width, height, collision, start, goal)`
  → `TileMarker[] | null`
- `interactPromptLabel(input)` / `prefersReducedMotion(media?)`
- `withPath` / `tileFromPixel` on `WanderState` (path + pathIndex)

**Tests:** `pathfind.test.ts` (kitchen A–D + null + mega open + 3×3);
`interactPrompt.test.ts` (fallback table + registry win + prefersReducedMotion);
`npcWander` path-queue cases. Commands: `npm run check` (0 errors); `npm run lint`
green; `npm run test:unit -- --run src/lib/studio` → 13 files / 56 passed.

**Decisions:**

- Text-only world prompts (depth 20, white + dark stroke); `prompt-e` stays loaded
  unused.
- Path queue lives on `WanderState`; repath only when path empty (new waypoint /
  skip).
- Camera soft lerp (0.12) gated off when `reducedVfx` — hard follow (1).
- Kept 21a `#playMumAnim` / staff looks and 21b prop handlers / 21d emitters
  untouched aside from owned prompt + Mum path + camera methods.

**Requests:** None.

**Known gaps:**

- Curator/staff still straight-line patrol (optional BFS reuse not required for MVP).
- Catalog F3 minimap, F5 gamepad, F7 memory density — out of scope.
- Manual Phaser walkthrough (Mum vs fridge/table, verb prompts) not run headless.

## 2026-08-01 — Spec 21e gap review (Ambient events / barks)

**Zone:** `src/lib/data/barks*`, `src/lib/studio/barkPicker*`, `barkPresenter*`,
`scenes/StudioScene.ts` (bark timer + bubbles only), `BarkLiveRegion.svelte` (+ test),
`StudioFloor.svelte` (+ test), `components/index.ts`, data + studio READMEs,
`docs/tasks/21e-ambient-events.md` (DoD ticks), `docs/agent-log.md`

**Built:** Gap audit found Spec 21e entirely missing on `agent/gap-ambient` (prior
impl lived only on `agent/studio-ambient` @ `4876966`; HEAD already had 21a–21d via
gap merges). Ported E1 without touching interact/VFX/audio assets: static
`BARK_POOL`, seeded picker/schedule/phase gate, Phaser Text bubble during `idle`
only, `BarkLiveRegion` via registry `onBark`. Mum-only when no staff; staff speakers
when `hiredRoleIds` + sprites present. Leaving idle (incl. generating/critiquing)
hides bubble and clears the live region; countdown resets.

**Public surface:**

- `BARK_POOL` / `linesForSpeaker` / `barkSpeakerLabel` (`$lib/data/barks`)
- `pickBark` / `nextBarkDelayMs` / `barksAllowedForPhase` / `eligibleBarkSpeakers` /
  `DEFAULT_BARK_SCHEDULE`
- `shouldShowBark` / `barkLifetimeMs` / `BarkAnnounceHandler` (`barkPresenter`)
- `BarkLiveRegion` — props `speakerLabel`, `line`
- Registry callback `onBark` (set by `StudioFloor` after `createPhaserGame`) —
  payload or `null` to clear; optional `cueId` forwarded, never played

**Tests:** `barks.test.ts`, `barkPicker.test.ts`, `barkPresenter.test.ts`,
`BarkLiveRegion.svelte.test.ts`, `StudioFloor.svelte.test.ts` (live region +
`onBark` registry). Commands: `npm run check`; `npm run lint`; scoped
`npm run test:unit -- --run` on owned files.

**Decisions:**

- Did **not** add `audioEnabled` / `npc-bark` to bridge (boss binding; prefer registry
  so `createGame.ts` stays untouched outside zone).
- Kept StudioFloor boot loading/error/timeout path from this branch; layered bark
  live region beside the canvas.
- Hide-while-prompt + phase pause for generating/critiquing and all non-idle phases.
- Repeat avoidance redraws excluding `lastBarkId` so constant RNG still yields a
  different id.

**Requests:** None.

**Known gaps:**

- E2–E7 catalog extras out of scope.
- Manual Phaser idle timing / bubble follow not exercised headless.
- Spec 21f pathfinding merged separately; bark attach follows Mum/staff sprites.

## 2026-08-01 — Playtest fix P10 (Crayon notice vs active engine)

**Zone:** `src/lib/stores/engineStore.svelte.ts`, `engineStore.svelte.test.ts`,
`CapabilityNotice.svelte` (unchanged), `CapabilityNotice.svelte.test.ts` (unchanged),
`src/routes/+page.svelte` (notice snippet + `capabilityReason`), `stores/README.md`,
`components/README.md`, `docs/agent-log.md`, `docs/playtest-notes.md`

**Built:** Fixed P10 — the Crayon Mode banner no longer stays visible after selecting
Janus or any non-mock engine. Added `EngineStore.showCrayonNotice` derived from
`activeId === 'mock' && !noticeDismissed`. `+page` gates `CapabilityNotice` on that flag
instead of `!realAiSupported`. When real AI is available but the player is still on mock,
`capabilityReason` nudges them to pick an engine from the menu; when unavailable, the
existing WebGPU / My PC reason text is unchanged. Dismiss (`Got it`) still works on mock.

**Public surface:**

- `EngineStore.showCrayonNotice` — `$derived` boolean for the Crayon banner
- `EngineStore.realAiSupported` — unchanged (device capability probe)
- `EngineStore.dismissNotice()` — unchanged

**Tests:** `engineStore.svelte.test.ts` — `showCrayonNotice` on mock, dismiss, and after
`select('janus-webgpu')`; existing `CapabilityNotice.svelte.test.ts` unchanged. Commands:
`npm run check` (0 errors); `npm run lint` green; `npm run test:unit -- --run
src/lib/stores/engineStore.svelte.test.ts
src/lib/components/CapabilityNotice.svelte.test.ts` → 20 passed.

**Decisions:**

- Kept `CapabilityNotice.supported` prop; parent passes `false` whenever mounted (outer
  `{#if engines.showCrayonNotice}` is the sole visibility gate).
- Did not reset `noticeDismissed` when switching back to mock — dismiss is session-scoped
  as before.

**Requests:** None.

**Known gaps:**

- Manual playtest not run in this session (headless tests only).
- Switching back to mock after dismiss does not re-show the banner (intentional).

## 2026-08-01 — Playtest fix P5 (DOM input focus gate)

**Zone:** `src/lib/studio/**`, `StudioFloor.svelte`, `StudioFloor.svelte.test.ts`,
`src/lib/studio/README.md`, `docs/agent-log.md`, `docs/playtest-notes.md`

**Built:** Playtest bug P5 — Phaser no longer consumes WASD/arrow/E while a DOM text
control has focus. Pure helpers detect editable `activeElement`; `StudioFloor` syncs
`focusin`/`focusout` to registry `domEditableFocused`; `StudioScene` disables Phaser
keyboard, stops walk velocity, and skips keyboard interact until focus returns. Touch
on-screen pads still move/interact.

**Public surface:**

- `STUDIO_DOM_EDITABLE_FOCUSED_KEY` — Phaser registry boolean
- `isDomEditableElement(el)` / `isDomEditableFocused(doc?)` (`domInputFocus.ts`)

**Tests:** `domInputFocus.test.ts` (editable selectors + activeElement);
`StudioFloor.svelte.test.ts` (registry sync on input focus/blur). Commands:
`npm run check`; `npm run lint`; `npm run test:unit -- --run src/lib/studio
src/lib/components/StudioFloor.svelte.test.ts`.

**Decisions:**

- Registry mirror (same pattern as `onBark`) — no bridge/`+page` changes.
- `queueMicrotask` after focus events so `activeElement` is settled on blur.
- Keyboard disabled + explicit `#drivePlayer` / `#consumeInteract` guards so stale
  `isDown` cannot move the player after re-enable.

**Requests:** None.

**Known gaps:**

- Manual Phaser walkthrough with live prompt field not run headless.
- Shadow-DOM-only focus edge cases rely on `document.activeElement` (unlikely in HUD).

## 2026-08-01 — Playtest fix P2 + P3 (Phaser camera / zoom)

**Zone:** `src/lib/studio/**`, `StudioFloor.svelte`, `StudioFloor.svelte.test.ts`,
`src/lib/studio/README.md`, `docs/agent-log.md`, `docs/playtest-notes.md`

**Built:** Playtest bugs P2 and P3 — the Phaser canvas no longer grows after boot and the
kitchen shows the full 6×6 floor at 1× with letterbox margins instead of a ~3×3 crop.
Replaced room-sized `scale.resize` + hard `setZoom(2)` with a fixed 420px host,
`Scale.RESIZE` booted from parent size, and `cameraZoomToFitRoom` (cap 1×, zoom out only
when a room exceeds the viewport). P5 DOM keyboard gate unchanged.

**Public surface:**

- `cameraZoomToFitRoom(roomW, roomH, viewportW, viewportH, paddingPx?)` — fit zoom ≤1
- `studioViewportSize(parent)` / `STUDIO_VIEWPORT_DEFAULT_*` — boot viewport from host
- `CAMERA_ZOOM_MAX` — `1` (never magnify small rooms to fill canvas)

**Tests:** `cameraFit.test.ts` (kitchen letterbox, large-room zoom-out, viewport boot);
existing `StudioFloor.svelte.test.ts` + studio suite unchanged. Commands: `npm run check`
(0 errors); `npm run lint` green; `npm run test:unit -- --run src/lib/studio
src/lib/components/StudioFloor.svelte.test.ts` → 18 files / 84 passed.

**Decisions:**

- `Scale.RESIZE` + fixed `h-[420px]` host stops FIT/responsive layout feedback loops (P2).
- Zoom capped at 1× per playtest preference; larger venues still fit at 1:1 or zoom out.
- Half-tile padding in `#applyRoomViewport`; recomputed on `Scale.Events.RESIZE`.
- Removed `scale.resize(roomPx)` entirely — world bounds only.

**Requests:** None.

**Known gaps:**

- Manual Phaser walkthrough (kitchen vs garage vs museum camera) not run headless.
- Touch-pad positions are fixed at first build; window resize after boot does not
  reposition pads (pre-existing; coarse-pointer only).

## 2026-08-01 — Playtest fix P1 (progression HUD layout)

**Zone:** `ProgressMeter.svelte`, `ProgressMeter.svelte.test.ts`, `HudBar.svelte`,
`HudBar.svelte.test.ts`, `ProgressPanel.svelte`, `ProgressPanel.svelte.test.ts`,
`GameMenuBar.svelte`, `components/README.md`, `docs/agent-log.md`, `docs/playtest-notes.md`

**Built:** Fixed P1 — progression HUD no longer stacks unreadable text. `ProgressMeter`
compact variant puts the hint on the label row (one line + bar). `HudBar` compact drops
duplicate rep line, uses unlock name as the reputation meter label, and stacks career/skill
grids single-column until 520px. `GameMenuBar` places `HudBar` full-width below menu
buttons instead of beside them. `ProgressPanel` removes redundant standing copy and folds
skill taglines into each meter hint.

**Public surface:** Unchanged props/callbacks on all four components.

**Tests:** `ProgressMeter`, `HudBar`, `ProgressPanel`, `GameMenuBar` component tests
(23 passed). Commands: `npm run check` (0 errors); `npm run lint` green;
`npm run test:unit -- --run src/lib/components/ProgressMeter.svelte.test.ts
src/lib/components/ProgressPanel.svelte.test.ts src/lib/components/HudBar.svelte.test.ts
src/lib/components/GameMenuBar.svelte.test.ts`.

**Decisions:**

- Kept stone/amber styling; layout-only fix, no visual redesign.
- Reputation in compact HUD uses `reputationMeter.label` (next unlock) with
  `remainingLabel` as the inline hint — avoids "Reputation" + unlock name + "Rep N" pile-up.
- Career/skill grids use `min-[520px]:grid-cols-3` so narrow viewports get one meter per row.

**Requests:** None.

**Known gaps:**

- Manual playtest not run in this session (headless tests only).
- Very long unlock names still truncate with `title` tooltip; full name visible in Progress panel.

## 2026-08-01 — Playtest fix P4 (early economy rebalance)

**Zone:** `src/lib/data/kitchenBriefs.ts`, `kitchenBriefs.test.ts`, `mediumTiers.ts`,
`mediumTiers.test.ts`, `galleryVenues.ts`, `galleryVenues.test.ts`,
`src/lib/game/scoring.test.ts`, `src/lib/data/README.md`, `docs/agent-log.md`,
`docs/playtest-notes.md`

**Built:** Playtest P4 — Mum kitchen commissions no longer shower the player with cash.
Kitchen walk-in `budget` values rebased to **$5–8** (Mum openers at **$5–6**) so
`calculatePayout` yields **~$5** on a perfect score without changing the formula.
Early unlocks retuned: pencil **$15** (~3 Mum jobs), garage wall **$30**; mid/late medium
and venue tiers scaled down proportionally while keeping reputation gates and multiplier
ladder order intact.

**Public surface:** Unchanged exports and signatures. Data-only changes to
`KITCHEN_BRIEFS`, `MEDIUM_TIERS`, `GALLERY_VENUES` field values.

**Tests:** `kitchenBriefs.test.ts` (Mum budget band), `mediumTiers.test.ts`,
`galleryVenues.test.ts`, `scoring.test.ts` (literal payout rows + perfect-Mum $5 case).
Commands: `npm run check`; `npm run lint`; `npm run test:unit -- --run src/lib/data
src/lib/game/scoring.test.ts`.

**Decisions:**

- Left `calculatePayout` untouched — `brief.budget` is the sole kitchen payout knob.
- Budget ≈ max payout by design; sibling agent may force 10/10 Mum scores (P7), so caps
  stay tight rather than relying on average scores.
- Prestige brief pools (corporate/billionaire/auction) unchanged — out of P4 scope.

**Requests:** None.

**Known gaps:**

- Manual playtest not run in this session (headless tests only).
- `LEVEL_1.targetCash` and gallery layout/atmosphere costs may still feel high relative
  to the rebased kitchen ladder — tune in a follow-up if progression HUD still misleads.

## 2026-08-01 — Playtest fix P7 (Mum praise + hidden real critique)

**Zone:** `src/lib/data/mumPraise.ts`, `mumPraise.test.ts`, `src/lib/game/mumCritiquePresentation.ts`,
`mumCritiquePresentation.test.ts`, `ResultsPanel.svelte`, `ResultsPanel.svelte.test.ts`,
`StudioHudOverlay.svelte`, `StudioHudOverlay.svelte.test.ts`, `gameState.svelte.ts`,
`gameState.svelte.test.ts`, `+page.svelte`, component/game/data READMEs, `docs/agent-log.md`,
`docs/playtest-notes.md`

**Built:** Playtest P7 — Mum commissions now default to toddler-style praise and **10/10**
Accuracy/Creativity on the results panel. Engine/Janus critique is preserved in
`GameStore.mumRealCritique` and revealed via an **Ask for real critique** button (harsh
contrast = comedy). Payout, skill preview, and gallery scores use the 10/10 display values
so cash matches the joke; non-Mum clients unchanged. Eight-line seeded praise pool in
`mumPraise.ts`.

**Public surface:**

- `MUM_PRAISE_POOL`, `pickMumPraise(seed)` — praise lines
- `isMumCommission(clientName)`, `captureMumRealCritique(draft, creativityScore)`,
  `MUM_DISPLAY_SCORE`, `MumRealCritique`, `praiseSeedFromArtworkId(id)`,
  `pickMumPraiseLine(seed)`
- `GameStore.mumRealCritique` — engine verdict for reveal; cleared on invite/collect/reset
- `ResultsPanel` prop `mumRealCritique?`; `StudioHudOverlay` passes it through

**Tests:** `mumPraise`, `mumCritiquePresentation`, `ResultsPanel` (praise + reveal),
`StudioHudOverlay` (pass-through), `GameStore` (Mum 10/10 payout + real snapshot). Commands:
`npm run check` (0 errors); `npm run lint` green; `npm run test:unit -- --run`
(scoped files above) → 5 files / 88 passed.

**Decisions:**

- Presentation-only layer — engines untouched; real scores stored separately for reveal.
- Praise picked from artwork id hash so the same piece always gets the same line.
- `currentCritique` stores display scores (10/10 for Mum) so payout/rep/skill preview stay
  consistent without duplicating payout math in the UI.
- Reset `realCritiqueRevealed` when `mumRealCritique` changes (new commission).

**Requests:** None.

**Known gaps:**

- Manual kitchen playthrough not run headless (praise + reveal button only tested in
  component tests).
- Kitchen budgets now ~$5 via merged P4 — max Mum payout matches the praise joke.
- Auction-house Mum briefs (if any) would not get Mum praise override (walk-in only today).

## 2026-08-01 — Playtest design P6 (paint while waiting + submit choice)

**Zone:** `SketchCanvas*`, `StudioHudOverlay*`, `ResultsPanel*` (unchanged), `gameState*`, `submitChoice.ts`, `+page.svelte`, component/store/game READMEs, `docs/playtest-notes.md`, `docs/agent-log.md`

**Built:** Playtest P6 MVP — after the player submits a prompt, `SketchCanvas` stays interactive during `generating` so they can paint while the engine works. When generate completes (still phase `generating`, `pendingSubmitChoice`), the HUD shows the AI preview plus **Submit AI image** / **Submit your drawing** (disabled when blank). `confirmSubmitChoice` swaps `artwork.imageUrl` if needed, then runs critique/payout on the chosen image. Mum praise (P7), P5 focus gate, and P10 crayon notice preserved. Spec 11 briefing sketch → `sketchImage` generate path deferred in favour of paint-while-waiting (orchestrator may restore BAGEL pre-sketch later).

**Public surface:**

- `SubmitChoice`, `artworkForSubmitChoice`, `blobToDataUrl` — `$lib/game/submitChoice`
- `GameStore.pendingSubmitChoice`, `GameStore.aiGeneratedImageUrl`, `GameStore.confirmSubmitChoice(choice, sketchBlob)`
- `StudioHudOverlay` props `pendingSubmitChoice`, `aiGeneratedImageUrl`, `onconfirmsubmit`

**Tests:** `submitChoice.test.ts`, `gameState` (submit-choice + drawing URL swap + Mum 10/10), `StudioHudOverlay` (generating canvas + choice UI), existing `SketchCanvas` / `ResultsPanel`. Commands: `npm run check` (0 errors); `npm run lint` green; `npm run test:unit -- --run` (scoped files above) → 5 files / 93 passed.

**Decisions:**

- No `contracts.ts` / `GamePhase` change — submit choice is sub-state on `generating` via `pendingSubmitChoice`.
- Engine lock held from `createArt` through `confirmSubmitChoice` (or generate failure).
- Canvas kept mounted (visually hidden) during choice so PNG export still works.
- Prompt-only `generate()` for P6; player drawing is submit-time only, not BAGEL edit input.

**Requests:** None.

**Known gaps:**

- Manual playthrough not run (headless/component tests only).
- Spec 11 optional briefing sketch → `sketchImage` on generate not wired in P6 flow; needs product call if both loops should coexist.
- Mock engine still returns procedural SVG for prompt-only generate — player drawing vs AI contrast is visual, not semantic, in Crayon Mode.

## 2026-08-01 — Orchestrator: LEVEL_1 cash goals after P4

**Zone:** src/lib/types/contracts.ts (orchestrator-owned), level/HUD tests, docs/playtest-notes.md

**Built:** After P4 kitchen ~$5 jobs, LEVEL_1.startingCash **100→25** and 	argetCash **500→50** so the win meter matches Mum commissions (pencils $15, garage $30). Updated levelRules,
extUnlock, HudBar/GameMenuBar/ProgressPanel/LevelCompleteOverlay tests.

**Requests:** None.

**Known gaps:** Gallery layout/atmosphere mid-tier prices may still dwarf kitchen cash — playtest if needed.

## 2026-08-01 — Spec 24 MVP (artist team & major projects)

**Zone:** `docs/tasks/24-artist-team.md`, `docs/tasks/README.md`, `docs/playtest-notes.md`,
`docs/agent-log.md`, `src/lib/data/artists*`, `majorProjects*`, `src/lib/game/artistTraining*`,
`assignCommission*`, `majorProjectProgress*`, `save*`, `gameState*`, `ReceptionDesk*`,
`TeamRoster*`, `AssignArtistModal*`, `MajorProjectPanel*`, `StaffOffice*`, `GameMenuBar*`,
`components/index.ts`, `studio/bridge*`, `scenes/StudioScene.ts`, `staffPresence*`,
`interactPrompt*`, `+page.svelte`, directory READMEs under owned zones.

**Built:** Spec 24 MVP A1–A3 + B1–B3 + C1–C3 + D1–D4. Receptionist NPC (garage+) opens
`ReceptionDesk` with 2–4 board offers; parallel `hiredArtists[]` roster with hire/fire/training;
assign brief → simulated timer → mock artwork results; comic (4 beats, $120) and animated
series (6 beats, $180) major projects with crew assignment and collect payout. Playtest P8/P9
marked fixed. Spec 16 idle income and Mum kitchen loop unchanged.

**Public surface:**

- `receptionistUnlocked`, `ARTIST_CATALOG`, `MAJOR_PROJECTS`, training/timer helpers
- `GameStore.pickCommissionBoardOffers`, `acceptBoardBrief`, `hireArtist`, `fireArtist`,
  `assignBriefToArtist`, major-project APIs
- `StudioBridge` event `open-reception`; snapshot `receptionistVisible`
- Components: `ReceptionDesk`, `TeamRoster`, `AssignArtistModal`, `MajorProjectPanel`

**Tests:** Scoped suite 142+ tests. Commands: `npm run check`; `npm run lint`;
`npm run test:unit -- --run` (paths in spec §Verification).

**Decisions:**

- Receptionist unlock = venue ≥ garage (not marketing hire).
- Artists parallel to spec 16 staff; save v1 Zod defaults for new fields.
- Assignment timer crayon L1 = 6800ms; artist completion uses mock SVG + level-scaled scores.
- Major project beats use separate timer track from commission assignment.

**Requests:** None.

**Known gaps:**

- Manual playthrough not run (headless/component tests only).
- B4 artist floor desks, C4 parallel jobs, D5 continuity deferred.
- Full major-project beat loop to payout requires playing through all beats in UI (no dev skip).

## 2026-08-01 — Playtest fix P11 (DOM prompt typing / Phaser capture)

**Zone:** `src/lib/studio/**`, `StudioFloor.svelte`, `StudioFloor.svelte.test.ts`,
`src/lib/studio/README.md`, `docs/agent-log.md`, `docs/playtest-notes.md`

**Built:** Playtest bug P11 (P5 regression) — focusing the HUD prompt (or any DOM text
control) now lets letters and WASD reach the field instead of moving the Phaser player.
Root cause: `addKeys` / `createCursorKeys` register global key captures whose
`preventDefault` runs in `KeyboardManager` even when the scene plugin is disabled.
`applyDomEditableKeyboardGate` calls `disableGlobalCapture` + `resetKeys` while focused
and restores capture on blur; `StudioFloor` blurs the game canvas on focus-in so
keystrokes target the editable control. Touch pads unchanged.

**Public surface:**

- `applyDomEditableKeyboardGate(keyboard, focused)` — toggles plugin + global capture
- Existing `STUDIO_DOM_EDITABLE_FOCUSED_KEY`, `isDomEditableFocused` unchanged

**Tests:** `domInputKeyboardGate.test.ts` (capture toggle); `StudioFloor.svelte.test.ts`
(registry sync + canvas blur); existing `domInputFocus.test.ts`. Commands: `npm run check`;
`npm run lint`; `npm run test:unit -- --run src/lib/studio
src/lib/components/StudioFloor.svelte.test.ts`.

**Decisions:**

- Phaser-recommended `disableGlobalCapture` / `enableGlobalCapture` pair — preserves
  capture list without re-registering keys on blur.
- Canvas blur in `StudioFloor` (not scene) — keeps focus sync co-located with registry
  writes; scene still gates `#drivePlayer` / `#consumeInteract`.

**Requests:** None.

**Known gaps:**

- Manual Phaser walkthrough with live prompt field not run headless.
- Letter keys were never captured; only WASD/arrows/E — regression was capture + movement.

## 2026-08-01 — Playtest 2 fix P13 (keep drawing; AI below canvas)

**Zone:** `StudioHudOverlay*`, `SketchCanvas*` (unchanged), `gameState*` (unchanged),
component/store READMEs, `docs/playtest-notes.md`, `docs/agent-log.md`

**Built:** Playtest P13 fix — when `pendingSubmitChoice` becomes true after generate
completes, `SketchCanvas` no longer moves into `sr-only` (which hid the drawing and
blocked painting). Canvas stays mounted and interactive on top; `ArtworkFrame` AI preview
stacks below with submit-choice buttons. Copy updated to “keep painting or choose what to
submit”. P6 `confirmSubmitChoice`, P7 Mum praise, and Spec 24 menu wiring unchanged.

**Public surface:** No API changes — layout-only fix in `StudioHudOverlay` generating branch.

**Tests:** `StudioHudOverlay.svelte.test.ts` — submit-choice case now asserts sketch canvas
visible, AI image follows canvas in DOM, and buttons still fire `onconfirmsubmit`.

**Decisions:**

- Removed `sr-only` / `aria-hidden` wrapper instead of toggling visibility — canvas must
  remain visually interactive, not merely mounted for export.
- No `gameState` changes; `pendingSubmitChoice` sub-state on `generating` unchanged.

**Requests:** None.

**Known gaps:**

- Manual playthrough not run (component tests only).
- P6 handoff note “canvas kept mounted (visually hidden)” superseded by this fix.

## 2026-08-01 — Playtest 2 fix P12 (kitchen zoom ×4 / centering)

**Zone:** `src/lib/studio/**`, `StudioFloor.svelte`, `StudioFloor.svelte.test.ts`,
`src/lib/studio/README.md`, `docs/agent-log.md`, `docs/playtest-notes.md`

**Built:** Playtest P12 — kitchen no longer sits in the top-left corner with empty void.
Raised `CAMERA_ZOOM_MAX` to **4** so the 6×6 floor magnifies up to user-requested ×4;
added `cameraLetterboxBounds` + `cameraRoomCenter` so `#applyRoomViewport` expands camera
bounds and centers on the room midpoint (physics bounds stay room-sized). P11 DOM keyboard
gate unchanged.

**Public surface:**

- `CAMERA_ZOOM_MAX` — `4`
- `cameraZoomToFitRoom(...)` — fit zoom capped at 4×
- `cameraRoomCenter(roomW, roomH)` — world midpoint for centering
- `cameraLetterboxBounds(roomW, roomH, viewportW, viewportH, zoom)` — symmetric scroll bounds

**Tests:** `cameraFit.test.ts` (kitchen 4× zoom, letterbox bounds, large-room zoom-out,
room center); existing studio suite + `StudioFloor.svelte.test.ts`. Commands: `npm run check`,
`npm run lint`, `npm run test:unit -- --run src/lib/studio
src/lib/components/StudioFloor.svelte.test.ts`.

**Decisions:**

- Top-left bias was camera bounds clamped to room size — expanded bounds allow negative
  scroll offset for letterbox centering without moving tile content.
- Still no `scale.resize(roomPx)` — P2 growth loop remains fixed.
- Half-tile padding retained; viewport recomputed on `Scale.Events.RESIZE`.

**Requests:** None.

**Known gaps:**

- Manual Phaser walkthrough (kitchen vs garage vs museum camera) not run headless.
- Touch-pad positions still fixed at first build on resize (pre-existing).

## 2026-08-01 — Playtest 2 fix P15 (artwork / critique titles)

**Zone:** `ResultsPanel*`, `ArtworkFrame*`, `StudioHudOverlay*` (title display only),
`src/lib/engines/mock/**`, component README, `docs/playtest-notes.md`, `docs/agent-log.md`

**Built:** Playtest P15 fix — results headings and artwork captions now use `break-words`
with full-width layout and native `title` tooltips instead of single-line clipping.
Mock engine uses new `buildMockTitle` (five meaningful prompt words, still capped at 120
chars) so crayon-mode titles read less abruptly than the shared protocol's two-word
default. P7 Mum praise/reveal and P13 stacked submit-choice layout unchanged.

**Public surface:** `buildMockTitle(playerPrompt, seed)` in `$lib/engines/mock/buildMockTitle.ts`
(used by `MockEngine.critique` only).

**Tests:** `buildMockTitle.test.ts`; long-title cases in `ArtworkFrame`, `ResultsPanel`,
`StudioHudOverlay` component tests. Commands: `npm run check`; `npm run lint`;
`npm run test:unit -- --run src/lib/components/ResultsPanel.svelte.test.ts
src/lib/components/ArtworkFrame.svelte.test.ts src/lib/components/StudioHudOverlay.svelte.test.ts
src/lib/engines/mock/buildMockTitle.test.ts`.

**Decisions:**

- UI-first: no `truncate` / `line-clamp` on results titles — wrap fully within the HUD column.
- Mock-only title length bump; Janus/remote still call shared `buildTitle` (two words) —
  orchestrator may align protocol later if needed.

**Requests:** Consider raising `buildTitle` word limit in `critiqueProtocol.ts` for
non-mock engines so installed-model critiques match mock title richness.

**Known gaps:**

- Manual playthrough not run (component + unit tests only).
- Portfolio/fridge gallery thumbs still use single-line `truncate` (out of zone).

## 2026-08-01 — Playtest 2 fix P18 (decline commissions)

**Zone:** `gameState.svelte*`, `ReceptionDesk*`, `StudioHudOverlay*`, `+page.svelte`,
`src/lib/stores/README.md`, `src/lib/components/README.md`, `docs/playtest-notes.md`,
`docs/agent-log.md`

**Built:** Playtest P18 — player can decline active commissions during briefing and dismiss
the receptionist board without accepting. `GameStore.declineClient()` clears briefing state,
returns to idle, reschedules auto-invite, and skips payout/reputation changes. Briefing HUD
shows **No thanks**; reception desk footer **No thanks** closes the board (header Close
unchanged). `+page` wires `ondecline` → `declineClient()` + `dismiss-client` bridge event.

**Public surface:**

- `GameStore.declineClient(): void` — briefing-only; clears client/draft/assignment
- `StudioHudOverlay` — optional `ondecline?: () => void` (briefing phase)
- `ReceptionDesk` — footer **No thanks** calls existing `onclose()`

**Tests:** `gameState.svelte.test.ts` (`declineClient` happy path + phase guard);
`ReceptionDesk.svelte.test.ts` (footer no thanks); `StudioHudOverlay.svelte.test.ts`
(briefing decline callback). Commands: `npm run check`; `npm run lint`;
`npm run test:unit -- --run src/lib/stores/gameState.svelte.test.ts
src/lib/components/ReceptionDesk.svelte.test.ts
src/lib/components/StudioHudOverlay.svelte.test.ts`.

**Decisions:**

- No separate `declineBrief()` store method — board offers are local UI until accepted;
  closing the dialog is sufficient.
- No reputation penalty on decline (none in data model).
- Decline limited to `briefing` phase — mid-generation abort out of scope.

**Requests:** None.

**Known gaps:**

- Manual playthrough not run (component + unit tests only).
- Assign-artist modal stays open only if parent forgets to close — `+page` closes it on decline.

## 2026-08-01 — Playtest 2 fix P14 (medium stall copy)

**Zone:** `src/lib/data/stallMessages*`, `StudioHudOverlay*`, `+page.svelte` (prop pass-through),
`src/lib/data/README.md`, `src/lib/components/README.md`, `docs/playtest-notes.md`, `docs/agent-log.md`

**Built:** Playtest P14 — critiquing no longer shows sole “Waiting for the commissioner” copy.
New `$lib/data/stallMessages` pools ≥4 lines per medium tier (crayon through oil) plus a
fallback; `StudioHudOverlay` derives `stageLabel` (“Finishing up”) and rotating stall lines
from `activeMediumTierId` + artwork id seed. `+page` passes `game.activeMediumTierId`.
P13 stacked canvas/AI and P15 title wrapping unchanged.

**Public surface:**

- `STALL_COPY_BY_MEDIUM`, `FALLBACK_STALL_COPY`
- `getStallCopy(mediumTierId)`, `getStallStageLabel(mediumTierId)`
- `stallSeedFromArtworkId(artworkId)`, `rotateStallMessages(messages, seed)`
- `stallMessagesForArtwork(mediumTierId, artworkId): string[]`
- `StudioHudOverlay` prop `activeMediumTierId?: string` (defaults to crayon)

**Tests:** `stallMessages.test.ts`; critiquing stall case in `StudioHudOverlay.svelte.test.ts`.
Commands: `npm run check`; `npm run lint`;
`npm run test:unit -- --run src/lib/data/stallMessages.test.ts src/lib/components/StudioHudOverlay.svelte.test.ts`.

**Decisions:**

- Kept `critiqueMessages` prop for API stability; critiquing branch ignores environment pool.
- `environments.critiqueMessages` left in place (orchestrator may prune later).
- Seeded rotation reuses artwork-id hash pattern from Mum praise selection.

**Requests:** None.

**Known gaps:**

- Manual playthrough not run (component + unit tests only).
- Generating-phase loading copy still uses environment `loadingMessages`, not medium stall pools.

## 2026-08-01 — Spec 25 MVP (brush types & painting medium — P16)

**Zone:** `brushProfiles*`, `brushStroke*`, `SketchCanvas*`, `StudioHudOverlay*`, `+page.svelte`,
`src/lib/data/README.md`, `src/lib/game/README.md`, `src/lib/components/README.md`,
`docs/tasks/25-brush-media.md`, `docs/tasks/README.md`, `docs/playtest-notes.md`, `docs/agent-log.md`

**Built:** Playtest P16 / Spec 25 MVP — painting medium picker during `generating` on
`StudioHudOverlay` (emoji buttons, locked tiers disabled with cash/rep tease). Selection
defaults to and syncs with `activeMediumTierId` via `setActiveMediumTier`. `SketchCanvas`
accepts `mediumTierId` and applies distinct brush profiles for crayon (grain), pencil (thin),
ink (bleed on lift), and watercolour (soft wash). Acrylic/oil use generic fallback profiles.
PNG export unchanged for P6 submit choice.

**Public surface:**

- `$lib/data/brushProfiles` — `BrushProfile`, `getBrushProfile`, `MVP_BRUSH_MEDIUM_IDS`, `isMvpBrushMedium`
- `$lib/game/brushStroke` — `applyBrushStrokeStyle`, `effectiveBrushSize`, `stampCrayonGrain`, `stampInkBleed`, `grainSeed`, `resetBrushContext`
- `SketchCanvas` prop `mediumTierId?: string`
- `StudioHudOverlay` props `unlockedMediumTierIds?`, `cash?`, `reputation?`, callback `onselectmedium?(id)`

**Tests:** `brushProfiles.test.ts`, `brushStroke.test.ts`, `SketchCanvas.svelte.test.ts`,
`StudioHudOverlay.svelte.test.ts` (picker select + locked disable). Commands: `npm run check`;
`npm run lint`; `npm run test:unit -- --run src/lib/data/brushProfiles.test.ts
src/lib/components/SketchCanvas.svelte.test.ts src/lib/components/StudioHudOverlay.svelte.test.ts`.

**Decisions:**

- Painting medium always equals Toolkit active tier — picker calls `setActiveMediumTier` (no divergent per-commission state).
- Watercolour MVP = low opacity + `shadowBlur`; no wet-map sim.
- Crayon grain = coordinate-seeded dot stamps (deterministic in tests).
- A3 locked grey-out included in MVP per orchestrator prompt.

**Requests:** None.

**Known gaps:**

- Manual playthrough not run (component + unit tests only).
- Spec 25c polish (cursor preview, medium-specific eraser, SFX) deferred.
- B5 oil/acrylic use generic profiles until a later slice.
