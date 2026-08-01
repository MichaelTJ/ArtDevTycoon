# Spec 21f — Floor quality-of-life (prompts, pathfinding, reduced-motion)

**Worktree:**
`git worktree add -b agent/studio-qol ../adt-wt-studio-qol main`
then junction `node_modules` per `best-practices.md` §2.2.
**Depends on:** Specs 17–19 merged (walkable venues, resident Mum, bare E prompt).
Wave H after 21a/21b scene touches land on their branches (or rebase onto them before
editing `StudioScene`). Does **not** depend on AI engines (05–11).
**Source catalog:** `docs/tasks/21-living-studio.md` §F — MVP **F4**, **F1**, **F6**;
catalog extras F2 / F3 / F5 / F7 are MAY / follow-up.
**Priority:** Wave H (boss plan R4) — after 21a NPCs and 21b interactables have claimed
their `StudioScene` regions.

---

## Mission

Mum still slides in a straight line between patrol waypoints and can clip through
furniture solids (spec 19 deliberately deferred pathfinding — agent-log “Known gaps”).
The interact affordance is a bare `prompt-e` glyph with no verb. Nothing reads
`prefers-reduced-motion` for floor density / camera, even though best-practices §5.4
requires it and 21d will gate particles on the same flag.

This spec ships three presentation-only QoL wins:

1. **F4 Contextual interact verbs** — nearest target shows e.g. “Talk to Mum”,
   “Work at desk”, “View show”, not a mute “E”.
2. **F1 Grid pathfinding for Mum** (staff MAY reuse) — BFS on walkable tiles so patrol
   routes around walls and furniture.
3. **F6 `reducedVfx` snapshot hook** — one boolean from `prefers-reduced-motion` that
   21f (NPC density / camera) and 21d (particles) share.

No economy, no audio packs, no `contracts.ts` edits.

---

## Shared bridge contract (boss plan — copy)

Additive `StudioSnapshot` fields (defaults keep old clients working). **Canonical name
for the motion/VFX gate is `reducedVfx`** — do **not** invent a second
`reducedMotion` field. Specs 21d and 21f both read this name.

```ts
// Additive StudioSnapshot fields (defaults keep old clients working)
hiredRoleIds: readonly string[];      // e.g. 'apprentice' | 'curator' | 'marketing'
audioEnabled: boolean;                // master; 21c
reducedVfx: boolean;                  // 21d/21f — true when prefers-reduced-motion
```

If the Phase-3 bridge freeze / 21a branch already added `reducedVfx`, **do not rename
it** — only wire consumers. If missing after rebase, 21f **MAY** add the field with
default `false` in `bridge.ts` / tests (additive only).

---

## Ownership zone

```
New:
  src/lib/studio/pathfind.ts
  src/lib/studio/pathfind.test.ts
  src/lib/studio/interactPrompt.ts
  src/lib/studio/interactPrompt.test.ts
  docs/tasks/21f-studio-qol.md          ← this file (DoD ticks only after impl)

Edit:
  src/lib/studio/npcWander.ts           ← optional: path-queue helpers only if cleaner
  src/lib/studio/npcWander.test.ts      ← keep existing tests green; add path-queue cases if helpers land here
  src/lib/studio/scenes/StudioScene.ts  ← method-level ownership §Conflict
  src/lib/studio/bridge.ts              ← additive `reducedVfx?: boolean` only if missing
  src/lib/studio/bridge.test.ts         ← fixture defaults for `reducedVfx: false`
  src/lib/components/StudioFloor.svelte ← pass `reducedVfx` into sync snapshot (media query)
  src/lib/components/StudioFloor.svelte.test.ts  ← only if snapshot mocks need the field
  src/routes/+page.svelte               ← only if snapshot assembly lives here (minimal wire)
  src/lib/studio/README.md
  docs/agent-log.md                     ← handoff
```

**MUST NOT** edit: `package.json`, lockfiles, `src/lib/types/contracts.ts`,
`src/lib/game/**`, `src/lib/data/**`, engine files, shop unlock tables, audio assets,
`static/studio/**` (no new glyphs required — text prompt is enough), or unrelated
components.

**MUST NOT** invent new economy, XP, or save keys.

---

## Conflict — `StudioScene` method-level ownership

Boss rule: only one agent edits `StudioScene.ts` at a time. When 21f runs (R4), treat
prior 21a/21b/21d work as landed or rebase first. Within the file, 21f owns **only**:

