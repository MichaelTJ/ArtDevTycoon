# Spec 33 — Kitchen fridge wall & artwork modal

**Status:** Approved (kickoff). Prev/next gallery arrows added after user approval.
**Worktree:** `git worktree add -b agent/kitchen-fridges ../adt-wt-kitchen-fridges main`
**Depends on:** Specs 17, 19, 21b (fridge magnets + interactables), ArtworkFullView from spec 03/04.

## Assumptions

- First venue = gallery venue id `'fridge'` / room `'home-kitchen'`. The three “fridge
  objects” are the one solid cabinet at `(1,2)` plus two neighbor **magnet slots** that
  `slotsForVenue` currently parks on walkable floor. Those extra slots have no furniture
  and no collision, so the player walks through them.
- Prompt copy `'View art'` is the easel/magnet verb (`interactPromptLabel` kind
  `'easel'`). E always opening the first piece is `#nearestTarget` returning the first
  occupied easel in array order whenever _any_ magnet is within `INTERACT_RANGE_PX`
  (28px). Adjacent 16px tiles are all inside that range.
- The artwork popup is `ArtworkFullView`. `ArtworkFrame` `size="full"` is
  `max-w-[512px]` with no height cap, so the Close button sits below a typical laptop /
  phone viewport.
- Garage neighbor-floor magnets, toolkit-shelf, Open-fridge bark, and studio-editor
  extra-fridge tagging stay as they are except where kitchen slot math is shared.
- Uncommitted commission-modal files on the main checkout stay there. This worktree is
  cut from committed `main` (`164caf6` at kickoff).

## Mission

Kitchen display is three fridge cabinets the player cannot walk through. Standing at a
fridge and pressing E opens **that** fridge’s piece (or Open fridge / nothing if that
slot is empty). The full-view dialog fits on screen with Close always reachable. While
viewing a piece, left/right arrows step through the displayed gallery.

## Ownership zone

New:

```
docs/tasks/33-kitchen-fridges.md
src/lib/components/galleryNav.ts
src/lib/components/galleryNav.test.ts
```

Edit:

```
src/lib/studio/rooms.ts
src/lib/studio/rooms.test.ts
src/lib/studio/roomTiles.ts          ← FURNITURE_CAP['home-kitchen'] only
src/lib/studio/easelLayout.ts
src/lib/studio/easelLayout.test.ts
src/lib/studio/scenes/StudioScene.ts ← easel branch of #nearestTarget only
src/lib/studio/README.md
src/lib/studio/pathfind.test.ts      ← only if a locked kitchen path must be re-pinned
src/lib/components/ArtworkFullView.svelte
src/lib/components/ArtworkFullView.svelte.test.ts
src/lib/components/ArtworkFrame.svelte
src/lib/components/ArtworkFrame.svelte.test.ts
src/lib/components/README.md         ← ArtworkFullView / ArtworkFrame / galleryNav rows only
src/routes/+page.svelte              ← ArtworkFullView entries + onselect wiring only
docs/tasks/README.md                 ← index row
docs/agent-log.md
```

**MUST NOT** edit: `package.json`, lockfiles, vite/tsconfig/eslint/prettier/svelte/
playwright config, `.gitignore`, `src/lib/types/**`, `best-practices.md`,
`docs/architecture.md`, `src/routes/+layout.ts`, `src/lib/stores/**`,
`src/lib/game/**`, `src/lib/engines/**`, garage / storefront / gallery / mega
furniture layouts, `interactables.ts` registry copy, `StudioHudOverlay`,
`FridgeGallery.svelte` internals, studio-editor. `+page.svelte` may only change the
`ArtworkFullView` mount (pass `entries` + `onselect`).

## Locked product rules

1. Venue `'fridge'` has **exactly three** magnet slots. Each slot sits on a **solid**
   `INDOOR.cabinet` furniture tile. No magnet on a walkable empty floor tile.
