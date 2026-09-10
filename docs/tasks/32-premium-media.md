# Spec 32 — Premium medium palettes & oil stroke textures

**Status:** Approved. Implementing on `agent/premium-media`.
**Worktree:** `git worktree add -b agent/premium-media ../adt-wt-premium-media main`
**Depends on:** Spec 25 (SketchCanvas brush feel), Spec 13 (medium ids). Spec **30 is in
progress on a different zone** — this worktree is from committed `main` and **MUST NOT**
touch spec 30 files.

## Assumptions

- “Higher-level mediums” are Spec 13 ids `watercolor`, `acrylic` (Acrylic & Digital
  Tablet), and `oil`. Crayon / pencil / ink stay limited.
- “Full RGB picker” means a colour well **plus** Red / Green / Blue 0–255 number inputs,
  not the existing tiny “Custom colour” `<input type="color">` alone. Crayon and pencil
  **keep** that small Custom control (no regression). Ink stays B&W with no RGB.
- Oil “texture picker” is a session-only stroke kind on `SketchCanvas` (round / bristle /
  flat / palette knife). It is **not** saved. No `contracts.ts` / save-schema change.
- Paint-UI only. Hidden prompt suffixes, payout multipliers, and medium skill ranks are
  unchanged. Spec 25c (cursor / eraser / audio) stays deferred. No wet-on-wet sim.
- Spec number **31 is skipped**. Spec 30 remains the Playtest 5 bundle on the main
  checkout. This agent **MUST NOT** edit `docs/tasks/30-engine-ui-playtest.md` or the
  spec-30 hunks in `docs/tasks/README.md` on the dirty main tree.
- `src/lib/components/README.md`, `src/lib/components/index.ts`, and
  `src/lib/game/README.md` are spec-30 edit targets. This spec **MUST NOT** touch them.
  Public surface is documented via TSDoc + `src/lib/data/README.md` + agent-log.

## Mission

Unlocking watercolour / tablet / oil currently still paints with the same eight crayon
swatches. This spec gives those mediums richer palettes and a real RGB picker, and gives
oil a few distinct stroke textures so the top medium feels like oil paint in the hand,
not a round marker.

## Ownership zone

New:

```
docs/tasks/32-premium-media.md
src/lib/data/sketchPalettes.ts
src/lib/data/sketchPalettes.test.ts
src/lib/components/RgbColourPicker.svelte
src/lib/components/RgbColourPicker.svelte.test.ts
```

Edit:

```
src/lib/data/brushProfiles.ts
src/lib/data/brushProfiles.test.ts
src/lib/data/README.md
src/lib/game/brushStroke.ts
src/lib/game/brushStroke.test.ts
src/lib/components/SketchCanvas.svelte
src/lib/components/SketchCanvas.svelte.test.ts
docs/agent-log.md
docs/tasks/README.md          ← worktree only: add the spec 32 index row; do not rewrite spec 30
```

**MUST NOT** edit:

```
package.json          package-lock.json     vite.config.ts
tsconfig.json         eslint.config.js      prettier.config.js
svelte.config.js      playwright.config.ts  .gitignore
src/lib/types/**      best-practices.md     docs/architecture.md
src/routes/+layout.ts
src/lib/stores/**
src/routes/+page.svelte
src/lib/components/PracticeDesk.svelte
src/lib/components/PracticeDesk.svelte.test.ts
src/lib/components/StudioHudOverlay.svelte
src/lib/components/index.ts
src/lib/components/README.md
src/lib/game/README.md
src/lib/data/mediumTiers.ts
src/lib/game/mediumSkill.ts
docs/tasks/30-engine-ui-playtest.md
src/lib/components/CapabilityNotice.svelte
src/lib/components/EnginePicker.svelte
src/lib/components/GameMenuBar.svelte
src/lib/components/WelcomeTutorial.svelte
src/lib/welcome/**
src/lib/studio/**
src/lib/studio-editor/**
```

Do not add a `+server.ts`. Do not download a model. Do not add a top-level dependency.
`RgbColourPicker` is imported only by `SketchCanvas` — do not add it to the components
barrel (avoids `index.ts`, which spec 30 owns).

## Locked product rules

1. Palette + picker mode is keyed by Spec 13 `mediumTierId`. Unknown ids behave as
   crayon.
