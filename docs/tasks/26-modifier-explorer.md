# Spec 26 — Modifier / engine explorer

**Status:** MVP shipped (retrospective catalog). Code lives under
`src/lib/modifier-explorer/**` and `src/routes/modifier-explorer/**` (durable gallery +
Vite plugin). Prompt battery may receive Janus-focused refreshes outside formal waves —
keep this catalog current when explorer APIs change.
**Depends on:** Specs **02** (engine interface), **05** (Janus WebGPU), **06** (SD-Turbo,
optional comparison). Independent of progression / studio floor.
**Priority:** Contributor / content tooling — not part of the player Level 1 loop.

## Mission

Give designers and engine owners a **dev-only lab** to compare how different art engines
handle the same curated prompt set — especially the four skill axes used to shape Level 1
modifiers (style, subject, lighting, detail).

Primary use today: **Janus**, because one stack can both:

1. **Generate** images from prompts (WebGPU / JanusLink later), and
2. **Analyse / critique** those images (same model family — game critique path).

SD-Turbo remains a second generation baseline for side-by-side quality and timing. The
explorer does **not** change in-game engine selection; it has its own `ExplorerEngineId`
list and persists outputs under `data/modifier-explorer/`.

Still no production server for players: the Vite plugin only serves save/manifest APIs
during `npm run dev`.

## Player / operator fantasy

- Open `/modifier-explorer` in a WebGPU browser while the app is in Vite dev.
- Batch-run ~`EXPLORER_CASE_COUNT` prompt cases on Janus and/or SD-Turbo.
- Browse results by axis level, mood, engine; mark “good” facet tags on images that look
  right so content work can mine winners.
- Read per-engine timing stats (inference + wall clock) to judge capability, not just look.

## Catalog

### A. Prompt lab — shipped

| ID  | Feature                         | Notes                                                                                       | Status   |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------- | -------- |
| A1  | Curated prompt cases            | Axes 1→5 on style / subject / lighting / detail + mood (+ optional tech); formula-mix cases | **Done** |
| A2  | Faceted `PromptFacets` on cases | Exact keys for filtering (`style:crayon`, `lighting:chiaroscuro`, …)                        | **Done** |
| A3  | Batch runner                    | `runExplorerBatch` loads engine, generates, PNG-encodes, saves via plugin                   | **Done** |
| A4  | Skip existing                   | Resume batches without regenerating known `caseId`s per engine                              | **Done** |

### B. Browse & judgement — shipped

| ID  | Feature              | Notes                                                           | Status   |
| --- | -------------------- | --------------------------------------------------------------- | -------- |
| B1  | Filter / group UI    | Engine, category, axis keys/levels, mood, text; row presets     | **Done** |
| B2  | Good-tag picks       | Persist `goodTags` on results; filter picked / unpicked         | **Done** |
| B3  | Timing stats         | Per-engine avg / totals from `generationMs` / `totalMs`         | **Done** |
| B4  | Durable disk gallery | `data/modifier-explorer/manifest.json` + per-engine PNG folders | **Done** |

### C. Engine coverage — shipped + deferred

| ID  | Engine / path              | Role                                                       | Status       |
| --- | -------------------------- | ---------------------------------------------------------- | ------------ |
| C1  | `janus-webgpu`             | Primary explore target (gen now; critique next)            | **Done**     |
| C2  | `sdturbo-webgpu`           | Second gen baseline + timing                               | **Done**     |
| C3  | Janus **critique pass**    | Run analyse/critique on saved images; store scores / notes | **Deferred** |
| C4  | JanusLink / remote engines | Optional third engine id when My PC is configured          | Deferred     |
| C5  | Mock engine                | Fast CI smoke only if needed                               | Deferred     |

### D. Polish — deferred

| ID  | Feature                        | Notes                                   | Priority |
| --- | ------------------------------ | --------------------------------------- | -------- |
| D1  | Side-by-side same `caseId`     | Janus vs SD-Turbo pair view             | Later    |
| D2  | Export good-tag shortlist JSON | Feed medium-tier / brief authoring      | Later    |
| D3  | Production-safe gate           | Hide route or hard-404 outside Vite DEV | Later    |

## Ownership (already on main)

```
Owns:
  src/lib/modifier-explorer/**          (+ unit tests)
  src/routes/modifier-explorer/**       (+page, +page.ts)
  data/modifier-explorer/**             (gitignored outputs / local gallery)
  vite.config.ts                        (registers modifierExplorerPlugin — already wired)

Docs:
  docs/tasks/26-modifier-explorer.md
  docs/tasks/README.md
```

**MUST NOT** treat this page as part of the player HUD. Do not import explorer modules into
`GameStore` / `StudioHudOverlay`. Prompt cases may _inspire_ Spec 13 medium comedy; they
are not the live Level 1 modifier string unless a later slice copies winners over.

## Definition of done (MVP)

- [x] A1–A4 prompt lab + batch runner
- [x] B1–B4 browse, good tags, timing, durable gallery
- [x] C1–C2 Janus + SD-Turbo generate paths
- [x] Unit tests for picks / prompts / browse / timing
- [ ] C3 Janus critique pass on gallery images (next useful slice)
- [x] Spec + README catalog entry (this doc)

## Open decisions

1. **Critique focus stays Janus-first** — SD-Turbo has no in-repo critique path; C3 should
   call the same critique surface the game uses (`ArtEngine.critique` / Janus worker).
2. Explorer engine selection stays **isolated** from `EngineStore` so lab runs do not
   mutate the player’s active engine mid-session.
3. Gallery persistence is **dev-machine local** (`data/modifier-explorer/`), not career saves.

## How to use

```text
npm run dev
→ open /modifier-explorer
→ Run Janus Pro 1B (or both engines)
→ Filter / group / mark good tags
```

WebGPU required for real engines. Without it, use the game’s mock path separately — the
explorer MVP does not auto-fall back to mock.

## Sibling: `/modifier-explorer2`

Fresh discovery series (does not replace explorer 1). Code: `src/lib/modifier-explorer2/**`,
`src/routes/modifier-explorer2/**`, gallery `data/modifier-explorer2/`.

| Round | Goal                                   | Count         |
| ----- | -------------------------------------- | ------------- |
| 1     | Object vocabulary (common → very-rare) | 100 × 3 = 300 |
| 2     | “Simple” style words × working objects | 30 × 3 = 90   |

After Round 1, mark good `subject:*` tags and edit `WORKING_SUBJECT_KEYS` in
`prompts.ts` before running Round 2.
