# Spec 17 — Phaser Studio Floor (walkable pixel studio)

**Worktree:** `git worktree add -b agent/phaser-studio ../adt-wt-phaser-studio main`
**Depends on:** Specs 01–04 and 12–16 merged (playable loop + venues + staff auto-invite).
Does **not** depend on specs 05–11 (AI engines). The studio floor is a presentation layer
over whatever engine is active.

## Mission

The game currently feels like a menu: invite client → type prompt → collect cash, all
inside nested panels in a CSS “kitchen”. This spec turns the Level 1 space into a small
**old-school tilemap room** the player can walk around in:

1. A **house / kitchen studio** built from a tilemap + furniture sprites.
2. The **player character** walks with arrow keys / WASD (and a simple mobile D-pad).
3. **Clients walk in** the door and wait; the player walks up and talks to them
   (interact) to open the existing briefing UI.
4. At the **drawing table**, a short **work loop animation** plays while
   `generating` / `critiquing`.
5. Finished pieces hang on **easels / fridge magnets** in the room — more slots as the
   player unlocks better gallery venues (spec 14).

SvelteKit stays the app shell (HUD, shops, prompt, results, AI). **Phaser 3** owns only
the studio canvas. Domain rules, `GameStore`, and engines do not move into Phaser.

---

## Ownership zone

```
New:
  src/lib/studio/**
  src/lib/components/StudioFloor.svelte
  src/lib/components/StudioFloor.svelte.test.ts
  src/lib/components/StudioHudOverlay.svelte
  src/lib/components/StudioHudOverlay.svelte.test.ts
  static/studio/**
  static/studio/CREDITS.md
  docs/tasks/17-phaser-studio.md          ← already exists; update Definition of done ticks only if needed

Edit (small, targeted):
  package.json                            ← add `phaser` dependency ONLY (see §1)
  package-lock.json                       ← from `npm install phaser`
  src/lib/stores/gameState.svelte.ts      ← setAutoInviteAction only (§3.3 / §8)
  src/lib/stores/gameState.svelte.test.ts
  src/lib/components/GameScene.svelte
  src/lib/components/index.ts
  src/lib/components/README.md
  src/routes/+page.svelte                 ← mount StudioFloor + overlay wiring, see §8
  e2e/game-loop.e2e.ts                    ← walk/interact path, see §10
  docs/tasks/README.md
  docs/architecture.md                    ← add §3.1 studio layer paragraph only
  docs/agent-log.md                       ← handoff entry
```

**Allowed exception vs the usual agent prompt:** this spec **may** edit `package.json` /
`package-lock.json` to add `phaser`. Do not add any other dependency. Do not edit
`vite.config.ts`, `tsconfig.json`, or `src/lib/types/contracts.ts`.

Do **not** delete `KitchenScene.svelte` — keep it reachable behind a feature flag
`STUDIO_FLOOR_ENABLED` (default `true`) so a broken Phaser boot can fall back.

Do **not** put scoring, payout, brief picking, or engine calls inside Phaser scenes.
Phaser emits intents; Svelte/`GameStore` executes them.

---

## 1. Dependency

```bash
npm install phaser
```

Pin whatever current Phaser 3.x `npm` resolves (3.80+). Import only from `'phaser'` —
no CDN script tags. The game remains `adapter-static`; Phaser runs entirely client-side.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  SvelteKit (+page, GameMenuBar, shops, EnginePicker)        │
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │ StudioFloor.svelte   │  │ StudioHudOverlay.svelte     │  │
│  │  mounts Phaser.Game  │  │  Idle / brief / prompt /    │  │
│  │  destroys on unmount │  │  results panels (existing)  │  │
│  └──────────┬───────────┘  └──────────────▲──────────────┘  │
│             │ studioBridge events          │ game.phase     │
│             ▼                              │                │
│  src/lib/studio/bridge.ts  ←── syncSnapshot(game → phaser)  │
└─────────────────────────────────────────────────────────────┘
```

| Layer                | Owns                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| `GameStore`          | phases, cash, briefs, generate/critique, gallery                         |
| `studioBridge`       | typed events + snapshot push; no Phaser imports in tests of pure helpers |
| Phaser `StudioScene` | tiles, sprites, pathing, animations, interact prompts                    |
| `StudioHudOverlay`   | existing commission UI, positioned over / beside the canvas              |

---

## 3. `src/lib/studio/` layout

```
src/lib/studio/
  README.md
  bridge.ts                 ← StudioBridge class + event/snapshot types
  bridge.test.ts
  config.ts                 ← tile size, speeds, interact key, feature flag
  rooms.ts                  ← room definitions → tile grid + object markers
  rooms.test.ts
  easelLayout.ts            ← venueId → easel slot count + pixel anchors
  easelLayout.test.ts
  createGame.ts             ← createPhaserGame(parent, bridge) factory
  scenes/
    BootScene.ts            ← load atlases / tilemap JSON from /studio/
    StudioScene.ts          ← gameplay scene
  README.md
