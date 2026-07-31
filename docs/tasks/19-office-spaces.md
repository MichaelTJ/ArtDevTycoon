# Spec 19 — Office Spaces (sized rooms, textures, resident Mum)

**Worktree:** work in the main tree (or `git worktree add -b agent/office-spaces ../adt-wt-office-spaces main` if another agent is hot on overlapping files). Prefer main when specs 17–18 are already merged and no concurrent studio agent is running.
**Depends on:** Specs 17 (Phaser studio floor) and 18 (Mum kitchen briefs) merged. Does **not** depend on 05–11.

## Mission

Spec 17 shipped one oversized kitchen (`20×14`) that every venue clones. Spec 18 made the
words Mum says escalate, but the floor still treats every client as a door visitor who
walks in and leaves.

This spec makes the **spaces** feel like a tycoon ladder:

1. **Mum's kitchen is small** — a cramped `6×6` tile room (inner walkable floor ≈ `4×4`
   after walls). Warm kitchen textures. Enough for a desk, fridge magnets, and two people.
2. **Mum is a resident NPC** — she always wanders the kitchen. She is the first client
   (and every later Mum brief). She does **not** enter through the door and does **not**
   leave after cash-out; she just keeps walking around.
3. **Bigger venues unlock bigger, denser floors** — garage, storefront, gallery hall, and
   mega-museum each get their own size, ground/wall tile palette, furniture density, and
   (from storefront up) distinct **zones** (work room vs show gallery) with doorways
   between them.
4. **Non-Mum clients still come and go** through the door once the brief is not Mum,
   while Mum (when present) keeps pacing in the background.

Presentation only. Scoring, briefs, engines, and venue unlock _economy_ stay where they
are (specs 14 / 18). This spec owns the Phaser layouts and the resident-NPC client flow.

---

## Ownership zone

```
New:
  src/lib/studio/npcWander.ts
  src/lib/studio/npcWander.test.ts
  src/lib/studio/venueRooms.ts          ← venueId → RoomId mapping helpers
  src/lib/studio/venueRooms.test.ts
  static/studio/characters/mum.png      ← optional dedicated sheet; see §5
  docs/tasks/19-office-spaces.md        ← this file (DoD ticks only after impl)

Edit:
  src/lib/studio/rooms.ts
  src/lib/studio/rooms.test.ts
  src/lib/studio/config.ts              ← extra TILE indices only
  src/lib/studio/easelLayout.ts
  src/lib/studio/easelLayout.test.ts
  src/lib/studio/bridge.ts              ← additive snapshot/command fields §3
  src/lib/studio/bridge.test.ts
  src/lib/studio/createGame.ts
  src/lib/studio/scenes/BootScene.ts
  src/lib/studio/scenes/StudioScene.ts
  src/lib/studio/README.md
  static/studio/CREDITS.md              ← if new frames / mum sheet
  src/routes/+page.svelte               ← summon / dismiss wiring only (§6)
  src/lib/components/StudioFloor.svelte.test.ts   ← only if mocks need new snapshot fields
  docs/tasks/README.md                  ← Wave E row
  docs/architecture.md                  ← one paragraph under §3.1
  docs/agent-log.md                     ← handoff
```

**MUST NOT** edit: `package.json`, lockfiles, `src/lib/types/contracts.ts`,
`src/lib/game/**`, `src/lib/data/**` (including kitchen briefs / venues economy),
engine files, or unrelated components.

Do **not** change Mum's `clientName` string — it is exactly `Mum` (spec 18). Phaser
detects residency with `clientName === 'Mum'` (case-sensitive).

---

## 1. Venue → room mapping

| Venue id (`unlockedVenueId`) | Room id        | Size (tiles W×H) | Texture read                      | Layout shape                                     |
| ---------------------------- | -------------- | ---------------- | --------------------------------- | ------------------------------------------------ |
| `fridge`                     | `home-kitchen` | **6×6**          | Warm wood + kitchen floor         | Single tiny room; Mum resident; fridge magnets   |
| `garage`                     | `art-room`     | 12×10            | Cool concrete + darker walls      | Single room; workbench; wall easels              |
| `storefront`                 | `studio`       | 18×12            | Polished wood + carpet strip      | Two zones: **work** (W) + **window display** (E) |
| `gallery-hall`               | `gallery`      | 22×14            | Light museum stone + white walls  | Two zones: **atelier** + **show gallery**        |
| `mega-museum`                | `gallery`\*    | 28×16            | Same museum palette, richer props | Three zones: atelier + gallery + foyer           |

