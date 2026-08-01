# Spec 21 — Boss / orchestrator plan

**Owner:** parent (boss) agent. Re-read this file at the start of every turn.
**User constraint:** **Do not merge** to `main`. Leave branches for human review.
**All agents:** follow `best-practices.md` (read-first list, ownership zones, no
`npm install`, no state-changing git from task agents).

---

## Goal

1. Promote `21-living-studio.md` into six implementable specs: **21a–21f**.
2. Implement them on **separate branches / worktrees**.
3. Orchestrator may **commit on those branches** after review of agent handoff; **never
   merge** until the user approves.

---

## Status board

| Step | Item                         | Status   | Branch / worktree                  | Notes                                                                               |
| ---- | ---------------------------- | -------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| 0    | Boss plan (this file)        | **done** | main (docs)                        |                                                                                     |
| 1a   | Spec doc `21a-living-npcs`   | **done** | `docs/tasks/21a-living-npcs.md`    | [21a spec](89a07466-aa15-484e-bd54-96134c47a135)                                    |
| 1b   | Spec doc `21b-interactables` | **done** | `docs/tasks/21b-interactables.md`  | [21b spec](2674d441-6fc8-466a-8d35-2cc629bb6860)                                    |
| 1c   | Spec doc `21c-studio-audio`  | **done** | `docs/tasks/21c-studio-audio.md`   | [21c spec](d1545054-0a58-4033-8a94-abb146baa129) — `adt.audio.v1`, no snapshot mute |
| 1d   | Spec doc `21d-studio-vfx`    | **done** | `docs/tasks/21d-studio-vfx.md`     | [21d spec](87d43f51-e808-4b40-ac81-157683e28890)                                    |
| 1e   | Spec doc `21e-ambient`       | **done** | `docs/tasks/21e-ambient-events.md` | [21e spec](e45ff643-3fb3-4612-b74a-ff3ccd5cd98a)                                    |
| 1f   | Spec doc `21f-studio-qol`    | **done** | `docs/tasks/21f-studio-qol.md`     | [21f spec](2d3f129b-2cb2-4d11-b564-a71ee8689cf5)                                    |

**Phase 1 complete** (all six specs). Bridge extras from 21b (frozen for R2): outbound `open-shop`, `prop-bark`.
| 2 | Index README + living-studio | **done** | main (docs) | 21a–21f rows + Wave G+ |
| 3 | Bridge field freeze | **decided** | lands **inside 21a** on `agent/living-npcs` | see Boss decisions |
| 4a | Implement 21a | **ready_for_review** | `../adt-wt-living-npcs` / `agent/living-npcs` @ `b75ff58` | [21a impl](c450f1e5-f3d6-499f-a4be-7c7232dd0374) — **not merged** |
| 4b | Implement 21b | **ready_for_review** | `../adt-wt-interactables` / `agent/interactables` @ `40285ce` | [21b impl](497ac37e-08e1-403b-9385-849d1d43f4d8) — **not merged** |
| 4c | Implement 21c | **ready_for_review** | `../adt-wt-studio-audio` / `agent/studio-audio` @ `ae10048` | [21c impl](09166ad2-50c8-4f75-8df9-bbae80c5e691) — **not merged** |
| 4d | Implement 21d | **ready_for_review** | `../adt-wt-studio-vfx` / `agent/studio-vfx` @ `18268b2` | [21d impl](d689b1a4-6808-4e53-a3e2-0527a4bd051d) — **not merged** |
| 4e | Implement 21e | **ready_for_review** | `../adt-wt-studio-ambient` / `agent/studio-ambient` @ `4876966` | [21e impl](d5c0e68a-7735-431c-8b69-0e8e6ed96559) — **not merged** |
| 4f | Implement 21f | **ready_for_review** | `../adt-wt-studio-qol` / `agent/studio-qol` @ `bf1c11f` | [21f impl](fe362833-c3c7-4ad7-b817-05b3d3232ef6) — **not merged** |

### Stack tip (full Wave G–I chain — review this tip to see everything)

`agent/studio-ambient` contains 21a→21b→21c→21d→21f→21e as a linear stack.
Prefer reviewing **that tip** end-to-end; intermediate branches are also kept for per-slice diffs.

| Slice | Branch                 | Worktree                   | Tip (at handoff) |
| ----- | ---------------------- | -------------------------- | ---------------- |
| 21a   | `agent/living-npcs`    | `../adt-wt-living-npcs`    | `b75ff58`        |
| 21b   | `agent/interactables`  | `../adt-wt-interactables`  | `40285ce`        |
| 21c   | `agent/studio-audio`   | `../adt-wt-studio-audio`   | `ae10048`        |
| 21d   | `agent/studio-vfx`     | `../adt-wt-studio-vfx`     | `18268b2`        |
| 21f   | `agent/studio-qol`     | `../adt-wt-studio-qol`     | `bf1c11f`        |
| 21e   | `agent/studio-ambient` | `../adt-wt-studio-ambient` | `4876966`        |

**Phase 2 complete.** No merges to `main`. Awaiting user approval per branch / tip.

**Legend:** `pending` → `in_progress` → `ready_for_review` (committed on branch) → `approved` (user).

---

## Phase 1 — Spec authorship (current)

Spawn **six** sub-agents in parallel. Each owns **only** its markdown file under
`docs/tasks/`. No code. No git. No README edits (boss updates index after).

