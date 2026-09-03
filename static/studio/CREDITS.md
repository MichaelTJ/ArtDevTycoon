# Studio floor assets — licenses

Most third-party art is **CC0 1.0**. The Tilation home interior pack is **CC BY-SA 4.0**
and requires the credit below. We credit every author here.

## Tilation — [16x16] Indoor RPG Tileset

- **Author:** Tilation (https://tilation.itch.io)
- **License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- **Source:** https://tilation.itch.io/16x16-small-indoor-tileset (also on OpenGameArt)
- **File:** `tiles/home-interior.png` — packed `all_in_one.png` (16×16, no gap)
- Credit Tilation's itch.io profile as requested by the author.

## Kenney — Roguelike Indoor (1.0)

- **Author:** Kenney (www.kenney.nl)
- **License:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- **Source:** https://kenney.nl/assets/roguelike-indoor
- **File:** `tiles/home-indoor.png` — cottage furniture / indoor atlas (16×16, 1px spacing)

## Kenney — Tiny Dungeon (1.0)

- **Author:** Kenney (www.kenney.nl)
- **License:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- **Source:** https://kenney.nl/assets/tiny-dungeon (mirrored via OpenGameArt download)
- **Files derived into this folder:**
  - `tiles/walls-floors.png` — Kenney `Tilemap/tilemap_packed.png` (16×16 tiles, 1px spacing)
  - `tiles/furniture.png` — strip composed from Tiny Dungeon tile PNGs (chest, barrel, wood)
  - `characters/player.png` — Tiny Dungeon character tile + ADT-authored walk bob / work pencil frames
  - `characters/clients.png` — three Tiny Dungeon character tiles with idle/bob frames
  - `characters/mum.png` — Kenney Tiny Dungeon character strip (same source as clients; dedicated Mum key)
- `characters/staff.png` — Kenney Tiny Dungeon character strip for hired floor staff
- Ground indices used for venue palettes: `0` floor, `1` concrete, `2` museum stone,
  `12` wall, `48` wood floor, `49` carpet (storefront / foyer strip)

## Kenney — Tiny Town (1.1)

- **Author:** Kenney (www.kenney.nl)
- **License:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- **Source:** https://kenney.nl/assets/tiny-town
- **File:** `tiles/tiny-town.png` — packed 16×16 town / interior atlas (no gap)

## Kenney — Tiny Battle (1.0)

- **Author:** Kenney (www.kenney.nl)
- **License:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- **Source:** https://kenney.nl/assets/tiny-battle
- **File:** `tiles/tiny-battle.png` — packed 16×16 terrain, buildings, and units

## Clint Bellanger — Tiny Creatures (1.0)

- **Author:** Clint Bellanger (clintbellanger.net)
- **License:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- **Source:** https://opengameart.org/content/tiny-creatures
- **File:** `characters/tiny-creatures.png` — packed 16×16 creatures compatible with Tiny Dungeon
- Made with Kenney's permission; support Kenney as well.

These extra atlases are selected in the `/studio-editor` page (Dev panel → Studio editor).


Mum / staff: BootScene loads `characters/mum.png` and `characters/staff.png` (Kenney /
CC0). If either 404s, loaderror is ignored and StudioScene falls back to `clients.png`
(Mum with warm tint `0xffc9a8`; staff with role tints from `staffLookForRole`).

## Art Dev Tycoon originals (CC0)

- `ui/prompt-e.png` — simple interact prompt glyph authored for this project (CC0)
- `audio/**` — near-silent WAV stubs for Spec 21c music beds + work/stinger SFX (CC0).
  Full list and roles: [`audio/CREDITS.md`](./audio/CREDITS.md).

Donate to Kenney if you can: https://kenney.itch.io/kenney-donation