\*Mega-museum reuses `RoomId` `'gallery'` with a separate builder keyed by venue
(`buildGalleryHall()` vs `buildMegaMuseum()`), exposed through `getRoomForVenue(venueId)`.
Do **not** invent a fifth `RoomId` unless tests stay clearer that way — if you add one,
name it `'mega-museum'` and extend the `RoomId` union + `ROOMS` map.

```ts
// src/lib/studio/venueRooms.ts
import type { RoomDef, RoomId } from './rooms';

/** Maps progressive gallery venue → floor plan. Unknown → fridge kitchen. */
export function roomIdForVenue(venueId: string): RoomId;

/** Full authored RoomDef for the active venue (not the Level environment stub). */
export function getRoomForVenue(venueId: string): RoomDef;
```

`getRoomForEnvironment(environmentId)` **remains** for Level 2+ stubs and CSS scene
labels. Phaser **MUST** load the floor from `getRoomForVenue(snapshot.activeVenueId)`
on create and whenever `activeVenueId` changes in a sync (rebuild tilemap — see §7).

`createGame.ts` currently hardcodes `'home-kitchen'` — stop doing that. Pass the initial
venue through the registry (`game.registry.set('initialVenueId', venueId)`) from
`StudioFloor`, defaulting to `'fridge'`.

---

## 2. `RoomDef` extensions

Extend (additive) the existing interface in `rooms.ts`:

```ts
export type RoomZoneId = 'work' | 'gallery' | 'foyer' | 'window';

export interface RoomZone {
	id: RoomZoneId;
	/** Inclusive tile bounds. */
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	label: string;
}

export interface ResidentNpcDef {
	/** Stable id for Phaser registry — use `mum` for Mum. */
	id: string;
	/** Matches ClientBrief.clientName when this NPC is the active client. */
	clientName: string;
	/** Spritesheet key loaded in BootScene (`mum` or `clients`). */
	spriteKey: string;
	/** Base frame index in that sheet. */
	frame: number;
	spawn: TileMarker;
	/** Patrol waypoints (tile coords, must be walkable). Length ≥ 2. */
	patrol: readonly TileMarker[];
}

export interface RoomDef {
	id: RoomId;
	width: number;
	height: number;
	collision: readonly number[];
	ground: readonly number[];
	door: TileMarker;
	clientWait: TileMarker;
	desk: TileMarker;
	playerSpawn: TileMarker;
	fridgeAnchor: TileMarker;
	furniture: readonly FurnitureProp[];
	/** Empty for single-room plans; ≥2 for storefront / halls. */
	zones: readonly RoomZone[];
	/** Kitchen has Mum; higher venues may be []. */
	residents: readonly ResidentNpcDef[];
	/**
	 * Optional second tileset tint key for walls — unused if ground already encodes
	 * walls. Kept for docs; implementers MAY ignore and bake walls into `ground`.
	 */
	palette: 'kitchen' | 'garage' | 'storefront' | 'museum';
}
```

### 2.1 `home-kitchen` — exact size and markers

```
width = 6, height = 6
Outer ring = walls (collision 1). Door gap on north wall at (tx=2, ty=0) walkable.
Inner walkable: tx 1..4, ty 1..4 (and door cell).

Markers (all walkable except desk solid furniture):
  door:         { tx: 2, ty: 0 }
  clientWait:   { tx: 2, ty: 1 }   // visitors stand just inside (non-Mum)
  desk:         { tx: 3, ty: 3 }   // walkable stand-spot beside table prop at (2,3)
  playerSpawn:  { tx: 1, ty: 4 }
  fridgeAnchor: { tx: 1, ty: 1 }

Furniture (solid):
  table frame 0 at (2,3)
  fridge/chest frame 2 at (1,1)

Mum resident:
  id: 'mum'
  clientName: 'Mum'
  spriteKey: 'mum'   // or 'clients' frame 0 if no dedicated sheet — see §5
  frame: 0
  spawn: { tx: 4, ty: 2 }
  patrol: [
    { tx: 4, ty: 2 },
    { tx: 4, ty: 4 },
    { tx: 1, ty: 4 },
    { tx: 1, ty: 2 },
    { tx: 3, ty: 1 }
  ]
```

