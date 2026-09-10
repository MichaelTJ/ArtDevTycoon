# Spec 31 — Commission desk modals (briefing + generation-ready compare)

**Status:** Approved (user go-ahead 2026-09-10).
**Worktree:** `git worktree add -b agent/commission-modals ../adt-wt-commission-modals main`
**Depends on:** Specs 03, 04, 11/P6 (paint-while-waiting + `pendingSubmitChoice`), 24
(assign artist), 25 (medium picker / My idea). Does **not** edit `contracts.ts` or
engine workers.

Orchestrate slices **A → B** on this one worktree. Fix a red §3.3 gate before slice B.

## Assumptions

- The skinny right-column `studio-hud` aside is the problem: briefing is the main
  focus after **Talk to client**, and painting during `generating` should not sit in a
  280px scroller under the client card.
- **Talk to client** already sets `phase === 'briefing'`. This spec changes
  presentation, not the Phaser `talk-to-client` intent or `GamePhase`.
- Generation-ready feedback is an **in-app** control. **MUST NOT** use the browser
  Notification API (no permission prompt; tests cannot grant it).
- `pendingSubmitChoice` + `aiGeneratedImageUrl` already mean “generate finished, pick
  an image.” Do not add a `GamePhase`. Compare-open is overlay `$state`.
- Backdrop does **not** dismiss briefing or paint. Those dialogs stay until **Skip**,
  **Create Art** (briefing), or a submit choice (generating).
- Closing the compare dialog returns to the paint canvas. The ready toast stays until
  submit or skip. Compare does **not** auto-open when generate finishes.
- Idle / results / critiquing / failed keep the existing side-column aside.
  Practice (`practiceOpen` on idle) uses the same viewport dialog as briefing/paint.
- Spec 30 (Playtest 5) is a leftover uncommitted draft on main. This spec **MUST NOT**
  edit `docs/tasks/30-engine-ui-playtest.md`.

## Mission

After the player talks to a client, the briefing (client, medium, My idea) opens as a
large viewport modal instead of a squished right rail. After they submit an idea they
paint in a large modal. When the AI image is ready, a toast appears instead of the
image popping into the paint view; opening the toast shows the drawing and the AI
image side by side so they can choose what to submit.

## Ownership zone

```
New:
  docs/tasks/31-commission-modals.md
  src/lib/components/GenerationReadyToast.svelte
  src/lib/components/GenerationReadyToast.svelte.test.ts
  src/lib/components/SubmitCompareModal.svelte
  src/lib/components/SubmitCompareModal.svelte.test.ts

Edit:
  src/lib/components/StudioHudOverlay.svelte
  src/lib/components/StudioHudOverlay.svelte.test.ts
  src/lib/components/AssignArtistModal.svelte   ← z-index only (z-40 → z-50)
  src/lib/components/index.ts
  src/lib/components/README.md
  src/lib/stores/README.md                      ← generating UI sentence only
  src/routes/+page.svelte
  docs/playtest-notes.md
  docs/tasks/README.md
  docs/agent-log.md
```

**MUST NOT** edit:

- `package.json`, lockfiles, vite/tsconfig/eslint/prettier/svelte/playwright, `.gitignore`
- `src/lib/types/**`, `best-practices.md`, `docs/architecture.md`, `src/routes/+layout.ts`
- `src/lib/engines/**`
- `src/lib/stores/gameState.svelte.ts` (no new phase / persist fields)
- `src/lib/studio/**` (talk-to-client already emits; Phaser stays)
- `SketchCanvas.svelte` (keep mounted and interactive during generating)
- `docs/tasks/30-engine-ui-playtest.md`

## Slice order

| Slice | What                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------- |
| A     | Briefing (and generating paint) as large viewport dialogs; hide the right rail; move Assign into briefing |
| B     | Ready toast + side-by-side compare; AI image no longer appears in the paint dialog                        |

---

## Slice A — Large commission dialogs

### Locked product rules

1. `StudioHudOverlay` still mounts for every phase. When `phase` is `'briefing'` or
   `'generating'`, the commission chrome is a viewport dialog, **not** the
   `studio-hud` aside.
2. Dialog chrome (briefing and generating):

   ```
   class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
   role="dialog"
   aria-modal="true"
   ```

   Inner panel:

   ```
   class="flex max-h-[90vh] w-full max-w-4xl flex-col gap-4 overflow-y-auto rounded-xl border border-stone-300 bg-white p-6 shadow-lg"
   ```