2. **Ink** (`ink`): swatches `#0a0a0a` and `#fafaf9` only. No Custom. No RGB. Chromatic
   `selectedColor` still snaps to `#0a0a0a` (P22).
3. **Crayon** and **pencil**: eight crayon swatches (literals below) + existing
   **Custom colour** input. No RGB number inputs. No oil stroke picker.
4. **Watercolour**, **acrylic**, **oil**: medium-specific swatches (literals below) +
   `RgbColourPicker`. **Custom colour** label is **absent**.
5. **Oil only:** stroke-texture group **Oil stroke** with four kinds. Default `round`.
   Switching away from oil hides the group; the last kind is kept in component `$state`
   so returning to oil restores it. Not persisted.
6. RGB values are integers 0–255. Composed hex is lowercase `#rrggbb`. Invalid hex
   from the well is ignored (keep previous `value`).
7. Oil textures are deterministic (coordinate seed, no `Math.random`). Round uses the
   existing oil line stroke; the other three **do not** call `lineTo`/`stroke` for the
   segment — they stamp only.
8. Practice desk and briefing/generating canvas pick this up automatically via
   `mediumTierId`. Do not edit those parents.
9. Interactive controls are real `<button>` / `<input>` with accessible names. No
   obligatory animation (respects existing SketchCanvas reduced-motion test).

## Files

### 1. `src/lib/data/sketchPalettes.ts`

Copy these literals. Tests pin them byte-for-byte.

```ts
/** Crayon box — also used by pencil. Same eight hexes SketchCanvas shipped in Spec 25. */
export const CRAYON_PALETTE = [
	'#1c1917',
	'#ffffff',
	'#dc2626',
	'#ea580c',
	'#ca8a04',
	'#16a34a',
	'#2563eb',
	'#7c3aed'
] as const;

export const INK_PALETTE = ['#0a0a0a', '#fafaf9'] as const;

export const WATERCOLOR_PALETTE = [
	'#f7f1e8',
	'#f4d35e',
	'#e76f51',
	'#c1121f',
	'#3d5a80',
	'#4cc9f0',
	'#588157',
	'#9c6644'
] as const;

export const ACRYLIC_PALETTE = [
	'#ffffff',
	'#111827',
	'#ef4444',
	'#f59e0b',
	'#84cc16',
	'#06b6d4',
	'#3b82f6',
	'#a855f7'
] as const;

export const OIL_PALETTE = [
	'#f5f0e6',
	'#1c1917',
	'#d4a017',
	'#9b1b30',
	'#c2a355',
	'#5c3317',
	'#2f6b4f',
	'#2a3d7c'
] as const;

export const RGB_PICKER_MEDIUM_IDS = ['watercolor', 'acrylic', 'oil'] as const;

export const OIL_STROKE_KINDS = ['round', 'bristle', 'flat', 'knife'] as const;
export type OilStrokeKind = (typeof OIL_STROKE_KINDS)[number];

export const OIL_STROKE_LABELS: Record<OilStrokeKind, string> = {
	round: 'Round',
	bristle: 'Bristle',
	flat: 'Flat',
	knife: 'Palette knife'
};

export const DEFAULT_OIL_STROKE_KIND: OilStrokeKind = 'round';
```

Functions (TSDoc on each export):

```ts
export function swatchesForMedium(mediumTierId: string): readonly string[];
/** `ink` → INK; `watercolor` → WATERCOLOR; `acrylic` → ACRYLIC; `oil` → OIL; else CRAYON. */

export function showsRgbPicker(mediumTierId: string): boolean;
/** true iff mediumTierId is in RGB_PICKER_MEDIUM_IDS. */

export function showsCustomColour(mediumTierId: string): boolean;
/** true iff not ink and not showsRgbPicker (crayon, pencil, unknown). */

export function showsOilStrokePicker(mediumTierId: string): boolean;
/** true iff mediumTierId === 'oil'. */

export function hexFromRgb(r: number, g: number, b: number): string;
/** Clamp each channel with Math.round to 0–255; return lowercase #rrggbb. */

export function rgbFromHex(hex: string): { r: number; g: number; b: number } | null;
/** Accept #rrggbb (any case). Otherwise null. No #rgb shorthand. */
```

### 2. `src/lib/components/RgbColourPicker.svelte`

