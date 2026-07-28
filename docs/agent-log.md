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
  local model that can actually *see* the finished image, which makes the critic score
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