| Agent | Writes                             | Source rows in `21-living-studio.md` |
| ----- | ---------------------------------- | ------------------------------------ |
| S1    | `docs/tasks/21a-living-npcs.md`    | §A + shortlist A1, A2                |
| S2    | `docs/tasks/21b-interactables.md`  | §B + shortlist B1, B2, B5            |
| S3    | `docs/tasks/21c-studio-audio.md`   | §C + shortlist C1, C3, C4, C8        |
| S4    | `docs/tasks/21d-studio-vfx.md`     | §D + shortlist D3, D4                |
| S5    | `docs/tasks/21e-ambient-events.md` | §E + shortlist E1                    |
| S6    | `docs/tasks/21f-studio-qol.md`     | §F + shortlist F4 (+ F1 if fits)     |

Each spec **MUST** match the style of `19-office-spaces.md` / `20-progression-feedback.md`:
mission, ownership zone, exact paths, signatures, algorithms, test tables, DoD,
out-of-scope, agent prompt block. Prefer **MVP shortlist** as required; mark catalog
extras as “MAY / follow-up”.

**Shared contract the six authors must agree on (copy into each spec):**

```ts
// Additive StudioSnapshot fields (defaults keep old clients working)
hiredRoleIds: readonly string[];      // 21a — apprentice | curator | marketing-director
reducedVfx: boolean;                  // 21d/21f — from prefers-reduced-motion
// 21c: localStorage `adt.audio.v1` only — no audioEnabled on StudioSnapshot.

// When client non-null (21a A3):
client: Pick<ClientBrief, 'id' | 'clientName' | 'avatarUrl'> & { tier: string };

// Additive commands (21b)
// | { type: 'open-shop'; shop: 'toolkit' | 'gallery' | 'staff' }
```

### Boss decisions (2026-08-01)

1. **`client.tier` on snapshot — YES.** Freeze with 21a. Required when `client !== null`;
   wiring uses `client.tier ?? 'walk-in'`. Additive presentation field only.
2. **Bridge freeze location — on 21a branch**, not a separate main patch. 21a is the sole
   R1 `bridge.ts` / `StudioScene` editor. Later branches rebase or user resolves at review;
   **do not merge** to main until user approves.
3. **`reducedVfx`** — shared name for 21d + 21f (already aligned).
4. **`audioEnabled` on snapshot** — **not used.** 21c confirmed: Zod `adt.audio.v1` +
   gesture `unlock()` in Svelte; Phaser stays audio-free.
5. **21b bridge events (R2):** outbound `open-shop` and `prop-bark` — add on 21b branch
   after 21a; do not add them in 21a.

---

## Phase 2 — Implementation order

1. **Bridge freeze** — boss or 21a agent lands additive snapshot defaults on
   `agent/living-npcs` first; 21b rebases/merges from that branch _only if user allows
   branch-to-branch sync_; otherwise 21b implements against the frozen names in the
   spec and user resolves at review time.
2. **Wave G parallel:** 21a + 21b (disjoint: characters/spawn vs prop registry).
3. **Wave H parallel (after G branches exist, still no main merge):** 21c audio
   (`src/lib/audio/**`, `static/studio/audio/**`, settings UI) + 21d VFX (particles in
   scene — **serialize with 21f if both edit StudioScene**). Prefer **21c + 21d**
   first; 21f after or instead of overlapping scene edits.
4. **Wave I:** 21e ambient (needs NPC + interact targets from a/b).

**Conflict rule:** Only one agent may edit `StudioScene.ts` at a time. Assign scene
touches: 21a (NPCs) → then 21b (interact) → then 21d/21f → then 21e.

Revised safe parallelization under no-merge:

| Round | Agents    | Rationale                                              |
| ----- | --------- | ------------------------------------------------------ |
| R1    | 21a only  | Owns characters + first bridge fields                  |
| R2    | 21b       | Prop registry; rebase note for user                    |
| R3    | 21c + 21d | Audio mostly new dirs; VFX scene — if clash, 21c alone |
| R4    | 21f       | QoL prompts / pathfinding                              |
| R5    | 21e       | Barks / events                                         |

Boss may start **R1** as soon as spec 21a is ready; do not wait for all six specs if
21a is solid — but prefer all six specs written first so bridge names are stable.

---

## Phase 3 — Review handoff (per task)

For each finished implementation agent:

1. Run (or confirm agent ran) `check` / `lint` / scoped `test:unit` on owned files.
2. Orchestrator commits on the task branch (not main):
   `git -C ../adt-wt-<name> add -A && commit`
3. Update this status board → `ready_for_review`.
4. Tell user: branch name, worktree path, what to look at. **Do not merge.**

---

## Resume checklist (start of every boss turn)

1. Read this file’s status board.
2. Check which sub-agents finished (notifications / worktree diffs).
3. Update status rows.
4. Spawn next round only when zones are free.
5. Never merge. Never let two agents own `StudioScene.ts` or `bridge.ts` at once
   unless specs explicitly split additive-only regions and user accepts risk.

---

## Absolute paths

- Main: `C:\Users\JensenM\Documents\My Apps\Art Dev Tycoon`
- Proposal: `docs/tasks/21-living-studio.md`
- This plan: `docs/tasks/21-boss-plan.md`
