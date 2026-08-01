# Studio floor assets — licenses

All third-party art used under **CC0 1.0** (public domain dedication). Commercial use is
allowed. Attribution is not required; we credit the authors here anyway.

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

Mum / staff: BootScene loads `characters/mum.png` and `characters/staff.png` (Kenney /
CC0). If either 404s, loaderror is ignored and StudioScene falls back to `clients.png`
(Mum with warm tint `0xffc9a8`; staff with role tints from `staffLookForRole`).

## Art Dev Tycoon originals (CC0)

- `ui/prompt-e.png` — simple interact prompt glyph authored for this project (CC0)
- `audio/**` — near-silent WAV stubs for Spec 21c music beds + work/stinger SFX (CC0).
  Full list and roles: [`audio/CREDITS.md`](./audio/CREDITS.md).

Donate to Kenney if you can: https://kenney.itch.io/kenney-donation
