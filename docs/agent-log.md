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