```

### 3.1 `config.ts`

```ts
/** When false, GameScene renders KitchenScene instead of StudioFloor. */
export const STUDIO_FLOOR_ENABLED = true;

export const TILE_SIZE = 16;
export const PLAYER_SPEED = 80; // px/sec
export const CLIENT_SPEED = 60;
export const INTERACT_RANGE_PX = 28;
/** Keyboard interact. Also accept Space and gamepad A later — not required. */
export const INTERACT_KEYS = ['E', 'e'] as const;
```

### 3.2 `bridge.ts` — exact surface

```ts
import type { GamePhase, GalleryEntry, ClientBrief } from '$lib/types/contracts';

export type StudioOutboundEvent =
	| { type: 'ready' }
	| { type: 'talk-to-client' }
	| { type: 'open-gallery-entry'; entryId: string }
	| { type: 'interact-desk' };

export type StudioInboundCommand =
	| { type: 'sync'; snapshot: StudioSnapshot }
	| { type: 'summon-client' }
	| { type: 'dismiss-client' };

export interface StudioSnapshot {
	phase: GamePhase;
	/** Null when idle / levelComplete with no active brief. */
	client: Pick<ClientBrief, 'id' | 'clientName' | 'avatarUrl'> | null;
	/** Pieces currently on display (same list as FridgeGallery). */
	displayedEntries: GalleryEntry[];
	activeVenueId: string;
	/** True when Marketing Director (or future staff) will auto-summon. */
	autoInviteArmed: boolean;
}

export type StudioListener = (event: StudioOutboundEvent) => void;

export class StudioBridge {
	#listeners = new Set<StudioListener>();
	#commandHandler: ((cmd: StudioInboundCommand) => void) | null = null;
	lastSnapshot: StudioSnapshot | null = null;

	subscribe(listener: StudioListener): () => void;
	/** Phaser registers this once in StudioScene.create. */
	setCommandHandler(handler: ((cmd: StudioInboundCommand) => void) | null): void;
	emit(event: StudioOutboundEvent): void;
	send(cmd: StudioInboundCommand): void;
	/** Convenience: send({ type: 'sync', snapshot }). */
	sync(snapshot: StudioSnapshot): void;
}
```

Behaviour:

- `emit` fans out to all Svelte subscribers.
- `send` / `sync` no-op until Phaser registers a command handler (safe during boot).
- `bridge.test.ts` covers subscribe/unsubscribe, sync buffering of `lastSnapshot`, and
  that `send` before handler registration does not throw.

### 3.3 Client flow (no new `GamePhase`)

Do **not** add phases to `contracts.ts`. Use this sequence:

| Step | Who                                                                           | What                                                                                                            |
| ---- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1    | Player clicks **Invite Client** in HUD, **or** Marketing Director timer fires | `+page` calls `bridge.send({ type: 'summon-client' })` **instead of** immediately calling `game.inviteClient()` |
| 2    | Phaser                                                                        | Client sprite walks from door marker → waiting marker; shows “E — Talk” when player is in range                 |
| 3    | Player presses E near client                                                  | Phaser `emit({ type: 'talk-to-client' })`                                                                       |
| 4    | `+page`                                                                       | calls `game.inviteClient()` → existing `briefing` UI opens in `StudioHudOverlay`                                |
| 5    | Commission completes / error dismiss / collect cash back to `idle`            | `+page` `bridge.send({ type: 'dismiss-client' })` and `sync(...)`                                               |

While a summoned client is waiting and phase is still `idle`, the HUD **Invite Client**
button is disabled (or labelled “Client at the door…”) so the player cannot double-summon.

If `inviteClient()` is called while already not `idle`, keep existing early-return.

**Marketing Director:** replace the direct `inviteClient()` inside
`GameStore.#scheduleAutoInvite` with an injectable callback so the page can summon
visually first:

