# Spec 21 — Boss / orchestrator plan

**Owner:** parent (boss) agent. Re-read this file at the start of every turn.
**User constraint:** **Do not merge** to `main` unless the user explicitly approves.
**All agents:** follow `best-practices.md` (read-first list, ownership zones, no
`npm install`, no state-changing git from task agents).

---

## Goal

1. Promote `21-living-studio.md` into six implementable specs: **21a–21f**. ✅
2. Implement them on **separate branches / worktrees** (or gap-review ports onto an
   integration tip).
3. Orchestrator may **commit on those branches** after review of agent handoff; **never
   merge** to `main` until the user approves.

---

## Status board

| Step | Item                         | Status             | Branch / worktree / tip                             | Notes                                                 |
| ---- | ---------------------------- | ------------------ | --------------------------------------------------- | ----------------------------------------------------- |
| 0    | Boss plan (this file)        | **done**           | docs                                                | Gap-meta pass refreshes ship vs deferred              |
| 1a   | Spec doc `21a-living-npcs`   | **done**           | `docs/tasks/21a-living-npcs.md`                     |                                                       |
| 1b   | Spec doc `21b-interactables` | **done**           | `docs/tasks/21b-interactables.md`                   |                                                       |
| 1c   | Spec doc `21c-studio-audio`  | **done**           | `docs/tasks/21c-studio-audio.md`                    | `adt.audio.v1`, no snapshot mute                      |
| 1d   | Spec doc `21d-studio-vfx`    | **done**           | `docs/tasks/21d-studio-vfx.md`                      |                                                       |
| 1e   | Spec doc `21e-ambient`       | **done**           | `docs/tasks/21e-ambient-events.md`                  |                                                       |
| 1f   | Spec doc `21f-studio-qol`    | **done**           | `docs/tasks/21f-studio-qol.md`                      |                                                       |
| 2    | Index README + living-studio | **done**           | docs                                                | Parent catalog status synced in gap-living-meta       |
| 3    | Bridge field freeze          | **landed**         | inside 21a / 21b / 21d                              | see Boss decisions                                    |
| 4a   | Implement 21a                | **shipped on tip** | gap port → merge `355b503`                          | A1–A3; DoD ticked                                     |
| 4b   | Implement 21b                | **shipped on tip** | gap port → merge `7b9f191`                          | B1/B2/B5; DoD ticked                                  |
| 4c   | Implement 21c                | **shipped on tip** | gap port → merge `998f046`                          | C1/C3/C4/C8; DoD ticked                               |
| 4d   | Implement 21d                | **shipped on tip** | gap port → merge `e94c9e6`                          | D3/D4 + `reducedVfx`; DoD ticked                      |
| 4e   | Implement 21e                | **open**           | `../adt-wt-gap-ambient` / `agent/gap-ambient`       | E1 — **do not tick parent** until DoD lands on tip    |
| 4f   | Implement 21f                | **open**           | `../adt-wt-gap-studio-qol` / `agent/gap-studio-qol` | F1/F4/F6 — sibling zone; do not edit from living-meta |

**Phase 1 complete** (all six specs). Bridge extras from 21b (frozen): outbound
`open-shop`, `prop-bark`. Snapshot: `hiredRoleIds`, `client.tier`, `reducedVfx`.
No `audioEnabled` on snapshot.

### Integration tip (gap stack — what this worktree tracks)

This `agent/gap-living-meta` tip already contains **21a → 21b → 21d → 21c** (plus
unrelated gap merges). Historical feature branches below remain useful for per-slice
diffs; prefer the gap tip for “what’s in the product lineage.”

| Slice | Historical feature branch | Gap / review worktree         | MVP on gap-living-meta tip? |
| ----- | ------------------------- | ----------------------------- | --------------------------- |
| 21a   | `agent/living-npcs`       | `../adt-wt-gap-living-npcs`   | **Yes**                     |
| 21b   | `agent/interactables`     | `../adt-wt-gap-interactables` | **Yes**                     |
| 21c   | `agent/studio-audio`      | `../adt-wt-gap-studio-audio`  | **Yes**                     |
| 21d   | `agent/studio-vfx`        | `../adt-wt-gap-studio-vfx`    | **Yes**                     |
| 21f   | `agent/studio-qol`        | `../adt-wt-gap-studio-qol`    | **No**                      |
| 21e   | `agent/studio-ambient`    | `../adt-wt-gap-ambient`       | **No**                      |

**Remaining for Wave I / late H:** land 21f then 21e (or parallel only if
`StudioScene` ownership stays serial). Still **do not merge to `main`** without user OK.

**Legend:** `pending` → `in_progress` → `ready_for_review` → `shipped on tip` →
`approved` (user merges to main).

---