2. Those three cabinets are:

   | Tile    | Role                                                        |
   | ------- | ----------------------------------------------------------- |
   | `(1,2)` | Primary fridge. `interactableId: 'fridge'`. `fridgeAnchor`. |
   | `(0,2)` | Extra cabinet. Solid. `interactableId: 'fridge'`.           |
   | `(0,3)` | Extra cabinet. Solid. `interactableId: 'fridge'`.           |

   Collision grid `solidAt` matches all three. `fridgeAnchors` is
   `[{ tx: 0, ty: 2 }, { tx: 0, ty: 3 }]`.

3. `(1,3)` stays walkable (spec 21f pathfind example B). Player spawn `(1,4)`, desk
   `(3,3)`, clientWait `(2,2)`, counter `(3,2)`, sink `(4,2)` stay put.
4. `FURNITURE_CAP['home-kitchen']` becomes **5** (three cabinets + counter + sink).
5. `slotsForVenue('fridge', kitchen)` returns those three tiles as `kind: 'magnet'`,
   any order, **no** neighbor-offset fill. Other venues keep current neighbor-fill.
6. Easel interact picks the **nearest** magnet/easel slot whose tile center is within
   `INTERACT_RANGE_PX`. Tie → array order. If that nearest slot has no `entryId`, do
   **not** fall through to a farther occupied slot — continue to look / prop.
7. Prompt for an occupied nearest slot remains `'View art'`. Empty nearest slot may
   show `'Open fridge'` when in range of the tagged prop (existing 21b priority:
   talk → deliver → desk → easel → look → prop).
8. `ArtworkFullView` is a viewport dialog: card `max-h-[calc(100dvh-2rem)]`, column
   flex, image area shrinks (`min-h-0`), Close stays in the card (not below the fold).
   Escape and Close still dismiss. Reduced-motion fades stay.
9. New `ArtworkFrame` size `'modal'` (or equivalent) caps the picture at
   `max-h-[min(40dvh,20rem)]` and `max-w-full`. `size="full"` used by ResultsPanel is
   unchanged.
10. Full-view can step through `displayedGalleryEntries` (same list as fridge magnets /
    FridgeGallery). **Previous artwork** / **Next artwork** wrap. Hide both arrows when
    the list has fewer than two entries, or the current id is not in the list.
11. ArrowLeft / ArrowRight on the dialog do the same as the buttons. Escape still
    closes. Buttons are real `<button>`s with those accessible names. Visible glyphs
    are `‹` and `›`.

## Files

### `rooms.ts` / `roomTiles.ts`

`buildKitchen` furniture becomes:

```ts
{ frame: INDOOR.cabinet, tx: 1, ty: 2, solid: true, sheet: SHEET.indoorProps, interactableId: 'fridge' },
{ frame: INDOOR.cabinet, tx: 0, ty: 2, solid: true, sheet: SHEET.indoorProps },
{ frame: INDOOR.cabinet, tx: 0, ty: 3, solid: true, sheet: SHEET.indoorProps },
{ frame: INDOOR.counterL, tx: 3, ty: 2, solid: false, sheet: SHEET.indoorProps },
{ frame: INDOOR.sink, tx: 4, ty: 2, solid: false, sheet: SHEET.indoorProps }
```

`fridgeAnchor = { tx: 1, ty: 2 }`.
`fridgeAnchors = [{ tx: 0, ty: 2 }, { tx: 0, ty: 3 }]`.
`solidAt` for `(1,2)`, `(0,2)`, `(0,3)`.

### `easelLayout.ts`

Add:

```ts
export interface OccupiedDisplaySlot {
	tx: number;
	ty: number;
	entryId: string | null;
}

/**
 * Nearest display slot to the player whose tile center is within rangePx.
 * Distance: hypot(playerPx - (tx+0.5)*tileSize, playerPy - (ty+0.5)*tileSize).
 * Empty slots (entryId null) still compete. Tie → earlier array index.
 */
export function nearestDisplaySlot(
	playerPx: number,
	playerPy: number,
	slots: readonly OccupiedDisplaySlot[],
	tileSize: number,
	rangePx: number
): OccupiedDisplaySlot | null;
```