Presentational, runes only. No stores.

```ts
interface Props {
	value: string; // #rrggbb from parent
	disabled?: boolean;
	onchange: (hex: string) => void;
}
```

Markup (accessible names are the contract):

- Wrapper: `role="group"` `aria-label="RGB colour"`.
- `<input type="color">` `aria-label="Colour well"` bound to `value`. On `input`, if
  `rgbFromHex` succeeds, `onchange` that lowercase hex.
- Three `<input type="number" min="0" max="255" step="1">` with `aria-label` **Red**,
  **Green**, **Blue**. Display `rgbFromHex(value)` or `{ r: 0, g: 0, b: 0 }` if parse
  fails. On `input`/`change`, `onchange(hexFromRgb(r,g,b))`.
- Visible labels **Red**, **Green**, **Blue** next to the inputs (same words as the
  aria-labels).

Do not emit `onchange` when the composed hex equals current `value`.

### 3. `src/lib/game/brushStroke.ts`

Keep existing crayon/charcoal/ink helpers. Add oil stamps. `mockCtx` in tests **MUST**
gain `moveTo`, `lineTo`, `stroke`, `translate`, `rotate`, `fillRect`, `closePath` as
`vi.fn()` (and `save`/`restore` already present).

Direction helper (not necessarily exported): if `hypot(x-lastX, y-lastY) === 0` treat
`dx = 1`, `dy = 0`.

```ts
export function stampOilBristle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	lastX: number,
	lastY: number,
	size: number,
	color: string,
	seed: number
): void;
```

Algorithm (tests pin call counts):

- `hairs = 5`.
- `len = hypot(dx, dy) || 1`; `nx = -dy / len`; `ny = dx / len`.
- For `i` in `0..4`:
  - `offset = ((i - 2) / 2) * size * 0.35`
  - `jitter = ((seed + i * 11) % 5) * 0.15`
  - `globalAlpha = 0.35 + ((seed + i) % 3) * 0.08`
  - `strokeStyle = color`; `lineWidth = max(0.8, size * 0.12)`; `lineCap = 'butt'`
  - `beginPath`; `moveTo(lastX + nx * offset, lastY + ny * offset)`;
    `lineTo(x + nx * (offset + jitter), y + ny * (offset + jitter))`; `stroke`.

```ts
export function stampOilFlat(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	lastX: number,
	lastY: number,
	size: number,
	color: string
): void;
```

- `save`; `translate(lastX, lastY)`; `rotate(atan2(dy, dx))` with the zero-length fallback
  above; `fillStyle = color`; `globalAlpha = 0.92`.
- Span the **whole segment**, not a dab at the tip: `span = max(hypot(x-lastX, y-lastY), size * 0.35)`,
  `overlap = size * 0.08`, `fillRect(-overlap, -size * 0.45, span + overlap * 2, size * 0.9)`;
  `restore`. Consecutive samples join because the rectangle covers last→current.

```ts
export function stampOilKnife(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	lastX: number,
	lastY: number,
	size: number,
	color: string
): void;
```

- Same origin/angle as flat (`translate(lastX, lastY)`, `rotate(atan2(dy, dx))`). Do **not**
  rotate from a seed.
- `span = max(hypot(x-lastX, y-lastY), size * 0.4)`; `halfW = size * 0.42`.
- Triangle: `moveTo(0, -halfW)`; `lineTo(span, 0)`; `lineTo(0, halfW)`; `closePath`; `fill`.
  Base on the previous point, tip on the current point so strokes join.

```ts
export function stampOilStroke(
	ctx: CanvasRenderingContext2D,
	kind: OilStrokeKind,
	x: number,
	y: number,
	lastX: number,
	lastY: number,
	size: number,
	color: string,
	seed: number
): void;
```

- `round` → no-op (caller uses the existing line stroke).
- `bristle` → `stampOilBristle`.
- `flat` → `stampOilFlat`.
- `knife` → `stampOilKnife` (uses lastX/lastY for span and angle).
- Unknown kind → no-op.

`effectiveBrushSize` still decides `size` at the call site. Oil profile is unchanged
in `brushProfiles.ts` except the file comment: acrylic/oil are no longer “generic
fallback until 25c”; palettes live in `sketchPalettes.ts` and oil stamps live here.

