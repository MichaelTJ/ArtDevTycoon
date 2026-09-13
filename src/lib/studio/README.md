# Studio floor (Phaser)

Walkable pixel venues for Level 1. **Presentation only** — scoring, briefs, engines, and
saves stay in `$lib/game` / `$lib/stores`.

## Public surface

| Export                                                                                | Role                                                                                           |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `STUDIO_FLOOR_ENABLED`                                                                | Feature flag; `false` restores `KitchenScene`                                                  |
| `StudioBridge`                                                                        | Typed events/commands between Svelte and Phaser                                                |
| `createPhaserGame(parent, bridge, options?)`                                          | Boots Phaser; `initialVenueId` picks the plan                                                  |
| `getRoomForVenue` / `roomIdForVenue`                                                  | Progressive gallery venue → authored floor                                                     |
| `getRoomForEnvironment` / `ROOMS` / `stampKitchenFridgeProps`                         | Tile grids + markers; kitchen fridge markers always get E-interactable cabinets                |
| `slotsForVenue` / `easelStandFrame`                                                   | Venue → easel/magnet anchors; fridge magnets sit on solid cabinets only                        |
| `nearestDisplaySlot`                                                                  | Nearest magnet/easel whose tile center is within range; empty slots compete; tie → array order |
| `buildGroundTilemap` / `overlaySolidCells`                                            | Primary GIDs + off-sheet overlays; overlay furniture cells that need hidden colliders          |
| `nextWanderTarget` / `stepToward` / `withPath`                                        | Pure Mum patrol + path-queue helpers                                                           |
| `findPath` / `findPathInRoom`                                                         | 4-neighbour BFS on room collision (spec 21f)                                                   |
| `interactPromptLabel` / `prefersReducedMotion`                                        | Contextual E verbs + motion helper (21f)                                                       |
| `floorStaffFromHired` / `staffAnchorForRole`                                          | Hired staff → floor NPCs (presentation only)                                                   |
| `clientLookForTier`                                                                   | Door-visitor tint/frame by client tier                                                         |
| `nearestInteractable` / `interactPromptText` / `pickNearestRanked`                    | Pure prop interact helpers (spec 21b / 34)                                                     |
| `FRIDGE` / `TOOLKIT_SHELF` / `STORAGE`                                                | Data-driven interactable registry                                                              |
| `shouldEmitWorkParticles` / VFX caps                                                  | Pure desk/cash particle helpers (spec 21d)                                                     |
| `pickBark` / `eligibleBarkSpeakers` / schedule                                        | Ambient bark picker + phase gate (spec 21e)                                                    |
| `shouldShowBark` / bark lifetime helpers                                              | Bubble gating (prompt + phase)                                                                 |
| `playerDeskLocked` / `npcAttention` / `showAttentionMark` / `ATTENTION_MARK_OFFSET_Y` | Desk-lock + gold `!` (spec 29/30; mark at `host.y - 12`)                                       |
| `isDomEditableElement` / `isDomEditableFocused`                                       | DOM focus gate for keyboard walk/interact (P5/P11)                                             |
| `applyDomEditableKeyboardGate`                                                        | Release Phaser key captures while DOM fields focus                                             |
| `cameraZoomToFitRoom` / `studioViewportSize`                                          | Viewport-fit zoom (≤4×) + parent boot size (P2/P3/P12)                                         |

## Venue floor plans

| Venue          | Room id        | Size  | Notes                                                           |
| -------------- | -------------- | ----- | --------------------------------------------------------------- |
| `fridge`       | `home-kitchen` | 6×6   | Three solid fridge cabinets; Mum resident; warm kitchen palette |
| `garage`       | `art-room`     | 12×10 | Concrete / workbench                                            |
| `storefront`   | `studio`       | 18×12 | Work + window zones                                             |
| `gallery-hall` | `gallery`      | 22×14 | Atelier + show gallery                                          |
| `mega-museum`  | `mega-museum`  | 28×16 | Atelier + gallery + foyer                                       |

Phaser loads `getRoomForVenue(snapshot.activeVenueId)` on create and rebuilds when the
venue id changes. `/studio-editor` can override the tile atlas, ground, collision,
furniture, and markers per room via `adt.studio-editor.v2` (missing/empty v2 falls back
to a non-empty `adt.studio-editor.v1` blob and copies it forward); `getRoomForVenue`
applies those drafts. Person looks (player, Mum, clients, staff) overlay the same blob.

## Invariants

- Phaser never imports `GameStore` or engines.
- `StudioBridge.send` before a command handler is registered must not throw.
- Unit tests must not construct a real `Phaser.Game` (mock `createGame` in component tests).
- Gallery thumbnails on easels pass `isSafeStudioImageUrl` before `load.image`; textures
  keyed `art-<entryId>` are unloaded when the entry leaves the displayed list.
- `StudioFloor` shows a loading status until the bridge `ready` event (error after timeout).
- While any DOM text control (`input`, `textarea`, `select`, `[contenteditable]`) has focus,
  Phaser keyboard walk/interact is disabled and global key captures are released so letters
  reach the HUD prompt; touch on-screen pads still move/interact. The canvas is blurred on
  focus-in so keystrokes target the editable control.