For `venueId === 'fridge'` (and unknown-venue fallback that uses the fridge count
**on the kitchen room**), build magnet slots **only** from `roomFridgeAnchors(room)`
that also have solid furniture at that tile. Do **not** run the neighbor-offset loop
for `'fridge'`. Garage / storefront+ unchanged.

### `StudioScene.ts`

Replace the easel `for` loop in `#nearestTarget` with:

```ts
const nearest = nearestDisplaySlot(
	px,
	py,
	this.#easels.map((e) => ({ tx: e.slot.tx, ty: e.slot.ty, entryId: e.entryId })),
	TILE_SIZE,
	INTERACT_RANGE_PX
);
if (nearest?.entryId) return { kind: 'easel', entryId: nearest.entryId };
```

Do not edit NPC spawn, Mum wander, `#placeFurniture`, or the prop / desk / talk
branches.

### `ArtworkFrame.svelte`

```ts
size?: 'thumb' | 'full' | 'modal';
```

| `size`  | Image box                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------- |
| `thumb` | unchanged `h-24 w-24`                                                                          |
| `full`  | unchanged `w-full max-w-[512px]`                                                               |
| `modal` | `w-full max-w-full max-h-[min(40dvh,20rem)]` ; `img` `max-h-[min(40dvh,20rem)] object-contain` |

Caption still shows for `full` and `modal`.

### `galleryNav.ts`

Pure helper. No Svelte, no Phaser.

```ts
import type { GalleryEntry } from '$lib/types/contracts';

/**
 * Neighbor in `entries` (display order). Wraps. `null` when length < 2 or
 * `currentId` is missing.
 */
export function adjacentGalleryEntry(
	entries: readonly GalleryEntry[],
	currentId: string,
	delta: -1 | 1
): GalleryEntry | null;
```

```
if entries.length < 2 return null
i ← index of currentId
if i < 0 return null
return entries[(i + delta + entries.length) % entries.length]
```

### `ArtworkFullView.svelte`

```ts
interface Props {
	entry: GalleryEntry;
	entries?: readonly GalleryEntry[]; // default []
	onclose: () => void;
	onselect?: (entry: GalleryEntry) => void;
}
```

`prev` / `next` are `$derived` via `adjacentGalleryEntry`. Show the two arrow
buttons only when both are non-null. Click / ArrowLeft / ArrowRight call
`onselect?.(neighbor)` when a neighbor exists.

Use `size="modal"` on `ArtworkFrame`. Card classes (locked):

- Overlay: existing `fixed inset-0 z-50 flex items-center justify-center … p-4`
- Card: `flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl … p-4 sm:p-6`
- Close: existing accessible name **Close**, `min-h-11`, `flex-shrink-0`, after the
  meta row

Do not change title copy, score, payout, or Escape-to-close.

Arrow buttons sit in a row with the image (left of frame / right of frame) or as a
toolbar above Close — they **MUST** remain inside the max-height card.

### `+page.svelte`

Replace the ArtworkFullView mount only:

```svelte
<ArtworkFullView
	entry={selectedEntry}
	entries={game.displayedGalleryEntries}
	onclose={closeFullView}
	onselect={openFullView}
/>
```

## Tests

