# Studio floor (Phaser)

Walkable pixel venues for Level 1. **Presentation only** — scoring, briefs, engines, and
saves stay in `$lib/game` / `$lib/stores`.

## Public surface

| Export                                         | Role                                            |
| ---------------------------------------------- | ----------------------------------------------- |
| `STUDIO_FLOOR_ENABLED`                         | Feature flag; `false` restores `KitchenScene`   |
| `StudioBridge`                                 | Typed events/commands between Svelte and Phaser |
| `createPhaserGame(parent, bridge, options?)`   | Boots Phaser; `initialVenueId` picks the plan   |
| `getRoomForVenue` / `roomIdForVenue`           | Progressive gallery venue → authored floor      |
| `getRoomForEnvironment` / `ROOMS`              | Tile grids + markers (Level env stubs too)      |
| `slotsForVenue`                                | Venue → easel/magnet anchors                    |
| `nextWanderTarget` / `stepToward` / `withPath` | Pure Mum patrol + path-queue helpers            |
| `findPath` / `findPathInRoom`                  | 4-neighbour BFS on room collision (spec 21f)    |
| `interactPromptLabel` / `prefersReducedMotion` | Contextual E verbs + motion helper (21f)        |
| `floorStaffFromHired` / `staffAnchorForRole`   | Hired staff → floor NPCs (presentation only)    |
| `clientLookForTier`                            | Door-visitor tint/frame by client tier          |
| `nearestInteractable` / `interactPromptText`   | Pure prop interact helpers (spec 21b)           |
| `FRIDGE` / `TOOLKIT_SHELF`                     | Data-driven interactable registry               |
| `shouldEmitWorkParticles` / VFX caps           | Pure desk/cash particle helpers (spec 21d)      |
| `pickBark` / `eligibleBarkSpeakers` / schedule | Ambient bark picker + phase gate (spec 21e)     |
| `shouldShowBark` / bark lifetime helpers       | Bubble gating (prompt + phase)                  |

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
Commission talk/deliver always wins when in range. World prompts use
`interactPromptLabel` (Phaser Text) — e.g. “Talk to Mum”, “Work at desk”,
“View show”, “Open fridge”. 21b registry `promptLabel` wins when present.
The `prompt-e` glyph stays loaded but unused (text-only UI approach).

**Manual check:** kitchen E on fridge swaps frame + bark; garage E on west workbench
opens ToolkitShop; standing on Mum while armed still Talks, not Open fridge.

Player animations use a single walk loop + `flipX` (Tiny Dungeon sheet has no full
4-direction set). Work frames are ADT-authored pencil overlays on the same sheet.

## Pathfinding (spec 21f)

Mum patrols with 4-neighbour BFS over `RoomDef.collision` (`findPathInRoom`). She
steps tile-to-tile via `stepToward` so she routes around solid furniture (kitchen
fridge/table). Unreachable waypoints are skipped. Staff curator still uses
straight-line patrol (optional reuse later).

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

## VFX (spec 21d)

Presentation-only Phaser particles — no economy side effects:

| Effect                 | When                                                           | Caps                                    |
| ---------------------- | -------------------------------------------------------------- | --------------------------------------- |
| Desk work dust / paper | `generating` / `critiquing`                                    | max **12** alive, frequency **≥ 90 ms** |
| Cash confetti          | Collect Cash phase edge (`results` → `idle` / `levelComplete`) | burst **≤ 18**, lifespan **≤ 700 ms**   |

Both are gated by snapshot `reducedVfx` (default `false`). Svelte sets it from
`matchMedia('(prefers-reduced-motion: reduce)')` on every `syncStudio()`. When true,
emitters stay stopped; HudBar cash number tween (spec 20) is unchanged. Particle
textures are generated in-scene (`textures.generate`) — no new PNGs. Spec 21e also
shortens bark bubble lifetime and skips fade tweens when `reducedVfx` is true.

## Ambient barks (spec 21e)

Static pools in `$lib/data/barks` — **no LLM**. Phaser shows one thought bubble at a
time above Mum / hired floor staff. `StudioFloor` registers an `onBark` registry
callback so `BarkLiveRegion` announces `Speaker: line` via `aria-live="polite"`.
Optional `cueId` may be forwarded on the payload; **no audio playback** in this zone
(`audioEnabled` is not on `StudioSnapshot`).

| `GamePhase`     | Barks allowed? |
| --------------- | -------------- |
| `idle`          | **yes**        |
| `briefing`      | no             |
| `generating`    | no             |
| `critiquing`    | no             |
| `results`       | no             |
| `failed`        | no             |
| `levelComplete` | no             |

Leaving `idle` hides any visible bubble and clears the live region immediately; the
attempt countdown resets so returning to idle waits a full jittered interval.

`StudioSnapshot.reducedVfx` mirrors `prefers-reduced-motion: reduce`. Spec 21f uses it
for NPC pacing / camera; spec 21d uses it for particles and confetti. One field, both
consumers. When true: Mum waypoint pauses always use the high end (~600 ms); camera
follow lerp is hard (1) instead of soft (0.12).

## Assets

See `static/studio/CREDITS.md` (Kenney Tiny Dungeon CC0 + ADT prompt glyph).
