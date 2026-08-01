# Spec 25 — Brush types & painting medium feel

**Status:** Outline / design — **not ready to implement** until formulas and canvas
pipeline are locked (promote to implementable slice or 25a/25b later).
**Worktree (when ready):** `git worktree add -b agent/brush-media ../adt-wt-brush-media main`
**Depends on:** Spec **11** (`SketchCanvas`), Spec **13** (medium tiers / Toolkit),
playtest **P6** paint-while-waiting loop. Does **not** require AI engines 05–09 for
local brush feel (crayon/watercolour are canvas rendering).

## Mission

The Toolkit already unlocks mediums (crayons, pencils, ink, watercolour, …) for
**generation modifiers / comedy**. Spec 25 makes the **player painting surface** match
the selected medium:

1. Choose medium in the **painting** UI (not only in Toolkit for AI).
2. Brush behaviour and look follow that medium — crayons feel waxy/grainy; watercolours
   bloom and wash; pencils are hard thin strokes; etc.
3. Unlock gates stay aligned with Spec 13 (`unlockedMediumTierIds` / active medium).

Comedy stays ADT: early crayons are charmingly bad; “epic” unlocks feel better in the
hand, not just in the prompt suffix.

## Playtest origin

| Note                                                                                                                 | Source             |
| -------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Outline brush types; draw in crayons when crayons selected; same for watercolours; choose medium in painting section | Playtest 2 **P16** |

## Catalog (outline)

### A. Medium picker in painting UI — slice **25a**

| ID  | Feature                         | Player fantasy                                                                   | Size | Priority |
| --- | ------------------------------- | -------------------------------------------------------------------------------- | ---- | -------- |
| A1  | **Painting medium selector**    | While sketching / paint-while-wait, pick an unlocked medium                      | M    | MVP      |
| A2  | Sync with Toolkit active medium | Default selection = `activeMediumTierId`; changing here MAY update active medium | S    | MVP      |
| A3  | Locked mediums greyed           | Show next unlock tease (rep/cash) without opening full Toolkit                   | S    | Later    |

### B. Brush / stroke engines — slice **25b**

| ID  | Medium (Spec 13 id) | Feel (outline)                                            | Size | Priority |
| --- | ------------------- | --------------------------------------------------------- | ---- | -------- |
| B1  | `crayon`            | Thick, slightly translucent, grain/noise stamp; soft edge | M    | MVP      |
| B2  | `pencil`            | Thin hard lines; light pressure variance; no fill bloom   | M    | MVP      |
| B3  | `ink`               | High contrast, slight bleed on pause; no opacity stack    | M    | MVP      |
| B4  | `watercolour`       | Wet wash, colour bloom, lighter opacity layers            | L    | MVP      |
| B5  | Oil / later tiers   | Impasto / slow dry (optional)                             | L    | Deferred |

Implementation sketch (not locked):

- Extend `SketchCanvas` with a `brushProfile` (size, opacity, blend, texture overlay).
- Optional offscreen “wet map” for watercolour.
- Export PNG still works for P6 submit-choice / BAGEL sketch path.

### C. Polish — slice **25c**

| ID  | Feature                  | Notes                                     | Priority |
| --- | ------------------------ | ----------------------------------------- | -------- |
| C1  | Cursor / stamp preview   | Matches brush size                        | Later    |
| C2  | Undo / eraser per medium | Kneaded eraser vs water lift              | Later    |
| C3  | Audio ticks (optional)   | Soft crayon scratch — coordinate with 21c | Deferred |

## Proposed ownership (when implementing)

```
New:
  src/lib/data/brushProfiles.ts (+ tests)
  src/lib/game/brushStroke.ts (+ tests)   ← pure stamp/blend helpers if extracted
Edit:
  src/lib/components/SketchCanvas.svelte (+ tests)
  src/lib/components/StudioHudOverlay.svelte  ← medium picker near canvas
  src/lib/data/mediumTiers.ts                 ← optional brushProfileId link
  src/lib/stores/gameState.svelte.ts          ← only if painting medium ≠ toolkit active
```

**MUST NOT:** replace Spec 13 economy tables; require WebGPU for brushes; edit
`contracts.ts` without orchestrator.

## Suggested slice order

```
25a  Medium picker in painting UI
25b  Crayon + pencil + ink + watercolour stroke profiles
25c  Polish (cursor, eraser, optional SFX)
```

## Definition of done (parent — outline only)

- [ ] Catalog covers picker + per-medium brush feel + polish.
- [ ] Linked from `docs/tasks/README.md` and playtest notes P16.
- [ ] Implementable 25a/25b specs (or this file) with locked stamp parameters + tests.
- [ ] No “shipped” claim until MVP A1–A2 + B1–B4 land on tip.

## Open decisions

1. Does painting medium always equal Toolkit `activeMediumTierId`, or can they diverge
   for one commission?
2. Canvas resolution / DPI for grain textures on mobile.
3. Does watercolour need a real wet sim, or a cheap dual-layer hack for MVP?
