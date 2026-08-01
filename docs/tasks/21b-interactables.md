# Spec 21b — Interactable objects & props

**Worktree:**
`git worktree add -b agent/interactables ../adt-wt-interactables main`
(then junction `node_modules` per `best-practices.md` §2.2).
**Depends on:** Specs 17–20 merged (walkable venues, Mum resident, HUD). Bridge field
names from `docs/tasks/21-boss-plan.md` **SHOULD** be frozen on main (or on
`agent/living-npcs`) before parallel implement — see § Conflict with 21a.
**Does not depend on:** 05–11 (AI engines), 21c audio, 21d VFX, 21e ambient, 21f QoL.
**Source catalog:** `docs/tasks/21-living-studio.md` §B; MVP shortlist **B1, B2, B5**.

## Mission

Furniture on the Phaser floor is mostly scenery. The player can talk to clients, use the
desk, and inspect easels — but the fridge is a dead prop and the garage workbench does
nothing. This spec makes props **data-driven interact targets**:

1. **B1 — Interactable registry** — prop / marker id → `{ id, promptLabel, range?, intent }`
   as pure TypeScript; Phaser binds it.
2. **B2 — Fridge (home-kitchen)** — E opens the fridge: sprite swap (closed ↔ open chest
   frames) and/or a short bark line via a bridge event.
3. **B5 — Supply shelf / workbench** — E on the garage toolkit prop opens the existing
   `ToolkitShop` modal (same shop as the menu bar), via bridge → Svelte.

Contextual **E — {verb}** prompt labels appear for these targets. Talk / deliver /
desk / easel flows **MUST NOT** be stolen or reordered ahead of commission NPCs.

Presentation only. No new economy, no save keys, no audio (21c), no staff sprites (21a).

---

## Conflict with 21a (read before editing)

| Topic                         | Owner                                           |
| ----------------------------- | ----------------------------------------------- |
| Character / Mum / staff spawn | **21a**                                         |
| Prop registry + prop interact | **21b** (this spec)                             |
| Shared bridge type names      | Boss freeze first (`21-boss-plan.md` § Phase 1) |

**Implement AFTER or alongside 21a only if bridge field names are already frozen.**
This spec owns the prop registry and prop interact routing — not character sprites.

**StudioScene conflict rule:** Prefer **not** editing the same methods 21a uses for NPC
spawn. Touch only the sections listed below. If 21a has unmerged edits to
`#nearestTarget` / `#tryInteract` / `#updateInteractPrompt`, rebase or serialize per
boss plan Round R2 (21b after 21a scene land).

| StudioScene area                                                     | 21b may edit?  | Notes                                                                 |
| -------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| `#spawnClient`, `#dismissClient`, `#spawnVisitor`, `#spawnResidents` | **MUST NOT**   | 21a / existing client flow                                            |
| `#updateMumWander`, `#mumIsCommissionTarget`, `#commissionNpc`       | **MUST NOT**   |                                                                       |
| `#placeFurniture`                                                    | **YES**        | Store sprite refs + `interactableId`; support open-fridge frame swap  |
| `#nearestTarget`                                                     | **YES (tail)** | Add prop branch **after** talk / deliver / desk / easel / look        |
| `#tryInteract`                                                       | **YES (tail)** | Handle `kind: 'prop'` only; leave talk/deliver/desk/easel untouched   |
| `#updateInteractPrompt`                                              | **YES**        | Contextual label text for props (and MAY for existing kinds if cheap) |
| `create` / `update` loop structure, input keys                       | **MUST NOT**   | Except wiring prompt Text object if needed                            |
| BootScene, character sheets, staff spawn commands                    | **MUST NOT**   | 21a                                                                   |

---

## Shared bridge contract (from boss plan — copy)

Additive names the six Spec-21 authors agree on. Defaults keep old clients working.
**21b only requires the `open-shop` outbound event** (and optional `prop-bark`). Snapshot
fields below are owned by 21a / 21c / 21d — do not invent alternate names; if missing
on your branch, leave them to their owners and add only 21b event types.