| Own (21f)                                                                   | Do not touch (other specs)                                                                                                   |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `#updateInteractPrompt` — prompt visibility, position, **label text**       | `#ensureMum` / resident spawn / tint / spritesheet (`21a`)                                                                   |
| Prompt GameObject setup in `create` (Image → Text, or Image+Text)           | Door visitor `#spawnVisitor` / summon / dismiss tweens (`21a` / 17)                                                          |
| `#updateMumWander` — follow BFS path tiles; keep pause-when-armed behaviour | `#nearestTarget` **kind resolution / emit wiring** owned by 21b if registry landed; 21f **reads** kinds and maps labels only |
| Optional: soft camera lerp gated by `reducedVfx` (F2 MAY)                   | Particle emitters, confetti, desk dust (`21d`)                                                                               |
| Reading `snapshot.reducedVfx` for Mum pause density / skip ambient extras   | Prop registry install, fridge/toolkit handlers (`21b`)                                                                       |

If `#nearestTarget` returns new 21b kinds (e.g. `fridge`, `toolkit`), 21f **MUST** map
them through `interactPromptLabel` — do not re-hardcode interact handlers.

---

## 1. F4 — Contextual interact verbs (`interactPrompt.ts`)

### 1.1 Problem

Today `#updateInteractPrompt` only toggles `prompt-e.png` above the player/NPC. The
player learns “press E somewhere” with no verb.

### 1.2 Pure label helper

```ts
// src/lib/studio/interactPrompt.ts

/** Stable kinds already emitted by StudioScene.#nearestTarget (+ 21b extensions). */
export type InteractPromptKind =
	| 'talk'
	| 'deliver'
	| 'desk'
	| 'easel'
	| 'look'
	| 'fridge' // 21b — if absent from scene, never requested
	| 'toolkit'
	| 'radio'
	| 'mail'
	| 'doorbell'
	| 'prop'; // generic 21b fallback

export interface InteractPromptInput {
	kind: InteractPromptKind;
	/**
	 * Prefer 21b registry `promptLabel` when present (e.g. "Open fridge").
	 * When null/undefined, use built-in fallbacks below.
	 */
	registryLabel?: string | null;
	/** Client display name for talk/deliver — e.g. "Mum", "Neighbour". */
	clientName?: string | null;
}

/**
 * Human-readable verb line shown next to / instead of a bare E glyph.
 * MUST be short (≤ ~28 chars) for pixel UI.
 */
export function interactPromptLabel(input: InteractPromptInput): string;
```

### 1.3 Fallback table (literal — tests pin these)

When `registryLabel` is a non-empty string after trim, return it unchanged.

Otherwise:

| `kind`     | `clientName` | Expected label   |
| ---------- | ------------ | ---------------- |
| `talk`     | `'Mum'`      | `Talk to Mum`    |
| `talk`     | `'Alex'`     | `Talk to Alex`   |
| `talk`     | null / `''`  | `Talk`           |
| `deliver`  | `'Mum'`      | `Deliver to Mum` |
| `deliver`  | null         | `Deliver art`    |
| `desk`     | (ignored)    | `Work at desk`   |
| `easel`    | (ignored)    | `View art`       |
| `look`     | (ignored)    | `View show`      |
| `fridge`   | (ignored)    | `Open fridge`    |
| `toolkit`  | (ignored)    | `Open toolkit`   |
| `radio`    | (ignored)    | `Toggle radio`   |
| `mail`     | (ignored)    | `Read mail`      |
| `doorbell` | (ignored)    | `Ring doorbell`  |
| `prop`     | (ignored)    | `Inspect`        |

Unknown kind (if TypeScript escape via cast in tests) → `Interact`.

### 1.4 Phaser binding

In `#updateInteractPrompt`:

1. Resolve `target = #nearestTarget()`; hide prompt if null (unchanged).
2. Build `InteractPromptInput` from `target.kind` + snapshot `client?.clientName` (for
   talk/deliver; when talking to Mum via `residentClientArmed`, use `'Mum'`).
3. If 21b exported a registry lookup (e.g. `promptLabelForProp(id)`), pass
   `registryLabel` when the target is a prop; **if the module is absent, skip** — do
   not invent 21b files.
4. Set prompt **text** to `interactPromptLabel(...)`.
5. Keep depth 20; position unchanged (NPC for talk/deliver, else above player).

**UI approach (pick one, document in README):**

