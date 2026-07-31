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
sized from `lastWorkDurationMs` / `DEFAULT_WORK_ESTIMATE_MS`.

Storefront+ show/window zones also show an E prompt; pressing it opens the first
displayed gallery entry (or emits `inspect-zone` when the wall is empty).

## Mum art

No dedicated `mum.png` ships yet. Mum reuses the `clients` sheet frame 0 with tint
`0xffc9a8` so she reads as distinct from door visitors. Drop a Tiny Dungeon sheet at
`static/studio/characters/mum.png` later and BootScene can load the `mum` key.

## Assets

See `static/studio/CREDITS.md` (Kenney Tiny Dungeon CC0 + ADT prompt glyph).