### 4. `src/lib/components/SketchCanvas.svelte`

- Delete local `PALETTE` / `INK_PALETTE` constants. Import palettes + helpers from
  `sketchPalettes`.
- `activePalette = $derived(swatchesForMedium(mediumTierId))`.
- Colour row:
  - Swatch buttons unchanged (`aria-label="Colour {swatch}"`, `aria-pressed={color === swatch}`).
  - `{#if showsCustomColour(mediumTierId)}` existing **Custom colour** input.
  - `{#if showsRgbPicker(mediumTierId)}` mount `RgbColourPicker` with
    `value={color}` and `onchange` that sets `selectedColor` and `tool = 'brush'`.
- `{#if showsOilStrokePicker(mediumTierId)}` group `role="group"` `aria-label="Oil stroke"`
  with four `<button type="button">` using `OIL_STROKE_LABELS`. `aria-pressed` on the
  active kind. Click sets `oilStrokeKind` and `tool = 'brush'`.
- `oilStrokeKind = $state<OilStrokeKind>(DEFAULT_OIL_STROKE_KIND)`.
- Stroke path:
  - If `mediumTierId === 'oil'` and `oilStrokeKind !== 'round'`: do **not**
    `lineTo`/`stroke` the segment. Call `stampOilStroke` with
    `effectiveBrushSize(brushSize, brushProfile)`, `color`, `grainSeed(x, y)`.
    On pointerdown, pass `lastX = x`, `lastY = y` (zero-length fallback applies).
  - Otherwise keep today’s `applyBrushStrokeStyle` + optional grain + ink bleed.

### 5. Docs

- `src/lib/data/README.md`: add a `sketchPalettes.ts` row to the public-surface table.
  Extend the `brushProfiles.ts` row: oil stroke kinds are player-picked, not profile
  fields.
- `docs/agent-log.md`: append §6.3 handoff.
- Worktree `docs/tasks/README.md` only — insert this index row (do not invent spec 31):

```
| 32  | [Premium medium palettes](./32-premium-media.md) | Watercolour/acrylic/oil RGB picker; oil stroke textures (round/bristle/flat/knife) | 25 |
```

Under Wave L (painting feel), add:

```
       └── 32 premium palettes → ../adt-wt-premium-media  branch agent/premium-media
```

## Tests

Component tests use the `.svelte.test.ts` suffix. No network, no real models, no
unseeded randomness.

