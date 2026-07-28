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