```ts
// Additive StudioSnapshot fields (defaults keep old clients working)
hiredRoleIds: readonly string[];      // e.g. 'apprentice' | 'curator' | 'marketing' — 21a
audioEnabled: boolean;                // master; 21c
reducedVfx: boolean;                  // 21d/21f

// Additive commands (21a / optional)
// | { type: 'spawn-staff' }  — optional if syncSnapshot is enough

// Shop id shared by event (and optional inbound command mirror)
type StudioShopId = 'toolkit' | 'gallery' | 'staff';
```

**Direction for B5:** Phaser emits an **outbound event** so Svelte can open a DOM modal.
Boss plan listed `open-shop` under inbound commands; this spec freezes the player-facing
shape as:

```ts
| { type: 'open-shop'; shop: StudioShopId }
```

on `StudioOutboundEvent`. An inbound command with the same payload is **optional** and
unused in v1 (Phaser has nothing to open). If the freeze already added only the inbound
variant, add the outbound twin with the identical payload — do not rename `shop` values.

---

## Ownership zone

```
New:
  src/lib/studio/interactables.ts
  src/lib/studio/interactables.test.ts
  docs/tasks/21b-interactables.md          ← this file (DoD ticks only after impl)

Edit:
  src/lib/studio/rooms.ts                  ← FurnitureProp.interactableId + tags on MVP props
  src/lib/studio/rooms.test.ts             ← assert tags present on kitchen fridge / garage shelf
  src/lib/studio/bridge.ts                 ← additive outbound events §3
  src/lib/studio/bridge.test.ts            ← if present; else add minimal emit-type coverage via interactables tests
  src/lib/studio/scenes/StudioScene.ts     ← ONLY sections in Conflict table
  src/lib/studio/README.md                 ← interactables + open-shop wiring
  src/routes/+page.svelte                  ← subscribe open-shop / prop-bark (minimal)
  src/lib/components/GameMenuBar.svelte    ← open ToolkitShop from external signal
  src/lib/components/GameMenuBar.svelte.test.ts
  src/lib/components/StudioFloor.svelte.test.ts  ← only if snapshot/bridge mocks need new event types
  docs/agent-log.md                        ← handoff
  docs/architecture.md                     ← one short sentence under §3.1 (optional but preferred)
```

**MUST NOT** edit:

- `package.json`, lockfiles, vite/tsconfig/eslint/prettier configs
- `src/lib/types/contracts.ts`
- Staff NPC spawn / Mum sheet work (21a)
- Audio modules / `static/studio/audio/**` (21c)
- `src/lib/game/**`, engine files, shop unlock data tables
- Unrelated components (`ToolkitShop.svelte` internals — open it, do not rewrite it)

---

## 1. Data-driven registry (`interactables.ts`)

Pure module. No Phaser imports. No `GameStore`.

