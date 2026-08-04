# Spec 25 — Brush types & painting medium feel

**Status:** MVP shipped — **25a** medium picker + **25b** crayon/pencil/ink/watercolour brush
profiles on `SketchCanvas`. Polish slice **25c** deferred.
**Worktree:** `../adt-wt-brush-media` branch `agent/brush-media`
**Depends on:** Spec **11** (`SketchCanvas`), Spec **13** (medium tiers / Toolkit),
playtest **P6** paint-while-waiting loop.

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

## Catalog

### A. Medium picker in painting UI — slice **25a**

| ID  | Feature                         | Player fantasy                                                                   | Size | Priority | Status   |
| --- | ------------------------------- | -------------------------------------------------------------------------------- | ---- | -------- | -------- |
| A1  | **Painting medium selector**    | Pick an unlocked medium **before** submitting **My idea** (briefing)             | M    | MVP      | **Done** |
| A2  | Sync with Toolkit active medium | Default selection = `activeMediumTierId`; changing here MAY update active medium | S    | MVP      | **Done** |
| A3  | Locked mediums greyed           | Show next unlock tease (rep/cash) without opening full Toolkit                   | S    | MVP      | **Done** |

### B. Brush / stroke engines — slice **25b**

| ID  | Medium (Spec 13 id) | Feel (outline)                                             | Size | Priority | Status                |
| --- | ------------------- | ---------------------------------------------------------- | ---- | -------- | --------------------- |
| B1  | `crayon`            | Thick, slightly translucent, grain/noise stamp; soft edge  | M    | MVP      | **Done**              |
| B2  | `pencil`            | Thin hard lines; light pressure variance; no fill bloom    | M    | MVP      | **Done**              |
| B3  | `ink`               | Charcoal grain, B&W palette, bleed on lift; not a hard pen | M    | MVP      | **Done** (P22 polish) |
| B4  | `watercolor`        | Wet wash, colour bloom, lighter opacity layers             | L    | MVP      | **Done**              |
| B5  | Oil / later tiers   | Impasto / slow dry (optional)                              | L    | Deferred | —                     |

Implementation (MVP):

- `brushProfiles.ts` — stamp parameters per medium tier id (`grainStyle: 'charcoal'` for ink).
- `brushStroke.ts` — pure helpers: `applyBrushStrokeStyle`, crayon/charcoal grain, ink bleed.
- `SketchCanvas` accepts `mediumTierId`; ink locks palette to B&W swatches only.
- `StudioHudOverlay` medium picker during **briefing** (locked label during `generating`); `+page` wires `setActiveMediumTier`.

### C. Polish — slice **25c**

| ID  | Feature                  | Notes                                     | Priority |
| --- | ------------------------ | ----------------------------------------- | -------- |
| C1  | Cursor / stamp preview   | Matches brush size                        | Later    |
| C2  | Undo / eraser per medium | Kneaded eraser vs water lift              | Later    |
| C3  | Audio ticks (optional)   | Soft crayon scratch — coordinate with 21c | Deferred |

## Ownership

```
New:
  src/lib/data/brushProfiles.ts (+ tests)
  src/lib/game/brushStroke.ts (+ tests)
Edit:
  src/lib/components/SketchCanvas.svelte (+ tests)
  src/lib/components/StudioHudOverlay.svelte (+ tests)
  src/routes/+page.svelte (wiring)
```

## Definition of done (MVP)

- [x] A1 — Medium picker on painting UI
- [x] A2 — Sync with Toolkit active medium
- [x] A3 — Locked mediums greyed with reason
- [x] B1–B4 — Distinct crayon/pencil/ink/watercolour feel
- [x] Tests + check + lint green
- [x] playtest-notes P16 + agent-log + spec status

## Open decisions (resolved for MVP)

1. Painting medium **equals** Toolkit `activeMediumTierId` — picker calls `setActiveMediumTier`.
2. Canvas grain uses coordinate-seeded dots (no texture assets); DPR capped at 2 as today.
3. Watercolour uses low opacity + `shadowBlur` wash hack — no wet sim.