Ground palette `kitchen`: floor tile `TILE.floor` on walkable cells, `TILE.woodFloor`
under desk/work cells `(2..3, 3..4)`, `TILE.wall` on wall ring.

`rooms.test.ts` **MUST** assert:

| Assertion                                                        | Expected |
| ---------------------------------------------------------------- | -------- |
| `ROOMS['home-kitchen'].width` / `.height`                        | `6`/`6`  |
| `collision.length` and `ground.length`                           | `36`     |
| `markerWalkable` for door, clientWait, desk, playerSpawn, patrol | `true`   |
| `residents[0].clientName`                                        | `'Mum'`  |
| `zones`                                                          | `[]`     |

### 2.2 Higher venues — required shape, not pixel-perfect art

Each builder (`buildGarage`, `buildStorefront`, `buildGalleryHall`, `buildMegaMuseum`)
**MUST**:

- Match the W×H table in §1.
- Use a **different** dominant ground tile than kitchen (see `TILE` additions in §2.3).
- Keep `desk`, `door`, `clientWait`, `playerSpawn` walkable.
- Provide `slotsForVenue`-friendly anchors: kitchen uses `fridgeAnchor`; others SHOULD
  place gallery-zone anchors so easels land in the show/window zone, not on the desk.
- Set `residents: []` (Mum only lives in `home-kitchen` for this spec).
- For multi-zone rooms: internal wall runs with **at least one** doorway gap so the
  player can walk between zones; list zones with non-overlapping bounds covering the
  interior.

Tests (literal):

| Room            | width×height | palette      | `zones.length` | `residents.length` |
| --------------- | ------------ | ------------ | -------------- | ------------------ |
| home-kitchen    | 6×6          | `kitchen`    | 0              | 1                  |
| art-room        | 12×10        | `garage`     | 0              | 0                  |
| studio          | 18×12        | `storefront` | ≥2             | 0                  |
| gallery (hall)  | 22×14        | `museum`     | ≥2             | 0                  |
| mega (whatever) | 28×16        | `museum`     | ≥3             | 0                  |

### 2.3 Extra tile indices (`config.ts`)

Additive only — keep existing `floor` / `wall` / `woodFloor`:

```ts
export const TILE = {
	floor: 0,
	wall: 12,
	woodFloor: 48,
	/** Cool grey concrete for garage. */
	concrete: 1,
	/** Darker wall variant if the packed sheet has one; else reuse `wall`. */
	garageWall: 12,
	/** Light stone / marble for museum floors. */
	museumFloor: 2,
	/** Carpet / rug strip for storefront window zone. */
	carpet: 49
} as const;
```

If the packed Kenney sheet does not contain a distinct index, pick the closest unused
index that reads differently in-game and document the choice in `CREDITS.md`. Do not
download a new pack unless Tiny Dungeon genuinely cannot supply contrast — then Kenney
only, CC0, same rules as spec 17 §5.

---

## 3. Bridge — resident-aware client flow

### 3.1 Snapshot (additive fields)

```ts
export interface StudioSnapshot {
	// ...existing fields...
	/**
	 * When true, the next talk target is the resident whose clientName will match
	 * the brief (Mum). Set by +page when arming a kitchen commission without a
	 * door visitor. Phaser shows “E — Talk” on Mum.
	 */
	residentClientArmed: boolean;
}
```

Default `residentClientArmed: false` in every existing test fixture that builds a
snapshot.

### 3.2 Commands

Keep `summon-client` / `dismiss-client`. Semantics change **inside Phaser**, not the
wire names:

| Command          | Kitchen (`home-kitchen` with Mum)                                                                                                                                                | Higher venues                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `summon-client`  | Do **not** spawn a door visitor. Set internal armed flag / rely on snapshot `residentClientArmed` so Mum becomes the talk target.                                                | Existing door → wait walk-in. |
| `dismiss-client` | If active client was Mum (or no door visitor exists): clear armed/commission highlight only; **Mum sprite stays**. If a door visitor exists: walk them out and destroy as today. | Existing walk-out.            |

### 3.3 Outbound events