```ts
// Additive on GameStoreDeps — default remains () => this.inviteClient()
autoInviteAction?: () => void;
```

In `GameStore` constructor:

```ts
this.#autoInviteAction = deps?.autoInviteAction ?? (() => this.inviteClient());
```

Timer callback calls `this.#autoInviteAction()` instead of `this.inviteClient()`.

`+page` constructs / rebinds so auto-invite runs `bridge.send({ type: 'summon-client' })`.
Unit tests in `gameState.svelte.test.ts` that assert auto-invite still pass when using
the default dep; add one test that a custom `autoInviteAction` is invoked instead of
changing phase.

**Ownership note:** editing `gameState.svelte.ts` for this one injectable is already in
the ownership zone above. Keep the diff ≤ ~25 lines.

---

## 4. Rooms & tilemap

### 4.1 `rooms.ts`

Define **one shippable room** for Level 1 (`home-kitchen`). Levels 2–4 may reuse the
same scene with different `RoomId` configs later; stubs are enough:

```ts
export type RoomId = 'home-kitchen' | 'art-room' | 'studio' | 'gallery';

export interface TileMarker {
	/** Tile coordinates (not pixels). */
	tx: number;
	ty: number;
}

export interface RoomDef {
	id: RoomId;
	/** Width/height in tiles. Level 1: 20×14. */
	width: number;
	height: number;
	/**
	 * Collision grid: 0 walkable, 1 blocked.
	 * Length === width * height, row-major.
	 */
	collision: readonly number[];
	/** Ground tile indices into the tileset (same length as collision). */
	ground: readonly number[];
	door: TileMarker;
	clientWait: TileMarker;
	desk: TileMarker;
	playerSpawn: TileMarker;
	/** Fridge / magnet wall for venue `fridge`. */
	fridgeAnchor: TileMarker;
}

export const ROOMS: Record<RoomId, RoomDef>;
export function getRoomForEnvironment(environmentId: string): RoomDef;
```

`home-kitchen` must be a real hand-authored layout (walls, door gap, table block,
fridge wall). Other room ids may clone `home-kitchen` with a TODO comment — do not block
on Level 2 art.

`rooms.test.ts`: `home-kitchen` arrays length === width*height; door/desk/spawn are
in-bounds and walkable (`collision[i] === 0`).

### 4.2 Boot assets → Phaser tilemap

In `BootScene`, build a Phaser tilemap from `RoomDef` (no Tiled editor required for v1):

- Load tileset image from `/studio/tiles/walls-floors.png`
- Create blank map `width`×`height`, put `ground` indices, set collision from `collision`
- Place furniture sprites from `/studio/tiles/furniture.png` frame names listed in
  `rooms.ts` comments (table, chair, fridge, door mat)

---

## 5. Assets (CC0 / commercial OK)

