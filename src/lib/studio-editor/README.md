# Studio editor

Authoring tools for venue floor plans and character looks. Phaser reads the same
localStorage blob so a reload of the game picks up the last save. There is no
server — drafts never write into `rooms.ts`.

## Public surface

| Export                                                       | Role                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `TILESETS` / `PEOPLE_SHEETS` / `FURNITURE_SHEETS`            | Atlas catalog (home interiors + Kenney / Tiny Creatures)                              |
| `applyTileEdit` / `switchTileset` / `recolorWalls`           | Pure room-draft mutations                                                             |
| `listWallKinds` / `listFloorKinds` / `recolorFloors`         | Floor + wall palettes; remap every matching sprite across tilesets                    |
| `loadStudioEditorState` / `saveRoomDraft` / `savePersonLook` | Canonical `adt.studio-editor.v2`; load restores non-empty `adt.studio-editor.v1`      |
| `resolveRoomForPlay` / `resolvePersonLook`                   | Merge drafts onto authored rooms / default looks; kitchen fridge markers get cabinets |
| `overlayClientLook` / `overlayStaffLook`                     | Optional Phaser look overlays                                                         |

Route: `/studio-editor`. Click a tile or person, pick options, then close. Floors, walls, and
furniture appear as palettes under the grid — click a kind to re-skin every match, using any
tileset in the catalog. Desk, fridge, and client-wait markers can occupy many tiles; door and
player-spawn stay unique. Each fridge is a painting spot.

## Invariants

- Width and height stay locked to the authored `RoomDef` so zones and easels stay valid.
- Restored JSON is parsed with Zod; a corrupt blob is ignored.
- Load prefers a non-empty v2 blob. If v2 is missing or both `rooms` and `people` are
  empty, a non-empty v1 blob is copied into v2 (v1 is never deleted).
- Default (no draft) looks and rooms are bit-identical to specs 17–21a.
- New tilesets are free/open (CC0 or CC BY-SA); credit lives in `static/studio/CREDITS.md`.
- Fridge / desk / client-wait extras persist on the draft as `fridgeAnchors`, `desks`, and
  `clientWaits`. None on an extra deletes it; None on the primary promotes the next.
  Tagging Fridge also places a solid interactable cabinet. Play merge stamps missing
  cabinets onto kitchen fridge markers so a Wall + Fridge draft still opens on E.

## Not done yet

- Resizing rooms, painting zones, or editing Mum patrol paths.
- Exporting a patch that lands in `rooms.ts` automatically.