```ts
import { INTERACT_RANGE_PX } from './config';

/** Stable ids placed on RoomDef furniture via `interactableId`. */
export type InteractableId = 'fridge' | 'toolkit-shelf';

export type StudioShopId = 'toolkit' | 'gallery' | 'staff';

export type InteractIntent =
	| { type: 'toggle-fridge' }
	| { type: 'open-shop'; shop: StudioShopId }
	| { type: 'bark'; lines: readonly string[] };

/**
 * One interactable definition. `intent` may be a composite for fridge
 * (toggle + bark) — see FRIDGE_INTERACTABLE below.
 */
export interface InteractableDef {
	id: InteractableId;
	/** Shown as "E — {promptLabel}" above the player / prop. */
	promptLabel: string;
	/** Pixel range; omit → INTERACT_RANGE_PX. */
	rangePx?: number;
	intent: InteractIntent;
}

/**
 * Fridge is toggle + bark. Represent as a dedicated helper result rather than a
 * single InteractIntent discriminant if cleaner — either pattern is fine as long as
 * unit tests pin behaviour:
 *   - promptLabel === 'Open fridge' when closed, 'Close fridge' when open (OR always
 *     'Open fridge' if you only animate open→auto-close; see §4)
 *   - intent opens shop only for toolkit-shelf
 */
export interface FridgeInteractableDef {
	id: 'fridge';
	promptLabelClosed: string; // 'Open fridge'
	promptLabelOpen: string; // 'Close fridge'
	rangePx?: number;
	/** Closed / open furniture frames in furniture.png (chest 2 / open chest 3). */
	closedFrame: number; // 2
	openFrame: number; // 3
	barkLines: readonly string[];
}

export const FRIDGE: FridgeInteractableDef = {
	id: 'fridge',
	promptLabelClosed: 'Open fridge',
	promptLabelOpen: 'Close fridge',
	closedFrame: 2,
	openFrame: 3,
	barkLines: [
		'Mum left a note: "Eat something that is not paint."',
		'Leftover casserole. Courage required.',
		'Magnet trivia: this fridge has seen five masterpieces and one crayon onion.'
	]
};

export const TOOLKIT_SHELF: InteractableDef = {
	id: 'toolkit-shelf',
	promptLabel: 'Open toolkit',
	intent: { type: 'open-shop', shop: 'toolkit' }
};

export interface PropMarker {
	interactableId: InteractableId;
	tx: number;
	ty: number;
}

/**
 * Nearest tagged prop within its range. Returns null if none.
 * Distance uses tile centers: (tx + 0.5) * tileSize, (ty + 0.5) * tileSize.
 * When two props tie, prefer the one with smaller distance; if still tied, stable
 * by array order.
 */
export function nearestInteractable(
	playerPx: number,
	playerPy: number,
	props: readonly PropMarker[],
	tileSize: number,
	defaultRangePx?: number // default INTERACT_RANGE_PX
): PropMarker | null;

export function defForInteractable(id: InteractableId): InteractableDef | FridgeInteractableDef;

/** Pick a bark line. `index` modulo length; tests pass an explicit index. */
export function fridgeBarkLine(lines: readonly string[], index: number): string;

/**
 * Prompt copy helper for the scene.
 * kind 'fridge' uses open state; others use def.promptLabel.
 */
export function interactPromptText(
	input: { kind: 'fridge'; open: boolean } | { kind: 'toolkit-shelf' }
): string; // "E — Open fridge" | "E — Close fridge" | "E — Open toolkit"
```

**MVP registry contents (literal ids):**

| `interactableId` | Room           | Furniture placement                                                                     | Intent                  |
| ---------------- | -------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| `fridge`         | `home-kitchen` | Existing chest at `(1,1)` frame 2                                                       | Toggle frame + bark     |
| `toolkit-shelf`  | `art-room`     | Tag **one** workbench table cell — prefer `{ frame: 0, tx: 3, ty: 5 }` (west workbench) | `open-shop` / `toolkit` |

Do **not** tag storefront / gallery / mega furniture in v1.

---

## 2. `FurnitureProp` tag (`rooms.ts`)

Additive field only:

```ts
export interface FurnitureProp {
	frame: number;
	tx: number;
	ty: number;
	solid: boolean;
	/** When set, player may E-interact via interactables registry. */
	interactableId?: InteractableId; // import type from './interactables' OR duplicate string union in rooms to avoid cycles — prefer importing type-only from interactables
}
```

Kitchen fridge prop becomes:

```ts
{ frame: 2, tx: 1, ty: 1, solid: true, interactableId: 'fridge' }
```

Garage workbench (one cell):

```ts
{ frame: 0, tx: 3, ty: 5, solid: true, interactableId: 'toolkit-shelf' }
```

`rooms.test.ts` **MUST** assert:

| Assertion                                                                 | Expected          |
| ------------------------------------------------------------------------- | ----------------- |
| `ROOMS['home-kitchen'].furniture` has an entry with `interactableId`      | `'fridge'`        |
| That entry's `tx,ty`                                                      | `1,1`             |
| `ROOMS['art-room'].furniture` has an entry with `interactableId`          | `'toolkit-shelf'` |
| Untagged rooms (studio / gallery / mega) have zero `interactableId` props | `true` for v1     |

---

## 3. Bridge — outbound events