- **Preferred:** `Phaser.GameObjects.Text` (bitmap-friendly: white fill, dark stroke,
  font size ~8–10). Retire sole reliance on `prompt-e` **or** show the E image as a
  small icon left of the text.
- Acceptable: text only; keep loading `prompt-e` unused until a later polish pass.

Touch button label (mobile interact control) **SHOULD** mirror the same string when
cheap; if the control is icon-only today, leave the icon and only fix the world prompt.

### 1.5 Coordination with 21b

| 21b state                        | 21f behaviour                                       |
| -------------------------------- | --------------------------------------------------- |
| Registry + `promptLabel` present | Prefer registry string                              |
| Registry absent (this branch)    | Built-in fallbacks for talk/deliver/desk/easel/look |
| New kinds exist, no label helper | Map kind → fallback table; never show bare `"E"`    |

---

## 2. F1 — Pathfinding around furniture (`pathfind.ts`)

### 2.1 Problem

`stepToward` moves Mum in a straight pixel line to the next patrol waypoint. The player
collides with `#furnitureGroup`; Mum uses `setPosition` and can walk through the table /
fridge. Spec 19 §11 listed this as out of scope; agent-log records the gap.

### 2.2 Walkability

A tile `(tx, ty)` is walkable iff:

- `0 <= tx < width` and `0 <= ty < height`
- `collision[ty * width + tx] === 0`

`RoomDef.collision` already marks walls **and** solid furniture (`solidAt` in
`rooms.ts`). Pathfinding **MUST** use that array — do not re-derive from
`furniture[]` separately (avoids drift).

### 2.3 Algorithm — 4-neighbour BFS

Unweighted grid → BFS is enough (no diagonal). Cap rooms are 6×6 … 28×16 (≤ 448
cells); BFS is trivially cheap. No A\* required for MVP.

```ts
// src/lib/studio/pathfind.ts
import type { TileMarker } from './rooms';

export interface PathGrid {
	width: number;
	height: number;
	/** Row-major; 0 = walkable, 1 = blocked. */
	collision: readonly number[];
}

/**
 * Shortest 4-neighbour path from `start` to `goal` on walkable tiles.
 * - Includes both start and goal when a path exists and start !== goal.
 * - If start === goal and start is walkable → `[{ ...start }]`.
 * - If start or goal out of bounds / blocked → `null`.
 * - If no path → `null`.
 * Neighbour order for determinism: N, E, S, W
 *   (tx,ty-1), (tx+1,ty), (tx,ty+1), (tx-1,ty).
 */
export function findPath(grid: PathGrid, start: TileMarker, goal: TileMarker): TileMarker[] | null;

/**
 * Convenience: path using a RoomDef-shaped collision buffer.
 */
export function findPathInRoom(
	width: number,
	height: number,
	collision: readonly number[],
	start: TileMarker,
	goal: TileMarker
): TileMarker[] | null;
```

Reconstruction: parent pointers (or prev index map), then walk goal → start and reverse.

**Performance budget:** a single `findPath` on 28×16 must finish well under 1 ms on
desktop; call it only when Mum picks a **new waypoint** (or when current path is
exhausted / invalidated), **not** every frame.

### 2.4 Worked examples (kitchen 6×6)

Solid cells: outer walls, fridge `(1,1)`, table `(2,3)`. Door `(2,0)` walkable.
Legend: `W` wall/solid, `.` walkable.

```
     tx→  0 1 2 3 4 5
  ty 0    W W . W W W
     1    W W . . . W      ← (1,1) fridge = W
     2    W . . . . W
     3    W . W . . W      ← (2,3) table = W
     4    W . . . . W
     5    W W W W W W
```

**Example A** — Mum patrol `(4,2)` → `(1,2)` (straight line would skim the room; BFS
still returns a clear corridor):

```
findPath(kitchenGrid, {tx:4,ty:2}, {tx:1,ty:2})
→ [
  {tx:4,ty:2},
  {tx:3,ty:2},
  {tx:2,ty:2},
  {tx:1,ty:2}
]
```

(With N,E,S,W expansion order this is the unique length-4 path along row `ty=2`.)

**Example B** — `(1,2)` → `(3,1)` must **not** step onto fridge `(1,1)`:

```
findPath(kitchenGrid, {tx:1,ty:2}, {tx:3,ty:1})
→ [
  {tx:1,ty:2},
  {tx:2,ty:2},
  {tx:2,ty:1},
  {tx:3,ty:1}
]
```