| Case                     | Input / action                                                                                            | Expected                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| crayon swatches          | `swatchesForMedium('crayon')`                                                                             | `CRAYON_PALETTE` (same 8 hexes)                                                                                                            |
| unknown medium           | `swatchesForMedium('nope')`                                                                               | `CRAYON_PALETTE`                                                                                                                           |
| pencil swatches          | `swatchesForMedium('pencil')`                                                                             | `CRAYON_PALETTE`                                                                                                                           |
| ink swatches             | `swatchesForMedium('ink')`                                                                                | `['#0a0a0a', '#fafaf9']`                                                                                                                   |
| watercolor swatches      | `swatchesForMedium('watercolor')`                                                                         | `WATERCOLOR_PALETTE` (includes `#3d5a80`, not `#dc2626`)                                                                                   |
| acrylic swatches         | `swatchesForMedium('acrylic')`                                                                            | `ACRYLIC_PALETTE` (includes `#06b6d4`)                                                                                                     |
| oil swatches             | `swatchesForMedium('oil')`                                                                                | `OIL_PALETTE` (includes `#d4a017`)                                                                                                         |
| flags                    | `showsRgbPicker('watercolor')`                                                                            | `true`                                                                                                                                     |
| flags                    | `showsRgbPicker('acrylic')`                                                                               | `true`                                                                                                                                     |
| flags                    | `showsRgbPicker('oil')`                                                                                   | `true`                                                                                                                                     |
| flags                    | `showsRgbPicker('crayon')`                                                                                | `false`                                                                                                                                    |
| flags                    | `showsCustomColour('pencil')`                                                                             | `true`                                                                                                                                     |
| flags                    | `showsCustomColour('ink')`                                                                                | `false`                                                                                                                                    |
| flags                    | `showsCustomColour('watercolor')`                                                                         | `false`                                                                                                                                    |
| flags                    | `showsOilStrokePicker('oil')`                                                                             | `true`                                                                                                                                     |
| flags                    | `showsOilStrokePicker('acrylic')`                                                                         | `false`                                                                                                                                    |
| hexFromRgb               | `(255, 0, 0)`                                                                                             | `'#ff0000'`                                                                                                                                |
| hexFromRgb clamp         | `(-4, 300, 15.4)`                                                                                         | `'#00ff0f'`                                                                                                                                |
| rgbFromHex               | `'#3D5A80'`                                                                                               | `{ r: 61, g: 90, b: 128 }`                                                                                                                 |
| rgbFromHex bad           | `'#fff'`, `'red'`, `''`                                                                                   | `null`                                                                                                                                     |
| bristle dots             | `stampOilBristle` once                                                                                    | `moveTo` 5×, `lineTo` 5×, `stroke` 5×                                                                                                      |
| bristle determ.          | same args twice                                                                                           | identical `moveTo`/`lineTo` call args                                                                                                      |
| flat stamp               | `stampOilFlat` from (5,18)→(10,20)                                                                        | `translate(5, 18)`; `rotate(atan2(2, 5))`; `fillRect` width ≥ hypot(5, 2)                                                                  |
| knife stamp              | `stampOilKnife` from (5,18)→(10,20)                                                                       | `translate(5, 18)`; `rotate(atan2(2, 5))`; triangle tip at `(span, 0)`; `fill` once                                                        |
| stampOilStroke round     | `kind: 'round'`                                                                                           | no `fill` / extra `stroke` from the stamp helper                                                                                           |
| crayon canvas            | default `SketchCanvas`                                                                                    | **Custom colour** visible; **Red** (RGB) absent; **Oil stroke** absent; `Colour #dc2626` visible                                           |
| ink canvas               | `mediumTierId: 'ink'`                                                                                     | Custom + RGB + oil group absent; `Colour #0a0a0a` / `#fafaf9`; no `Colour #dc2626`                                                         |
| watercolor canvas        | `mediumTierId: 'watercolor'`                                                                              | group **RGB colour**; **Colour well**; **Red**/**Green**/**Blue**; no **Custom colour**; `Colour #3d5a80` visible; `Colour #dc2626` absent |
| acrylic canvas           | `mediumTierId: 'acrylic'`                                                                                 | **RGB colour** visible; `Colour #06b6d4` visible                                                                                           |
| oil canvas               | `mediumTierId: 'oil'`                                                                                     | **RGB colour** + group **Oil stroke**; buttons **Round**, **Bristle**, **Flat**, **Palette knife**; Round `aria-pressed=true` by default   |
| oil pick bristle         | click **Bristle**                                                                                         | that button `aria-pressed=true`; Round `aria-pressed=false`                                                                                |
| RGB well                 | watercolor; set well to `#ff0000` (if the test driver can) **or** set Red number to 255 with Green/Blue 0 | brush colour becomes `#ff0000` — assert by checking Colour well `value` or Red input value `255` after `RgbColourPicker` `onchange`        |
| RGB picker unit          | `RgbColourPicker` `value="#112233"`                                                                       | Red 17, Green 34, Blue 51; Colour well `#112233`                                                                                           |
| RGB picker unit          | change Red to `255`                                                                                       | `onchange` called with `'#ff2233'`                                                                                                         |
| RGB picker disabled      | `disabled={true}`                                                                                         | well + Red/Green/Blue `disabled`                                                                                                           |
| practice tick regression | existing ≥2px brush `onpracticetick` test                                                                 | still passes on default (crayon/round) canvas                                                                                              |

`brushProfiles.test.ts`: do **not** require acrylic/oil to become `isMvpBrushMedium`.
Oil stamps are independent of that flag.

## Definition of done

- [x] Feature, including ink/crayon regression and oil non-round stamps
- [x] Unit tests for `sketchPalettes` + oil stamps; component tests for `RgbColourPicker` + `SketchCanvas`
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for this zone
- [x] `src/lib/data/README.md` + TSDoc current
- [x] Handoff appended to `docs/agent-log.md`
- [x] Spec 32 index row added on the **worktree** `docs/tasks/README.md`
- [x] No writes outside the ownership zone
- [x] No `any`, no `@ts-ignore`, no commented-out code, no stray `console.log`