No new event types required. `talk-to-client` / `deliver-to-client` still fire when the
player presses E near the **active commission target**:

- Armed resident Mum, or snapshot `client?.clientName === 'Mum'` → range-check Mum sprite.
- Else → range-check door visitor (existing `#client`).

---

## 4. `npcWander.ts` — pure patrol helper

Phaser movement stays in the scene; the **next waypoint** logic is pure and unit-tested.

```ts
export interface WanderState {
	waypointIndex: number;
	/** Tile the NPC is currently moving toward. */
	target: TileMarker;
}

/** Advance to the next patrol index (wrap). */
export function nextWanderTarget(patrol: readonly TileMarker[], currentIndex: number): WanderState;

/**
 * Pixel step toward target. Returns new position and whether the target tile center
 * was reached (distance ≤ arriveEpsilonPx).
 */
export function stepToward(
	x: number,
	y: number,
	target: TileMarker,
	speedPxPerSec: number,
	dtSec: number,
	tileSize: number,
	arriveEpsilonPx?: number // default 2
): { x: number; y: number; arrived: boolean };
```

Tests (literal):

| Call                                                               | Expect                                           |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| `nextWanderTarget([{tx:0,ty:0},{tx:1,ty:0}], 0).waypointIndex`     | `1`                                              |
| `nextWanderTarget([{tx:0,ty:0},{tx:1,ty:0}], 1).waypointIndex`     | `0`                                              |
| `stepToward(8, 8, {tx:1,ty:0}, 80, 1, 16)` from tile0 center→tile1 | `arrived === true` after enough steps; never NaN |

Mum speed: use `CLIENT_SPEED` (60). Pause `200–600ms` at each waypoint (Phaser-side
timer; not required in the pure helper).

While Mum is the **active talk/deliver target** (armed or `clientName === 'Mum'` in
snapshot with phase not idle-after-dismiss), **pause patrol** so the player can catch
her. Resume patrol after dismiss / when no longer the commission target.

---

## 5. Mum art

Preferred: extract / recolour one Tiny Dungeon character into
`static/studio/characters/mum.png` (idle + 2-frame walk), credit in `CREDITS.md`.

Fallback (acceptable): reuse `clients` sheet frame 0 for Mum, but tint her
`0xffc9a8` (or similar warm tint) in `StudioScene` so she reads as distinct from
door visitors. Document the tint in the studio README.

BootScene loads `'mum'` only if the file exists; otherwise scene uses tinted `clients`.

---

## 6. `+page.svelte` wiring (minimal)

When `STUDIO_FLOOR_ENABLED` and the active room for `game.unlockedVenueId` has a Mum
resident (`getRoomForVenue(...).residents.some(r => r.clientName === 'Mum')`):

1. **Invite / auto-invite** still sends `summon-client` (Phaser no-ops the door spawn).
2. Sync snapshots with `residentClientArmed: true` while waiting for talk (phase `idle`
   and a client has been “summoned” visually). Track with a local `$state` flag
   `studioClientSummoned` (likely already present — set it true on summon, false on
   dismiss / after talk begins as you do today).
3. After `inviteClient()`, if `game.currentClient?.clientName === 'Mum'`: do **not**
   expect a door visitor; keep Mum as target. If the brief is **not** Mum: send a
   follow-up `summon-client` is wrong (already summoned). Instead add command:

```ts
| { type: 'spawn-visitor' }
```

Call `spawn-visitor` only when `inviteClient()` returns a non-Mum client while in a
Mum-resident room. Phaser then runs the existing door→wait tween for the visitor.
If you can avoid a new command by spawning the visitor inside the `sync` handler when
`client` becomes non-Mum and no visitor exists, that is also fine — pick one approach
and test it. **Prefer `spawn-visitor`** for clarity.

4. On collect / dismiss: always `dismiss-client`. Phaser keeps Mum.

For garage+ rooms (no residents): keep today's summon → talk → invite → dismiss
door flow unchanged.

`StudioFloor` must pass `initialVenueId={game.unlockedVenueId}` (or equivalent) into
the Phaser factory.

---

## 7. `StudioScene` rebuild on venue change

On `sync`, if `snapshot.activeVenueId` differs from the room currently built:

1. Tear down tilemap layers, furniture bodies, easels, door-visitor client.
2. **Keep** Mum only if the new room also has a Mum resident (it won't for garage+ —
   destroy Mum when leaving kitchen).