3. Briefing `aria-labelledby` points at a visible `h2` whose text is
   **Talk to {clientName}** (e.g. `Talk to Mum`). Generating `aria-label` is
   **Paint while you wait**.
4. Backdrop clicks do **nothing**. No Close control on briefing or paint. Exit paths:
   **Skip** (`ondecline`), briefing **Create Art** (`onsubmit` via `PromptComposer`),
   generating submit choice (slice B).
5. Briefing body, in this order: `h2`, `ClientCard`, `AbstractBriefHint` when
   `abstractness >= 1`, medium picker (unlocked), `PromptComposer`, **Skip**, then
   **Assign to artist…** when `onassignartist` is provided.
6. **Assign to artist…** accessible name matches visible copy (ellipsis included).
   Click calls `onassignartist` only — does not skip or submit. Parent still owns
   `AssignArtistModal`.
7. `AssignArtistModal` root overlay class `z-40` → `z-50` so it stacks above the
   briefing dialog.
8. Generating body, in this order: client name as an `h2` (`{clientName}'s commission`),
   locked medium picker, `SketchCanvas` (always mounted while `phase === 'generating'`,
   including after generate finishes), wait copy + `GeneratingPanel` **only while
   `pendingSubmitChoice` is false**, **Skip**. **MUST NOT** render `ArtworkFrame` /
   the AI `<img>` in this dialog (slice B owns reveal).
9. Wait copy (unchanged meaning): `Paint on the canvas while you wait — then pick your drawing or the AI image.`
10. Idle / results / critiquing / failed keep the existing
    `<aside class="studio-hud …" aria-label="Commission desk">`. Idle **Practice**
    (`practiceOpen`) uses the same viewport dialog as briefing/paint (`aria-label="Practice"`).
11. `+page` studio shell: when `game.phase` is `'briefing'` or `'generating'`, or
    `game.practiceOpen` is true, the studio + fridge wrapper is a **single column**
    (`grid gap-4` only — no `lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]`).
    Overlay still mounts as a sibling (fixed, so it does not need a rail). Other
    phases keep the two-column grid. Use a `{#snippet}` so overlay props are not
    duplicated.
12. Remove the briefing **Assign to artist…** button that currently sits beside the
    overlay in `+page`. Pass `onassignartist={() => { showAssignArtist = true; }}`
    on the studio-floor overlay only (`floorInteract` path). CSS kitchen overlay
    does not get `onassignartist`.
13. CSS kitchen fallback (`GameScene` workspace) uses the same overlay dialogs;
    `position: fixed` covers the viewport even inside `WorkspaceZone`.

### Files (A)

`StudioHudOverlay` new optional prop:

```ts
/** Opens the parent AssignArtistModal. Briefing only; omit on CSS kitchen. */
onassignartist?: () => void;
```

Default omitted / undefined → no Assign button.

### Tests (A)

| Case                 | Input / action                           | Expected                                                                   |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| Briefing dialog      | `phase: 'briefing'`, Mum brief           | `role="dialog"` named / labelled **Talk to Mum**; **My idea** visible      |
| Briefing not aside   | same                                     | no `aria-label="Commission desk"`                                          |
| Medium + skip        | same                                     | painting-medium group; **Skip this commission** fires `ondecline`          |
| Assign shown         | `onassignartist` fn                      | button **Assign to artist…** click → callback ×1, `onsubmit` ×0            |
| Assign hidden        | no `onassignartist`                      | no **Assign to artist…**                                                   |
| Idle still aside     | `phase: 'idle'`                          | `aria-label="Commission desk"`; no briefing dialog                         |
| Generating dialog    | `phase: 'generating'`                    | `role="dialog"` `aria-label="Paint while you wait"`; sketch canvas visible |
| Generating no AI img | generating, `pendingSubmitChoice: false` | no alt `Generated art from your idea`                                      |
| Locked medium        | generating crayon                        | group **Painting medium (locked for this piece)**; no tier buttons         |

---

## Slice B — Ready toast + compare

### Locked product rules

1. When `phase === 'generating' && pendingSubmitChoice && aiGeneratedImageUrl` and
   compare is **closed**, mount `GenerationReadyToast`. When compare is **open**,
   do not mount the toast.