All binaries live under `static/studio/`. **Only CC0 or explicit commercial-use-OK
licenses.** Prefer [Kenney.nl](https://kenney.nl/assets) (CC0).

### 5.1 Required packs (download during implementation)

| Pack                                                            | URL                                        | Use                            |
| --------------------------------------------------------------- | ------------------------------------------ | ------------------------------ |
| Kenney Furniture Kit                                            | https://kenney.nl/assets/furniture-kit     | Table, chairs, fridge, shelves |
| Kenney Tiny Dungeon **or** 1-Bit Pack / Roguelike indoor floors | https://kenney.nl/assets/tiny-dungeon      | Floor/wall tiles (16×16)       |
| Kenney Toon Characters 1 **or** Abstract Platformer characters  | https://kenney.nl/assets/toon-characters-1 | Player + 2–3 client variants   |
| (Optional) Kenney Input Prompts                                 | https://kenney.nl/assets/input-prompts     | “E” prompt bubble              |

If a pack’s native size is not 16×16, either pick another Kenney pack that is, or scale
sprites consistently in BootScene — document the choice in `static/studio/CREDITS.md`.

### 5.2 On-disk layout

```
static/studio/
  CREDITS.md                 ← pack name, URL, license (CC0), files used
  tiles/
    walls-floors.png
    furniture.png
  characters/
    player.png               ← spritesheet: idle + walk 4-dir + work loop
    clients.png              ← 2–3 NPCs, walk + idle
  ui/
    prompt-e.png             ← optional
```

`CREDITS.md` must list every third-party file. No asset without a license line.

### 5.3 Work-at-table animation

Prefer a **spritesheet animation** (not a GIF). Frames: `work_0` … `work_N` (N ≥ 3),
looping while `phase` is `generating` or `critiquing` and the player is snapped to the
desk (see §6).

If the chosen Kenney pack has no draw/work frames: create a minimal 4-frame strip by
recolouring/compositing idle frames + a pencil/tool overlay in the spritesheet, still
CC0-derived, and note that in `CREDITS.md`. Do not hotlink external GIFs.

### 5.4 Download rule for agents

Use `curl` / `Invoke-WebRequest` to fetch the Kenney ZIP, extract only the needed PNGs
into `static/studio/`, and delete the ZIP. Do not commit full unused pack trees.

---

## 6. `StudioScene` behaviour

### 6.1 Player

- Spawn at `playerSpawn`.
- Arcade physics body, collide with tile collision layer + furniture bodies.
- Animations: `idle-*`, `walk-*` for down/left/right/up; `work` at desk.
- Input: cursors + WASD. On touch viewports (`pointer` coarse or width &lt; 640), show an
  on-canvas virtual D-pad + interact button (simple circles are fine — no third-party UI
  pack required).

### 6.2 Interact

When player distance to a target &lt; `INTERACT_RANGE_PX` and an interact key / button
is pressed:

| Target         | Condition                               | Emit                                                     |
| -------------- | --------------------------------------- | -------------------------------------------------------- |
| Waiting client | client present, phase `idle`            | `talk-to-client`                                         |
| Desk           | phase `briefing` (optional convenience) | `interact-desk` (HUD may focus prompt — MAY no-op in v1) |
| Easel with art | entry present                           | `open-gallery-entry`                                     |

Show a floating “E” prompt above the active target.

### 6.3 Client NPC

On `summon-client`:

1. Pick a random client frame from `clients.png`.
2. Spawn at `door`, tween/move to `clientWait` at `CLIENT_SPEED`.
3. Face toward room center; idle anim.
4. Until `talk-to-client` handled and phase leaves `idle`, stay put.
5. On `dismiss-client` or sync where `client === null` && phase `idle`: walk to door and
   destroy sprite.

Do not call `GameStore` from the scene.

### 6.4 Desk work animation

When `snapshot.phase` is `generating` or `critiquing`:

- Move/snap player to `desk` (short walk or instant — pick instant for v1 reliability).
- Play `work` animation loop.
- Ignore walk input until phase leaves those states.

When `briefing` / `results` / `failed`: player may walk again; client may stay near desk
or waiting spot (implementer’s choice; document in studio README). Prefer client idles
near desk during briefing.

### 6.5 Easels

`easelLayout.ts`:

```ts
export interface EaselSlot {
	tx: number;
	ty: number;
	/** 'magnet' = fridge style; 'easel' = freestanding for bigger venues. */
	kind: 'magnet' | 'easel';
}

/** How many on-floor display slots for a venue id (≤ venue.capacity). */
export function slotsForVenue(venueId: string, room: RoomDef): EaselSlot[];
```

| Venue id       | Slots on floor | Kind                   |
| -------------- | -------------- | ---------------------- |
| `fridge`       | 3              | magnet on fridge wall  |
| `garage`       | 6              | mix magnets + 2 easels |
| `storefront`   | 8              | easels                 |
| `gallery-hall` | 10             | easels                 |
| `mega-museum`  | 12             | easels                 |

Cap visual slots below `capacity` for mega venues — the HUD gallery strip still shows
the full displayed list. Phaser shows the first N `displayedEntries` (same order as
`game.displayedGalleryEntries`).

Each filled slot: easel/magnet sprite + stretched thumbnail from `entry.imageUrl`
(`Phaser.GameObjects.Image` / `load.image` with unique keys per entry id; unload on
replace). Clicking / interacting a slot emits `open-gallery-entry`.

`easelLayout.test.ts`: fridge → 3 magnets; unknown venue → fridge fallback; all slots
in-bounds for `home-kitchen`.

---

## 7. Svelte components

### 7.1 `StudioFloor.svelte`

```ts
interface Props {
	bridge: StudioBridge;
	/** CSS size of the game parent; default min-height 420px. */
	class?: string;
}
```

- `onMount`: `createPhaserGame(containerEl, bridge)`, store game ref.
- `onDestroy`: `game.destroy(true)` — **required** (HMR + route changes).
- Parent `div` has `data-testid="studio-floor"`.
- Do not import Phaser inside the test file; mock `createGame` module.

### 7.2 `StudioHudOverlay.svelte`

Presentational wrapper that renders the **same phase panels** currently inside
`+page`’s `workspace` snippet (`IdlePanel`, `ClientCard`, `PromptComposer`, etc.).

Props: whatever `+page` already needs (phase, client, draftPrompt bindings, handlers).
Keep it thin — move JSX/markup from the workspace snippet into this component so the
canvas + HUD layout can be:

```
<div class="studio-shell">
  <StudioFloor {bridge} />
  <StudioHudOverlay ... />
</div>
```

HUD is a right-side or bottom panel on desktop; bottom sheet on narrow screens. Do not
cover the whole canvas while `idle` (only a compact invite control + hint:
“Walk with WASD · E to talk”).

### 7.3 `GameScene.svelte`

```svelte
{#if STUDIO_FLOOR_ENABLED}
  <!-- children / snippets supplied by +page: floor is sibling, not inside KitchenScene -->
  {@render studio?.()}
{:else if environment.id === 'home-kitchen'}
  <KitchenScene ...>
{:else}
  <SceneComingSoon ... />
{/if}
```

Simplest path that avoids fighting snippets: **`+page` bypasses KitchenScene when the
flag is on** and renders `StudioFloor` + `StudioHudOverlay` directly; `GameScene`
gains an optional path or `+page` stops using `GameScene` for Level 1.

Pick one and document it in `src/lib/components/README.md`:

**Preferred:** `+page` for `home-kitchen` + flag uses studio shell; `GameScene` remains
for fallback / coming-soon levels.

---

## 8. `+page.svelte` wiring

1. Create `const studioBridge = new StudioBridge()` (module or component scope).
2. `$effect` / reactive sync whenever phase, client, displayed gallery, venue, or hired
   staff auto-invite eligibility changes → `studioBridge.sync(snapshot)`.
3. `studioBridge.subscribe`:
   - `talk-to-client` → `game.inviteClient()`
   - `open-gallery-entry` → existing `openFullView` for matching entry
   - `ready` → immediate `sync`
4. Idle invite button → `studioBridge.send({ type: 'summon-client' })` (not direct
   `inviteClient`).
5. After `collectCash` / `dismissError` paths that return to idle → `dismiss-client`.
6. Pass `autoInviteAction: () => studioBridge.send({ type: 'summon-client' })` into
   `GameStore` — if the store is a singleton already constructed, add
   `game.setAutoInviteAction(fn)` instead of constructor-only injection:

```ts
/** Spec 17: override Marketing Director arrival. Default inviteClient. */
setAutoInviteAction(fn: () => void): void;
```

Prefer `setAutoInviteAction` on the existing singleton so `+page` can call it in
`onMount` without reconstructing the store. Default remains `() => this.inviteClient()`.

---

## 9. Architecture doc touch

In `docs/architecture.md` §3 (layer map), add a short **§3.1 Studio floor** after the
ASCII diagram:

- Phaser canvas is presentation-only.
- `StudioBridge` is the only seam between Svelte and Phaser.
- Static assets under `/studio`, CC0 credited in `CREDITS.md`.

Do not rewrite §9 deferred list except to note that walkable studio is spec 17.

---

## 10. Tests & e2e

### Unit / component

| File                              | Must assert                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `bridge.test.ts`                  | subscribe, sync, send-before-handler safe                         |
| `rooms.test.ts`                   | kitchen grid integrity                                            |
| `easelLayout.test.ts`             | venue → slot counts                                               |
| `StudioFloor.svelte.test.ts`      | mounts host with `data-testid="studio-floor"`; mocks `createGame` |
| `StudioHudOverlay.svelte.test.ts` | idle shows invite; briefing shows composer                        |
| `gameState.svelte.test.ts`        | `setAutoInviteAction` / dep override                              |

Do **not** boot a real WebGL Phaser.Game in Vitest. Mock `createGame.ts`.

### E2E (`e2e/game-loop.e2e.ts`)

Update the happy path:

1. Wait for `studio-floor`.
2. Click Invite Client (summon).
3. Use keyboard: move toward client (dispatch keydown WASD/E as needed) **or** expose
   `data-testid="studio-debug-talk"` button visible only when `import.meta.env.DEV` /
   Playwright sets `?studioDebug=1` — **required escape hatch** so e2e is not flaky on
   pathfinding.

**Required:** when URL has `studioDebug=1`, `StudioHudOverlay` shows a button
`Talk to client` that emits the same path as Phaser `talk-to-client` (calls
`inviteClient`). Playwright uses that. Manual players still use walk + E.

4. Rest of commission loop unchanged (prompt, create, collect).

---

## 11. Out of scope

- Multiplayer, pathfinding libraries, dialog trees.
- Per-level unique tilesets for art-room / studio / gallery (stubs OK).
- Staff sprites walking the floor (spec 16 stays off-screen income).
- Replacing shop UIs with in-world shops.
- GIFs as primary animation format.
- Godot / Unity / Capcom-style engine migration.
- Editing AI engines or `contracts.ts` phases.

---

## 12. Definition of done

- [ ] `phaser` in `package.json`; app builds with `adapter-static`
- [ ] Level 1 loads a tilemap kitchen; player walks with WASD/arrows
- [ ] Invite / auto-invite summons a client who walks in; E (or debug button) starts briefing
- [ ] Work loop anim plays at the desk during generating/critiquing
- [ ] Easels/magnets show displayed art; count grows with venue tier
- [ ] `static/studio/CREDITS.md` lists CC0 (or commercial-OK) sources
- [ ] Phaser destroyed on component teardown
- [ ] `STUDIO_FLOOR_ENABLED = false` restores KitchenScene path
- [ ] `npm run check`, `lint`, `test:unit -- --run` green
- [ ] `npm run test:e2e` passes with `studioDebug=1` path
- [ ] `src/lib/studio/README.md` + components README updated
- [ ] Handoff appended to `docs/agent-log.md`

---

## 13. Prompting the implementing agent

> Implement the spec at `docs/tasks/17-phaser-studio.md`.
>
> Read these four files completely before writing any code:
>
> 1. `best-practices.md`
> 2. `docs/architecture.md`
> 3. `src/lib/types/contracts.ts`
> 4. `docs/tasks/17-phaser-studio.md`
>
> Ownership zone is listed in the spec. You **may** edit `package.json` / lockfile to
> add `phaser` only. You may edit `gameState.svelte.ts` only for `setAutoInviteAction`
> (or `autoInviteAction` dep) as specified. Do not edit `src/lib/types/contracts.ts`.
> Do not add server routes. Do not run git commits.
>
> Download Kenney CC0 assets into `static/studio/` and write `CREDITS.md`.
> Prefer spritesheets over GIFs. Mock Phaser in unit tests; use `studioDebug=1` for e2e.
>
> Then run:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Append a handoff entry to `docs/agent-log.md`.