3. `getRoomForVenue(venueId)` → rebuild map, furniture, easels, residents, spawn player
   at new `playerSpawn` (soft fade optional; hard cut OK).

Camera / world bounds **MUST** follow `width * TILE_SIZE` × `height * TILE_SIZE`.

---

## 8. `easelLayout.ts`

Stop hardcoding easel columns at `tx = 14` (breaks on a 6-wide kitchen). Rules:

1. First `min(3, count)` magnets around `fridgeAnchor` (unchanged idea).
2. Remaining easels: place along the **gallery** / **window** zone if present
   (`room.zones.find(z => z.id === 'gallery' || z.id === 'window')`), scanning
   walkable tiles row-major; else along the east interior wall
   `tx = room.width - 2`, `ty = 2 + i`.
3. Every slot in-bounds and not on the desk cell.

Tests: for `home-kitchen` + `fridge`, all 3 magnet slots have `tx < 6` and `ty < 6`.
For a 6×6 room, never produce `tx >= 6`.

---

## 9. Interactions beyond talk/desk (storefront+)

Minimum viable “more interactions” for bigger spaces (do not build a full quest system):

| Zone / prop        | Interact                      | Emit / behaviour                                                                                                                                                              |
| ------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desk (all rooms)   | E — already                   | `interact-desk` (existing; may no-op in HUD)                                                                                                                                  |
| Gallery piece      | E — already                   | `open-gallery-entry`                                                                                                                                                          |
| Window zone sign   | E when in range (storefront+) | `emit({ type: 'interact-desk' })` **or** no-op with “E — Look” prompt only — prefer showing the prompt and emitting `open-gallery-entry` for the first displayed entry if any |
| Foyer mat (museum) | walk across                   | no emit; flavour only                                                                                                                                                         |

Add **one** new optional outbound event only if needed:

```ts
| { type: 'inspect-zone'; zoneId: RoomZoneId }
```

`+page` MAY ignore it in this spec (log-free no-op subscribe). The point is the floor
has something to press in the showroom. Document in studio README.

---

## 10. Definition of done

- [x] `home-kitchen` is exactly **6×6** with Mum resident + patrol (≥2 waypoints).
- [x] Mum never uses the door for enter/leave; dismiss leaves her in the room.
- [x] First kitchen invite talks to Mum in-world (resident armed / talk-to-client).
- [x] Non-Mum kitchen briefs spawn a door visitor; Mum keeps wandering.
- [x] `garage` / `storefront` / `gallery-hall` / `mega-museum` each have unique W×H and
      palette; storefront+ have ≥2 zones with a walkable doorway between them.
- [x] Phaser rebuilds the floor when `activeVenueId` changes.
- [x] `easelLayout` safe on 6×6 (no out-of-bounds slots).
- [x] `npcWander` unit tests + `rooms` / `venueRooms` / `easelLayout` tests green.
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for owned files.
- [x] Studio README + architecture §3.1 blurb + `docs/agent-log.md` handoff.

## 11. Explicitly out of scope

- Changing venue unlock costs, capacities, or shop UI (spec 14).
- Rewriting brief copy or abstract scoring (spec 18).
- Staff NPC sprites for Apprentice / Curator / Marketing Director (spec 16 data only).
- Level 2+ environment unlocks beyond venue-driven floors.
- New npm dependencies.
- Pathfinding around furniture for Mum (waypoints are enough; simple slide is fine).

---

## 12. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/19-office-spaces.md`.
>
> Read these four files completely before writing any code:
>
> 1. `best-practices.md` — the binding rules for this repo
> 2. `docs/architecture.md` — how the system fits together
> 3. `src/lib/types/contracts.ts` — frozen types (do not edit)
> 4. `docs/tasks/19-office-spaces.md` — your spec
>
> Also read `src/lib/studio/README.md` and `docs/agent-log.md` (spec 17 / 18 handoffs).
>
> The spec lists exactly which files to create and which paths you own. Do not create
> or modify any file outside your ownership zone. Do not edit `package.json`,
> `vite.config.ts`, `tsconfig.json`, or `src/lib/types/**`. Do not run `npm install`.
> Do not run any state-changing git command — no commit, add, checkout, merge, or push.
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