(First BFS parent chain under N,E,S,W; if an equally short alternate appears in an
implementation detail, tests pin **length === 4** and **no cell with collision === 1**.)

**Example C** — blocked goal:

```
findPath(kitchenGrid, {tx:4,ty:2}, {tx:2,ty:3})  // table
→ null
```

**Example D** — start === goal:

```
findPath(kitchenGrid, {tx:4,ty:4}, {tx:4,ty:4})
→ [{tx:4,ty:4}]
```

### 2.5 Tests (`pathfind.test.ts`) — literal

| Call / scenario                                 | Expected                                       |
| ----------------------------------------------- | ---------------------------------------------- |
| Example A                                       | path equal to the four tiles above             |
| Example B                                       | length 4; never includes `(1,1)` or `(2,3)`    |
| Example C                                       | `null`                                         |
| Example D                                       | single-tile path                               |
| Start on wall `(0,0)` → any                     | `null`                                         |
| Mega-museum-sized empty open rect 28×16 corners | path length `28+16-1` (Manhattan) on open grid |
| Open 3×3 all walkable, start corner → opposite  | length 5                                       |

Build kitchen grid in tests by calling `getRoomForVenue('fridge')` / `ROOMS['home-kitchen']`
collision — do not hand-duplicate the wall ring incorrectly.

### 2.6 Wiring Mum (`#updateMumWander`)

Keep `nextWanderTarget` + pause-when-commission-target + 200–600 ms waypoint pause.

Change movement:

1. When Mum **arrives** at a patrol waypoint (or on first spawn), compute
   `path = findPathInRoom(room.width, room.height, room.collision, currentTile, nextPatrolTile)`.
2. Store remaining tiles in a small queue on the scene (or extend `WanderState` in
   `npcWander.ts` with `path: TileMarker[]` / `pathIndex` — pure helpers preferred).
3. Each frame: `stepToward` the **next path tile** (not the far patrol waypoint).
4. On arrive at a path tile, advance index; when path exhausted, treat as patrol
   waypoint arrived → pause → `nextWanderTarget` → repath.
5. If `findPath` returns `null`, **skip** that waypoint (`nextWanderTarget` again) so
   Mum never soft-locks. Log-free.

**Optional staff:** if 21a spawned staff with patrol arrays, reuse the same queue +
`findPath` helper. Not required if staff are desk-anchored only.

**MUST NOT** add Arcade colliders to Mum as a substitute for pathfinding (clipping
sprites looks worse than tile routing).

---

## 3. F6 — Reduced-motion profile (`reducedVfx`)

### 3.1 Name lock

| Name            | Status                                       |
| --------------- | -------------------------------------------- |
| `reducedVfx`    | **Canonical** (boss plan + this spec)        |
| `reducedMotion` | **Do not add** — alias forbidden in snapshot |

21d particles/confetti and 21f NPC/camera **MUST** read `snapshot.reducedVfx`.

### 3.2 Source of truth

```ts
/** True when the OS/browser requests fewer animations. */
export function prefersReducedMotion(
	media: { matches: boolean } | null | undefined = globalThis.matchMedia?.(
		'(prefers-reduced-motion: reduce)'
	)
): boolean {
	return Boolean(media?.matches);
}
```

Place in `interactPrompt.ts` **or** a one-liner next to snapshot assembly — pure and
unit-tested with a fake `{ matches: true/false }`.

`StudioFloor` / `+page` when building `StudioSnapshot`:

```ts
reducedVfx: prefersReducedMotion();
```

Default `false` when `matchMedia` is missing (SSR/prerender — studio floor is
client-only anyway).

### 3.3 Consumers in 21f MVP

When `snapshot.reducedVfx === true`:

| System            | Behaviour                                                               |
| ----------------- | ----------------------------------------------------------------------- |
| Mum patrol pause  | Use the **high** end of pause range only (always ~600 ms) — less fidget |
| Camera            | Disable any follow lerp / look-ahead if F2 was added; hard follow OK    |
| Ambient NPC dens. | If 21a density helpers exist, treat as “low”; else no-op                |
| Particles (21d)   | Out of zone — document only: 21d **MUST** no-op emitters when true      |

Re-read the flag on each `sync` (player can toggle OS setting mid-session).

### 3.4 Docs

Studio README **MUST** state:

> `StudioSnapshot.reducedVfx` mirrors `prefers-reduced-motion: reduce`. Spec 21f uses it
> for NPC pacing / camera; spec 21d uses it for particles and confetti. One field, both
> consumers.

---

## 4. Catalog extras (MAY / follow-up — not required for DoD)

| #   | Feature                  | Note                                                              |
| --- | ------------------------ | ----------------------------------------------------------------- |
| F2  | Camera follow easing     | Optional lerp toward player; **off** when `reducedVfx`            |
| F3  | Minimap (mega-museum)    | Tiny zone dots — separate pass                                    |
| F5  | Gamepad / Space interact | `INTERACT_KEYS` already hints Space; map if cheap                 |
| F7  | Performance budget       | Cap ambient NPCs via `deviceMemory` — coordinate with 21a density |

Do **not** block MVP on these.

---

## 5. Definition of done

- [ ] `interactPromptLabel` unit tests match the fallback table; registry label wins when set.
- [ ] World interact prompt shows contextual verbs (Talk to Mum / Work at desk / View show / …), not a bare mute E-only affordance.
- [ ] `findPath` / `findPathInRoom` unit tests cover examples A–D + null / mega open grid.
- [ ] Mum patrol uses BFS tile paths; she does not slide through kitchen fridge/table tiles.
- [ ] `reducedVfx` is on the snapshot (default false), set from `prefers-reduced-motion`, documented in studio README; 21f respects it for Mum pause (and camera if F2 shipped).
- [ ] `StudioScene` edits limited to prompt draw + Mum path follow (+ optional camera); spawn/registry/particles untouched.
- [ ] `npm run check`, `npm run lint`, and
      `npm run test:unit -- --run src/lib/studio/pathfind.test.ts src/lib/studio/interactPrompt.test.ts`
      (plus full owned suite) green.
- [ ] `src/lib/studio/README.md` + `docs/agent-log.md` handoff.

---

## 6. Explicitly out of scope

- New economy, shops, XP, or save schema.
- Audio assets or `adt.audio.v1` (21c).
- Particle / confetti implementation (21d) — only the shared `reducedVfx` contract.
- Bark bubbles / ambient events (21e).
- Dedicated Mum spritesheet (21a).
- Interactable fridge/toolkit behaviour (21b) — labels only.
- Editing `src/lib/types/contracts.ts`.
- New npm dependencies.
- Full A\* with funnel smoothing / navmeshes.

---

## 7. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/21f-studio-qol.md`.
>
> **Worktree (orchestrator creates before you start):**
> `git worktree add -b agent/studio-qol ../adt-wt-studio-qol main`
> Work in `../adt-wt-studio-qol` (absolute:
> `C:\Users\JensenM\Documents\My Apps\adt-wt-studio-qol` if created beside the repo).
>
> Read these files completely before writing any code:
>
> 1. `best-practices.md` — the binding rules for this repo
> 2. `docs/architecture.md` — how the system fits together
> 3. `src/lib/types/contracts.ts` — frozen types (do not edit)
> 4. `docs/tasks/21f-studio-qol.md` — your spec
> 5. `docs/tasks/21-boss-plan.md` — `reducedVfx` name lock + StudioScene conflict order
> 6. `docs/tasks/21-living-studio.md` §F — catalog context
> 7. `src/lib/studio/README.md` and `docs/agent-log.md` (spec 19 pathfinding gap)
>
> Also skim `StudioScene.#updateInteractPrompt` / `#updateMumWander` and
> `npcWander.ts` so you extend rather than rewrite spawn flows.
>
> Ownership zone is listed in the spec. Method-level StudioScene ownership: prompt
> label drawing + Mum path-following only. Do not edit NPC spawn, 21b prop handlers,
> or 21d particles. Do not edit `package.json`, `vite.config.ts`, `tsconfig.json`, or
> `src/lib/types/**`. Do not run `npm install`. Do not run any state-changing git
> command — no commit, add, checkout, merge, or push.
>
> Rebase / sync note: if 21a or 21b already touched `StudioScene` on another branch,
> implement against the tree the orchestrator gives you; do not fight their spawn or
> registry code — only replace straight-line Mum steps with `findPath` queues and
> contextual prompt text.
>
> Implement every required file in the spec, including tests. Then run:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run src/lib/studio
> ```
>
> Finally, update `src/lib/studio/README.md` and append your handoff entry to
> `docs/agent-log.md` using the template in `best-practices.md` §6.3.
