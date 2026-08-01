# Studio floor (Phaser)

Walkable pixel venues for Level 1. **Presentation only** — scoring, briefs, engines, and
saves stay in `$lib/game` / `$lib/stores`.

## Public surface

| Export                                       | Role                                            |
| -------------------------------------------- | ----------------------------------------------- |
| `STUDIO_FLOOR_ENABLED`                       | Feature flag; `false` restores `KitchenScene`   |
| `StudioBridge`                               | Typed events/commands between Svelte and Phaser |
| `createPhaserGame(parent, bridge, options?)` | Boots Phaser; `initialVenueId` picks the plan   |
| `getRoomForVenue` / `roomIdForVenue`         | Progressive gallery venue → authored floor      |
| `getRoomForEnvironment` / `ROOMS`            | Tile grids + markers (Level env stubs too)      |
| `slotsForVenue`                              | Venue → easel/magnet anchors                    |
| `nextWanderTarget` / `stepToward`            | Pure Mum patrol helpers                         |
| `floorStaffFromHired` / `staffAnchorForRole` | Hired staff → floor NPCs (presentation only)    |
| `clientLookForTier`                          | Door-visitor tint/frame by client tier          |
| `nearestInteractable` / `interactPromptText` | Pure prop interact helpers (spec 21b)           |
| `FRIDGE` / `TOOLKIT_SHELF`                   | Data-driven interactable registry               |

## Venue floor plans

| Venue          | Room id        | Size  | Notes                              |
| -------------- | -------------- | ----- | ---------------------------------- |
| `fridge`       | `home-kitchen` | 6×6   | Mum resident; warm kitchen palette |
| `garage`       | `art-room`     | 12×10 | Concrete / workbench               |
| `storefront`   | `studio`       | 18×12 | Work + window zones                |
| `gallery-hall` | `gallery`      | 22×14 | Atelier + show gallery             |
| `mega-museum`  | `mega-museum`  | 28×16 | Atelier + gallery + foyer          |

Phaser loads `getRoomForVenue(snapshot.activeVenueId)` on create and rebuilds when the
venue id changes.

## Invariants

- Phaser never imports `GameStore` or engines.
- `StudioBridge.send` before a command handler is registered must not throw.
- Unit tests must not construct a real `Phaser.Game` (mock `createGame` in component tests).
- Gallery thumbnails on easels pass `isSafeStudioImageUrl` before `load.image`; textures
  keyed `art-<entryId>` are unloaded when the entry leaves the displayed list.
- `StudioFloor` shows a loading status until the bridge `ready` event (error after timeout).

## Easel kinds (spec 17 §6.5)

| Venue          | Floor slots | Kind                 |
| -------------- | ----------- | -------------------- |
| `fridge`       | 3           | magnets              |
| `garage`       | 6           | 3 magnets + 3 easels |
| `storefront`   | 8           | easels               |
| `gallery-hall` | 10          | easels               |
| `mega-museum`  | 12          | easels               |

## Client flow

1. While idle, `GameStore` fires a timer → `summon-client`
2. **Kitchen (Mum resident):** no door spawn; snapshot `residentClientArmed` makes Mum
   the talk target while she patrols (paused while armed / active Mum brief).
3. **Higher venues:** NPC walks door → wait spot (unchanged).
4. Player presses E (or `?studioDebug=1` Talk) → `talk-to-client` → `inviteClient()`
5. If the brief is **not** Mum while still in the kitchen, `+page` sends `spawn-visitor`
   so a door client walks in; Mum keeps pacing in the background.
6. After critique (`results`), E near the commission target → `deliver-to-client` →
   `collectCash()` → `dismiss-client` (Mum stays; door visitor walks out).

During `generating` / `critiquing` the player snaps to the desk with a progress bar
sized from `lastWorkDurationMs` / `DEFAULT_WORK_ESTIMATE_MS`. Walk input is ignored
until those phases end. During `briefing` / `results` / `failed` the player may walk;
door visitors idle at the wait spot (Mum patrols unless she is the commission target).

Storefront+ show/window zones also show an E prompt; pressing it opens the first
displayed gallery entry (or emits `inspect-zone` when the wall is empty).

## Interactable props (spec 21b)

Furniture may carry an optional `interactableId` (`rooms.ts`). Registry lives in
`interactables.ts` — pure helpers, no Phaser.

| Id              | Room           | E action                                                                                                |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| `fridge`        | `home-kitchen` | Toggle chest frame (2↔3), emit `prop-bark`, auto-close after 2s                                         |
| `toolkit-shelf` | `art-room`     | Emit `open-shop` / `toolkit` → `+page` bumps `openToolkitNonce` → menu bar opens existing `ToolkitShop` |

Interact priority (must not reorder): talk → deliver → desk → easel → look → **prop**.
Commission talk/deliver always wins when in range. Contextual prompt text for props is
`E — …` via a Phaser Text label (glyph prompt stays for talk/deliver/desk/easel).

**Manual check:** kitchen E on fridge swaps frame + bark; garage E on west workbench
opens ToolkitShop; standing on Mum while armed still Talks, not Open fridge.

Player animations use a single walk loop + `flipX` (Tiny Dungeon sheet has no full
4-direction set). Work frames are ADT-authored pencil overlays on the same sheet.

## Mum art

BootScene always registers `/studio/characters/mum.png`. If the file is missing (404),
loaderror is ignored (required tiles/player still gate boot via `studioBootFailed`) and
StudioScene falls back to `clients` frame 0 with tint `0xffc9a8`. When `mum.png` is
present, Mum uses the `mum` key with **no** tint and dedicated `mum-idle` / `mum-walk`
anims so Phaser does not swap her back onto the clients sheet.

## Staff & client looks

- Snapshot field `hiredRoleIds` mirrors `GameStore.hiredStaffIds`. Floor sprites spawn
  for `apprentice` (second desk tile), `marketing-director` (idle at `clientWait`), and
  `curator` (patrols gallery/window zone, or a short east-wall pace in the kitchen).
  `print-shop` never appears on the floor. Staff are presentation-only — not talk
  targets and never emit `talk-to-client`.
- Optional `staff.png` loads the same way as Mum; otherwise staff reuse `clients` with
  role tints from `staffLookForRole` in `staffPresence.ts`.
- Door visitors use `clientLookForTier` (`clientLooks.ts`): `walk-in` untinted;
  `corporate` `0x7a9cc4`; `billionaire` `0xb48cff`; `auction-house` `0xc47878`.
  Unknown tiers map to walk-in. Mum never uses this helper.

## Assets

See `static/studio/CREDITS.md` (Kenney Tiny Dungeon CC0 + ADT prompt glyph).