```ts
export type StudioShopId = 'toolkit' | 'gallery' | 'staff';

export type StudioOutboundEvent =
	| { type: 'ready' }
	| { type: 'talk-to-client' }
	| { type: 'deliver-to-client' }
	| { type: 'open-gallery-entry'; entryId: string }
	| { type: 'interact-desk' }
	| { type: 'inspect-zone'; zoneId: RoomZoneId }
	/** Spec 21b — Svelte opens the matching shop modal. */
	| { type: 'open-shop'; shop: StudioShopId }
	/**
	 * Spec 21b — short flavour line (fridge, later props).
	 * +page MAY show a toast; MAY no-op if Phaser already drew a bark.
	 */
	| { type: 'prop-bark'; propId: InteractableId; text: string };
```

No new inbound commands required for MVP. Do **not** change `talk-to-client` /
`deliver-to-client` semantics.

---

## 4. Fridge behaviour (B2)

When the player presses E and `#nearestTarget` resolves to `{ kind: 'prop', id: 'fridge' }`:

1. Toggle local Phaser state `#fridgeOpen: boolean` (default `false`).
2. Set the furniture sprite frame to `FRIDGE.openFrame` (3) or `FRIDGE.closedFrame` (2).
3. On transition to **open**, emit:

   ```ts
   bridge.emit({
   	type: 'prop-bark',
   	propId: 'fridge',
   	text: fridgeBarkLine(FRIDGE.barkLines, barkIndex++)
   });
   ```

4. Prompt label follows open state via `interactPromptText`.

**Acceptable simplification:** auto-close after 2s (Phaser timer) so the fridge does not
stay open forever; still emit bark on open. Reduced-motion: skip nothing required
(sprite swap is not decorative motion noise).

**Venue gate:** only bind fridge interact when the built room is `home-kitchen` (tag
already room-local).

---

## 5. Toolkit shelf → ToolkitShop (B5)

### 5.1 Phaser

On E with `{ kind: 'prop', id: 'toolkit-shelf' }`:

```ts
this.#bridge.emit({ type: 'open-shop', shop: 'toolkit' });
```

No Phaser UI. Do not import shop components.

### 5.2 How ToolkitShop opens today

`GameMenuBar.svelte` owns local `$state showToolkit` and mounts `<ToolkitShop>` when
true (menu button sets `showToolkit = true`). `+page.svelte` already
`studioBridge.subscribe`s for `talk-to-client` / `deliver-to-client` /
`open-gallery-entry`.

### 5.3 Minimal wiring (pick one; document in README)

**Preferred:**

1. Add an additive prop on `GameMenuBar`:

   ```ts
   /** Increment to request opening the toolkit (studio floor E). */
   openToolkitNonce?: number;
   ```

2. Inside `GameMenuBar`:

   ```ts
   let lastToolkitNonce = 0;
   $effect(() => {
   	const n = openToolkitNonce ?? 0;
   	if (n > lastToolkitNonce) {
   		lastToolkitNonce = n;
   		showToolkit = true;
   	}
   });
   ```

3. In `+page.svelte` subscribe:

   ```ts
   if (event.type === 'open-shop' && event.shop === 'toolkit') {
   	openToolkitNonce += 1;
   }
   if (event.type === 'prop-bark') {
   	// optional: set a short-lived notice string; MAY no-op in v1
   }
   ```

Pass `openToolkitNonce` into `<GameMenuBar … />`.

**Alternative (also fine):** lift `showToolkit` to `+page` and pass
`showToolkit` + `onclosetoolkit` into `GameMenuBar`. Same DoD.

**MUST** reuse the existing `ToolkitShop` component and the same unlock/select handlers
already wired on the menu path. Do not mount a second divergent shop.

**Component test:** simulate nonce increment (or bindable open) → dialog / "Close toolkit"
appears (mirror existing toolkit button test).

---

## 6. `StudioScene` interact path

### 6.1 Priority (MUST)

`#nearestTarget` check order — **do not reorder existing branches ahead of props:**

1. `talk` (idle + commission NPC in range)
2. `deliver` (results + commission NPC in range)
3. `desk` (briefing)
4. `easel` (displayed entry)
5. `look` (show/window zone)
6. **`prop`** ← new; only if `nearestInteractable(...)` non-null among tagged furniture

Commission talk/deliver **always** wins when in range. Props **MUST NOT** replace them.

### 6.2 Target union extension

```ts
| { kind: 'prop'; id: InteractableId }
```