| Case                             | Input / action                                                                                                      | Expected                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Kitchen magnets                  | `slotsForVenue('fridge', ROOMS['home-kitchen'])`                                                                    | length 3, all `kind:'magnet'`, set of `{tx,ty}` is `(1,2),(0,2),(0,3)`                                     |
| No floor ghosts                  | same                                                                                                                | no slot on `(1,3)` or `(2,2)`                                                                              |
| Cabinets                         | kitchen furniture                                                                                                   | three `INDOOR.cabinet` props at those tiles; all `solid: true`; only `(1,2)` has `interactableId:'fridge'` |
| Collision                        | `ROOMS['home-kitchen'].collision`                                                                                   | 1 at `(1,2)`, `(0,2)`, `(0,3)`; 0 at `(1,3)`, `(1,4)`, `(2,2)`                                             |
| Cap                              | `FURNITURE_CAP['home-kitchen']`                                                                                     | `5`; furniture length `<= 5`                                                                               |
| Garage unchanged                 | `slotsForVenue('garage', garage)`                                                                                   | still 3 magnets + 3 easels, length 6                                                                       |
| `nearestDisplaySlot` A           | player at tile center `(0,3)`, slots fridge A `(1,2)` id `a`, B `(0,2)` id `b`, C `(0,3)` id `c`, tile 16, range 28 | `{ tx:0, ty:3, entryId:'c' }`                                                                              |
| `nearestDisplaySlot` B           | player at `(0,3)` center, C `entryId: null`, A and B occupied                                                       | `{ tx:0, ty:3, entryId: null }` (caller must not open A)                                                   |
| `nearestDisplaySlot` C           | player at `(200,200)`, same slots                                                                                   | `null`                                                                                                     |
| `nearestDisplaySlot` D           | two slots same distance, array `[a,b]`                                                                              | `a`                                                                                                        |
| Pathfind B                       | `(1,3)` → `(3,2)`                                                                                                   | still a walkable path that never visits `(1,2)`, `(0,2)`, or `(0,3)`                                       |
| Pathfind blocked extra           | `(4,2)` → `(0,2)`                                                                                                   | `null`                                                                                                     |
| ArtworkFrame modal               | `size="modal"`                                                                                                      | img present; caption visible                                                                               |
| ArtworkFrame full                | `size="full"`                                                                                                       | still `max-w` full path (caption visible; no modal cap required)                                           |
| ArtworkFullView Close            | viewport **390×640**; entry with a tall image URL                                                                   | `getByRole('button', { name: 'Close' })` is visible; heading visible; `role=dialog`                        |
| ArtworkFullView Close click      | click Close                                                                                                         | `onclose` once                                                                                             |
| `adjacentGalleryEntry` wrap next | ids `[a,b,c]`, current `c`, delta `1`                                                                               | entry `a`                                                                                                  |
| `adjacentGalleryEntry` wrap prev | ids `[a,b,c]`, current `a`, delta `-1`                                                                              | entry `c`                                                                                                  |
| `adjacentGalleryEntry` mid       | ids `[a,b,c]`, current `b`, delta `1`                                                                               | entry `c`                                                                                                  |
| `adjacentGalleryEntry` short     | ids `[a]`, current `a`, delta `1`                                                                                   | `null`                                                                                                     |
| `adjacentGalleryEntry` missing   | ids `[a,b]`, current `z`, delta `1`                                                                                 | `null`                                                                                                     |
| FullView arrows hidden           | `entries={[entry]}` or omit `entries`                                                                               | no **Previous artwork** / **Next artwork** buttons                                                         |
| FullView next click              | three entries, viewing first; click **Next artwork**                                                                | `onselect` with second entry                                                                               |
| FullView prev wrap               | three entries, viewing first; click **Previous artwork**                                                            | `onselect` with third entry                                                                                |
| FullView ArrowRight              | three entries, viewing first; key `ArrowRight`                                                                      | `onselect` with second entry                                                                               |

Component tests use the `.svelte.test.ts` suffix. No network, no real models, no
unseeded randomness. Do not construct a real `Phaser.Game`.

For the 390×640 Close test, set the browser viewport before render (Playwright
`setViewportSize` / Vitest browser page API). If that API is missing, assert the
dialog card’s computed `maxHeight` is not `none` **and** Close is in the accessibility
tree — then record the viewport gap in the handoff; do not skip Close visibility on
the default test viewport.

## Definition of done

- [x] Kitchen has three solid fridge cabinets; player cannot walk those tiles
- [x] E near a fridge opens that fridge’s displayed piece, not always the first
- [x] Empty nearest fridge does not open a neighbor’s piece
- [x] ArtworkFullView fits a 390×640 viewport with Close visible
- [x] Prev/next arrows (and ArrowLeft/ArrowRight) walk `displayedGalleryEntries` and wrap
- [x] Unit and component tests per table
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for this zone
- [x] `src/lib/studio/README.md` + components README + TSDoc current
- [x] Handoff appended to `docs/agent-log.md`
- [x] `docs/tasks/README.md` index row added
- [x] No writes outside the ownership zone