- The Phaser canvas uses a fixed **420px** host height and `Scale.RESIZE` — never
  `scale.resize(roomPx)`. Camera zoom magnifies small venues up to **4×** with
  symmetric letterbox margins; `#applyRoomViewport` expands camera bounds and centers
  on the room midpoint (playtest P2/P12). Overlay floors use empty GIDs (`insertNull`),
  so solid overlay cells (kitchen fridges) get a hidden collider tile — otherwise the
  player walks through the cabinet. Fridge magnets draw on a cream paper backing above
  the cabinet sprite.

## Easel kinds (spec 17 §6.5)

| Venue          | Floor slots | Kind                                                                                                    |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `fridge`       | 3           | magnets on solid cabinets or wall fridge markers at (1,2), (0,2), (0,3); each cabinet is E-interactable |
| `garage`       | 6           | 3 magnets + 3 easels                                                                                    |
| `storefront`   | 8           | easels                                                                                                  |
| `gallery-hall` | 10          | easels                                                                                                  |
| `mega-museum`  | 12          | easels                                                                                                  |

Editor extras: each extra fridge marker is another painting slot (kitchen fridge
magnets require solid furniture at that tile; garage neighbor-floor magnets and
storefront+ easels unchanged), capped at the venue count. Extra desks are work spots; extra client
waits are extra standing tiles (the hired marketing director uses the second wait).

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

During `generating` the player snaps to the desk with a progress bar sized from
`lastWorkDurationMs` / `DEFAULT_WORK_ESTIMATE_MS`. Walk and interact are disabled until
generation ends. During `critiquing` the player may walk immediately; E on the commission
NPC is flavour talk (Svelte shows taking-it-in copy — no collect). During `briefing` /
`results` / `failed` the player may walk; door visitors idle at the wait spot (Mum patrols
unless she is the commission target).

`modelLoading` (EngineStore.isBusy, never an engine id) suppresses Svelte from sending
`summon-client` or inviting. Mum is still a talk target while loading. A gold `!` mark
appears for ready-commission (armed Mum or arrived visitor, not while loading) and for
critique-ready (`results`). It hides while the E prompt is on that same NPC.

Storefront+ show/window zones also show an E prompt; pressing it opens the first
displayed gallery entry (or emits `inspect-zone` when the wall is empty).

## Interactable props (spec 21b)

Furniture may carry an optional `interactableId` (`rooms.ts`). Registry lives in
`interactables.ts` — pure helpers, no Phaser.

| Id              | Room           | E action                                                                                                |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| `fridge`        | `home-kitchen` | Toggle chest frame (2↔3), emit `prop-bark`, auto-close after 2s                                         |
| `toolkit-shelf` | `art-room`     | Emit `open-shop` / `toolkit` → `+page` bumps `openToolkitNonce` → menu bar opens existing `ToolkitShop` |
| `storage`       | every venue    | Emit `open-storage` → `+page` bumps `openStorageNonce` → menu bar opens `StoragePanel`                  |
| Receptionist    | gallery-hall+  | NPC at `clientWait`; emit `open-reception` → `ReceptionDesk` (receptionist copy)                        |
| Letterbox       | garage         | Prop at `clientWait`; emit `open-reception` → letterbox board UI                                        |
| Computer inbox  | storefront     | Prop at `clientWait`; emit `open-reception` → computer board UI                                         |

Interact priority (must not reorder): talk → deliver → desk → easel → look → **prop**.
Easel interact picks the **nearest** magnet/easel slot (tile center within
`INTERACT_RANGE_PX`); an empty nearest fridge does not open a farther piece.
Commission talk/deliver always wins when in range. World prompts use
`interactPromptLabel` (Phaser Text) — e.g. “Talk to Mum”, “Practice at desk” while idle
(otherwise “Work at desk”), “View show”, “Open fridge”. 21b registry `promptLabel` wins
when present except storage, which uses `storageForVenue(activeVenueId).promptLabel`
(“Open drawers”, “Open shelves”, “Open stock”, “Open archive”, “Open vault”). `defForInteractable` switches on id so storage does
not fall through to the toolkit. The `prompt-e` glyph stays loaded but unused (text-only UI approach).

Kitchen storage is the dresser at **(5, 4)** — not Spec 33 cabinet tiles `(0,2)` / `(0,3)` / `(1,2)`. Sprites are home-interior dresser / empty shelves / bookshelf / chest, plus a cottage cupboard in the storefront — not the dungeon `furniture.png` strip. CSS kitchen (no floor) opens the same panel from GameMenuBar **Storage**.

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
  for `apprentice` (second desk, or a tile beside the primary desk), `marketing-director`
  (second client-wait, else the primary wait), and
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

See `static/studio/CREDITS.md` (Kenney Tiny Dungeon / Tiny Town / Tiny Battle CC0, Clint
Bellanger Tiny Creatures CC0, plus ADT prompt glyph). Extra atlases are chosen in
`/studio-editor`.
