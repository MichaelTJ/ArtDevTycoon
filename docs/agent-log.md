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