2. `GenerationReadyToast` is presentational:

   ```ts
   interface Props {
   	onopen: () => void;
   }
   ```

   Root: `fixed top-20 right-4 z-50` (below `GameMenuBar`, away from
   `EngineLoadSpinner` at bottom-right).
   Wrapper `role="status"` `aria-live="polite"`. Inner control is a real
   `<button type="button">` whose accessible name and visible title are
   **Your painting is ready**. Subtext (not in the accessible name):
   **Compare your drawing and the AI image**. `onclick` → `onopen`.

3. **MUST NOT** render the AI `ArtworkFrame` / `<img alt="Generated art from your idea">`
   inside the generating paint dialog. Reveal happens only in `SubmitCompareModal`.
4. `onopen` sets overlay `compareOpen = true` and snapshots the current sketch:
   call the `SketchCanvas` exporter (`getBlob`), then `blobToDataUrl` from
   `$lib/game/submitChoice`. If blob is `null`, drawing URL is `null`.
5. `SubmitCompareModal` is presentational:

   ```ts
   interface Props {
   	drawingImageUrl: string | null;
   	aiImageUrl: string;
   	canSubmitDrawing: boolean;
   	onsubmitai: () => void;
   	onsubmitdrawing: () => void;
   	onback: () => void;
   }
   ```

   Chrome: `fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4`,
   `role="dialog"` `aria-modal="true"` `aria-label="Compare paintings"`.
   Inner: `max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-stone-300 bg-white p-6 shadow-lg`.

6. Body is a two-column grid (`grid gap-4 md:grid-cols-2`):

   | Column | Caption          | Image                                                                                                        |
   | ------ | ---------------- | ------------------------------------------------------------------------------------------------------------ |
   | left   | **Your drawing** | `drawingImageUrl` as `<img alt="Your drawing">`; if URL is `null`, no `<img>` — show text **No drawing yet** |
   | right  | **AI image**     | `aiImageUrl` as `<img alt="Generated art from your idea">`                                                   |

7. Actions, in this order, all real buttons:

   | Visible text            | Accessible name | Behaviour                                                       |
   | ----------------------- | --------------- | --------------------------------------------------------------- |
   | **Submit AI image**     | same            | `onsubmitai`                                                    |
   | **Submit your drawing** | same            | `onsubmitdrawing`; `disabled` when `canSubmitDrawing === false` |
   | **Back to painting**    | same            | `onback`                                                        |

8. **Back to painting** sets `compareOpen = false` (toast remounts). Sketch canvas
   stays mounted underneath — do not destroy it while compare is open.
9. Overlay wraps `onconfirmsubmit` and `ondecline` so both set `compareOpen = false`
   before forwarding. Compare markup is `{#if pendingSubmitChoice && compareOpen}`.
10. Re-opening the toast re-snapshots the canvas (player may have painted more).
11. Submit-choice callbacks stay `'ai' | 'drawing'` — no `gameState` API change.
12. Any toast enter animation **MUST** be wrapped so `prefers-reduced-motion: reduce`
    shows the toast statically.

### Tests (B)

| Case              | Input / action                                | Expected                                                           |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Toast copy        | generating + pending + ai URL, compare closed | button **Your painting is ready**; status text present             |
| No auto compare   | same, no click                                | no **Compare paintings** dialog; no AI `<img>` in the paint dialog |
| Canvas stays      | same                                          | **Sketch canvas** still in the document                            |
| Open compare      | click **Your painting is ready**              | dialog **Compare paintings**; toast button gone                    |
| AI column         | compare open, `aiGeneratedImageUrl` set       | img alt **Generated art from your idea**                           |
| Blank drawing     | compare open, no strokes                      | **No drawing yet**; **Submit your drawing** disabled               |
| Submit AI         | click **Submit AI image**                     | `onconfirmsubmit` ×1 with `'ai'`                                   |
| Back              | click **Back to painting**                    | compare gone; **Your painting is ready** visible again             |
| Toast component   | mount `GenerationReadyToast`, click           | `onopen` ×1                                                        |
| Compare component | `drawingImageUrl: null`, click Back           | `onback` ×1; **No drawing yet**                                    |

---

## Definition of done

- [x] Slices A and B, including Skip / Assign / blank-drawing / back-to-paint
- [x] Tests per tables; `.svelte.test.ts` for new and changed components
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for this zone
- [x] `src/lib/components/README.md` + overlay public-surface row; stores README generating sentence
- [x] Handoff in `docs/agent-log.md`
- [x] `docs/tasks/README.md` index row for spec 31
- [x] Playtest 6 P34–P35 rows in `docs/playtest-notes.md`
- [x] No writes outside the ownership zone