## Phase 1 — Spec authorship (complete)

Six specs authored in parallel; each owns only its markdown under `docs/tasks/`.

| Agent | Wrote                              | Source rows in `21-living-studio.md` |
| ----- | ---------------------------------- | ------------------------------------ |
| S1    | `docs/tasks/21a-living-npcs.md`    | §A + shortlist A1, A2, A3            |
| S2    | `docs/tasks/21b-interactables.md`  | §B + shortlist B1, B2, B5            |
| S3    | `docs/tasks/21c-studio-audio.md`   | §C + shortlist C1, C3, C4, C8        |
| S4    | `docs/tasks/21d-studio-vfx.md`     | §D + shortlist D3, D4                |
| S5    | `docs/tasks/21e-ambient-events.md` | §E + shortlist E1                    |
| S6    | `docs/tasks/21f-studio-qol.md`     | §F + shortlist F4, F1, F6            |

**Shared contract (landed):**

```ts
// Additive StudioSnapshot fields (defaults keep old clients working)
hiredRoleIds: readonly string[];      // 21a — apprentice | curator | marketing-director
reducedVfx: boolean;                  // 21d/21f — from prefers-reduced-motion
// 21c: localStorage `adt.audio.v1` only — no audioEnabled on StudioSnapshot.

// When client non-null (21a A3):
client: Pick<ClientBrief, 'id' | 'clientName' | 'avatarUrl'> & { tier: string };

// Additive outbound events (21b)
// | { type: 'open-shop'; shop: 'toolkit' | 'gallery' | 'staff' }
// | { type: 'prop-bark'; propId; text }
```

### Boss decisions (2026-08-01)

1. **`client.tier` on snapshot — YES.** Freeze with 21a. Required when `client !== null`;
   wiring uses `client.tier ?? 'walk-in'`. Additive presentation field only.
2. **Bridge freeze location — on 21a branch**, not a separate main patch. Later slices
   rebase or gap-port onto the tip; **do not merge** to main until user approves.
3. **`reducedVfx`** — shared name for 21d + 21f (already aligned).
4. **`audioEnabled` on snapshot** — **not used.** 21c confirmed: Zod `adt.audio.v1` +
   gesture `unlock()` in Svelte; Phaser stays audio-free.
5. **21b bridge events (R2):** outbound `open-shop` and `prop-bark` — add on 21b
   (landed).
6. **Catalog deferred rows** (A4–A8, B3–B4/B6–B12, C2/C5–C7, D1–D2/D5–D10, E2–E7,
   F2/F3/F5/F7) stay **unticked** on the parent until a follow-up slice owns them.
   Do not treat historical feature-branch tips as shipped on this tip.

---

## Phase 2 — Implementation order

Historical safe parallelization (still applies for remaining e/f):

| Round | Agents    | Rationale                             | Tip status  |
| ----- | --------- | ------------------------------------- | ----------- |
| R1    | 21a only  | Owns characters + first bridge fields | **shipped** |
| R2    | 21b       | Prop registry                         | **shipped** |
| R3    | 21c + 21d | Audio mostly new dirs; VFX scene      | **shipped** |
| R4    | 21f       | QoL prompts / pathfinding             | **open**    |
| R5    | 21e       | Barks / events                        | **open**    |

**Conflict rule:** Only one agent may edit `StudioScene.ts` at a time. Assign scene
touches: 21a (NPCs) → 21b (interact) → 21d/21f → 21e. Living-meta docs agents **MUST
NOT** edit Phaser / `src/**` while ambient/qol siblings own those zones.

---

## Phase 3 — Review handoff (per task)

For each finished implementation agent:

1. Run (or confirm agent ran) `check` / `lint` / scoped `test:unit` on owned files.
2. Orchestrator commits on the task branch (not main).
3. Update this status board → `ready_for_review` or `shipped on tip` after merge into
   the integration lineage.
4. Tell user: branch name, worktree path, what to look at. **Do not merge to main**
   without explicit approval.

---

## Resume checklist (start of every boss turn)

1. Read this file’s status board.
2. Check sibling gap worktrees for 21e / 21f DoD ticks before updating the parent.
3. Update status rows; keep deferred catalog rows honest in `21-living-studio.md`.
4. Spawn next round only when zones are free.
5. Never merge to main without user OK. Never let two agents own `StudioScene.ts` or
   `bridge.ts` at once unless specs explicitly split additive-only regions.

---

## Absolute paths

- Main: `C:\Users\JensenM\Documents\My Apps\Art Dev Tycoon`
- Living-meta (this docs pass): `C:\Users\JensenM\Documents\My Apps\adt-wt-gap-living-meta`
- Proposal: `docs/tasks/21-living-studio.md`
- This plan: `docs/tasks/21-boss-plan.md`