### 6.3 Prompt labels

Today `#prompt` is a `prompt-e` glyph image with no verb. For v1 of **this** spec:

- Add a `Phaser.GameObjects.Text` (or BitmapText) next to / instead of the glyph when the
  target is a prop — text from `interactPromptText(...)`.
- **MAY** also set text for talk / deliver / desk / look (`E — Talk`, `E — Deliver`, …)
  while touching `#updateInteractPrompt`; full verb polish across all targets is **21f F4**
  — do not block on perfect copy for non-prop kinds.

### 6.4 `#placeFurniture`

When creating furniture images, keep a list:

```ts
#interactProps: { id: InteractableId; sprite: Phaser.GameObjects.Image; tx: number; ty: number }[]
```

only for props with `interactableId`. Fridge sprite must be mutable for frame swap.

### 6.5 `#tryInteract` prop branch

```ts
if (target.kind === 'prop') {
	if (target.id === 'fridge') {
		/* §4 */ return;
	}
	if (target.id === 'toolkit-shelf') {
		this.#bridge.emit({ type: 'open-shop', shop: 'toolkit' });
		return;
	}
}
```

---

## 7. Algorithms (pure — unit test these)

### `nearestInteractable`

```
best ← null
bestDist ← +∞
for each prop in props (array order):
  def ← defForInteractable(prop.interactableId)
  range ← def.rangePx ?? defaultRangePx ?? INTERACT_RANGE_PX
  cx ← (prop.tx + 0.5) * tileSize
  cy ← (prop.ty + 0.5) * tileSize
  d ← hypot(playerPx - cx, playerPy - cy)
  if d < range and d < bestDist:
    bestDist ← d
    best ← prop
return best
```

### `fridgeBarkLine`

```
if lines.length === 0 return ''
return lines[((index % lines.length) + lines.length) % lines.length]
```

### `interactPromptText`

Prefix every label with the exact four-character prefix `"E — "` (E, space, Unicode
em dash U+2014, space). Pin the full strings below in tests.

Literal expected strings:

| Input                             | Expected           |
| --------------------------------- | ------------------ |
| `{ kind: 'fridge', open: false }` | `E — Open fridge`  |
| `{ kind: 'fridge', open: true }`  | `E — Close fridge` |
| `{ kind: 'toolkit-shelf' }`       | `E — Open toolkit` |

---

## 8. Tests

### 8.1 `interactables.test.ts` (literal)

| Call / scenario                                                              | Expected                               |
| ---------------------------------------------------------------------------- | -------------------------------------- |
| `nearestInteractable(24, 24, [{ interactableId:'fridge', tx:1, ty:1 }], 16)` | fridge marker (center 24,24; d=0)      |
| Same player at `(200, 200)`                                                  | `null`                                 |
| Two props, player nearer toolkit                                             | `toolkit-shelf`                        |
| `fridgeBarkLine(['a','b'], 0)`                                               | `'a'`                                  |
| `fridgeBarkLine(['a','b'], 1)`                                               | `'b'`                                  |
| `fridgeBarkLine(['a','b'], 2)`                                               | `'a'`                                  |
| `fridgeBarkLine([], 0)`                                                      | `''`                                   |
| `interactPromptText({ kind:'fridge', open:false })`                          | `E — Open fridge`                      |
| `interactPromptText({ kind:'toolkit-shelf' })`                               | `E — Open toolkit`                     |
| `TOOLKIT_SHELF.intent`                                                       | `{ type:'open-shop', shop:'toolkit' }` |

### 8.2 `rooms.test.ts`

Tags table in §2.

### 8.3 `GameMenuBar.svelte.test.ts`

Opening toolkit via the new nonce/bindable path shows the shop (accessible name /
Close toolkit), same as the menu button test.

### 8.4 Manual / scene (not a Node unit of Phaser.Game)

Document in README: kitchen E on fridge swaps frame; garage E on workbench opens
ToolkitShop; standing on Mum while armed still Talks, not Open fridge.

---

## 9. Catalog extras (MAY / follow-up / out of scope for v1)

One-liners only — do **not** implement in this slice unless leftover and zero conflict:

| #   | Feature                  | v1 status                                      |
| --- | ------------------------ | ---------------------------------------------- |
| B3  | Radio / boombox          | **Follow-up** — needs 21c audio flag           |
| B4  | Coffee machine / kettle  | **MAY** later — flavour toast only, no real XP |
| B6  | Suggestion box / mail    | **Follow-up** — read `nextUnlock` snapshot     |
| B7  | Guest book (storefront+) | **Follow-up** — `galleryHistory` wall text     |
| B8  | Light switch / blinds    | **Follow-up** — local day/dusk preference      |
| B9  | Plinth labels            | **Follow-up** — easel title on proximity       |
| B10 | Trash bin / reject pile  | **Out of scope** — needs failed-run retention  |
| B11 | Door bell                | **Follow-up** — same path as Invite Client     |
| B12 | Window display rearrange | **Out of scope** — ownership vs Gallery shop   |

---

## 10. Definition of done

- [x] `interactables.ts` exports registry helpers; unit tests green with literal table §8.1.
- [x] Kitchen fridge furniture tagged `fridge`; garage workbench tagged `toolkit-shelf`.
- [x] E near fridge toggles open/closed sprite frames and emits `prop-bark` with a line.
- [x] E near toolkit shelf emits `open-shop` / `toolkit`; Svelte opens existing ToolkitShop.
- [x] Contextual prompt text for fridge + toolkit (`E — …`).
- [x] Talk / deliver / desk / easel priority unchanged — props cannot steal commission flow.
- [x] Bridge additive outbound events only; `contracts.ts` / `package.json` untouched.
- [x] StudioScene edits limited to furniture place + interact prompt/target/try tails (§ Conflict).
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for owned files.
- [x] `src/lib/studio/README.md` updated; `docs/agent-log.md` handoff appended.

---

## 11. Explicitly out of scope

- Staff / Mum / client sprite work (21a).
- Music, SFX, audio settings (21c); radio prop (B3).
- Particles, confetti, lighting washes (21d).
- Bark bubble system for NPCs (21e) — fridge may emit `prop-bark` only.
- Global interact verb polish / gamepad (21f) beyond prop labels.
- New npm dependencies; save schema; shop unlock table changes.
- Editing `ToolkitShop.svelte` purchase rules or medium tier data.

---

## 12. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/21b-interactables.md`.
>
> Worktree (orchestrator creates; you work inside it):
> `../adt-wt-interactables` on branch `agent/interactables`.
>
> Read these files completely before writing any code:
>
> 1. `best-practices.md` — the binding rules for this repo
> 2. `docs/architecture.md` — how the system fits together
> 3. `src/lib/types/contracts.ts` — frozen types (do not edit)
> 4. `docs/tasks/21b-interactables.md` — your spec
> 5. `docs/tasks/21-boss-plan.md` — shared bridge names
> 6. `src/lib/studio/README.md`, `bridge.ts`, `rooms.ts`, and `StudioScene.ts` interact path
> 7. `GameMenuBar.svelte` / `+page.svelte` ToolkitShop open path
>
> Also skim `docs/agent-log.md` for Spec 19/20 / any 21a handoff.
>
> The spec lists exactly which files to create and which paths you own. Do not create
> or modify any file outside your ownership zone. Do not edit `package.json`,
> `vite.config.ts`, `tsconfig.json`, or `src/lib/types/**`. Do not run `npm install`.
> Do not run any state-changing git command — no commit, add, checkout, merge, or push.
>
> If bridge field names from the boss plan are not yet on your branch, add only the
> outbound events this spec defines (`open-shop`, `prop-bark`). Do not invent alternate
> snapshot field names for 21a/21c/21d.
>
> Do not edit StudioScene NPC spawn / Mum wander / client door methods. Confine scene
> edits to furniture tagging refs, `#nearestTarget` prop tail, `#tryInteract` prop
> branch, and `#updateInteractPrompt` labels.
>
> Implement every file in the spec, including its tests. Then run all three of these
> and fix anything they report in your own files:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Finally, update `src/lib/studio/README.md` and append your handoff entry to
> `docs/agent-log.md` using the template in `best-practices.md` §6.3.
