# Spec 21 — Living Studio (NPCs, interactables, AV polish)

**Status:** Parent catalog. Six implementable slices exist; **MVP shortlist for
21a–21f MVP is shipped** on the integration tip (gap-review merges). Deferred
catalog rows (A4–A8, B3–B12 extras, etc.) remain open.

| Slice | Spec                                             | MVP status on this tip                                    |
| ----- | ------------------------------------------------ | --------------------------------------------------------- |
| 21a   | [21a-living-npcs.md](./21a-living-npcs.md)       | **Shipped** — A1–A3                                       |
| 21b   | [21b-interactables.md](./21b-interactables.md)   | **Shipped** — B1, B2, B5                                  |
| 21c   | [21c-studio-audio.md](./21c-studio-audio.md)     | **Shipped** — C1, C3, C4, C8                              |
| 21d   | [21d-studio-vfx.md](./21d-studio-vfx.md)         | **Shipped** — D3, D4 + `reducedVfx`                       |
| 21e   | [21e-ambient-events.md](./21e-ambient-events.md) | **Shipped** — E1 ambient barks + BarkLiveRegion           |
| 21f   | [21f-studio-qol.md](./21f-studio-qol.md)         | **Shipped** — F1 pathfind, F4 verbs, F6 reducedVfx consumers |

Boss tracking: [21-boss-plan.md](./21-boss-plan.md).
**Depends on:** Specs 17–20 merged (walkable venues, Mum resident, HUD/skills). Does
**not** depend on 05–11 (AI engines).
**Priority:** Presentation wave after Wave F — make the floor feel inhabited.

---

## Mission

Specs 17–20 turned menus into a place: sized rooms, a resident Mum, and readable
progress. The studio still felt sparse. Furniture was mostly scenery, staff existed only
as shop cards, door clients were generic tinted sprites, and the loop was silent.

This catalog lists **immersion and life** features so the garage → museum ladder
feels like a growing creative household — without touching scoring formulas, engine
tiers, or the Level 1 crayon joke.

Product constraints that settle design arguments (from `best-practices.md` §8):

1. Still playable with `mock` and zero AI installed.
2. Never block the player on assets, audio decode, or optional flair.
3. Level 1 prompt modifiers stay invisible.
4. Presentation-only unless a sub-spec explicitly owns a tiny domain seam (e.g. flavour
   text pools). Money and unlock tables stay in specs 12–16.

---

## Where we are today (gap audit — living-meta tip)

| Shipped (21a–21d MVP)                                                                 | Still thin / deferred                                       |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Mum sheet + floor staff when hired; client tier looks                                 | A4–A8 pedestrians / rival / critic ghost / pet / crowd      |
| Fridge + toolkit shelf via interact registry                                          | B3–B4, B6–B12 radio, coffee, guestbook, doorbell, etc.      |
| Venue music beds + work/cash SFX + Audio settings                                     | C2 / C5–C7 footsteps, idle chime, UI clicks, Mum VO         |
| Desk dust + cash confetti; `reducedVfx` from reduced-motion                           | D1–D2, D5–D10 palette, TOD wash, outfits, weather, postcard |
| Bridge: `hiredRoleIds`, `client.tier`, `reducedVfx`; events `open-shop` / `prop-bark` | Bark bubbles (21e); contextual verbs + Mum BFS (21f)        |

Do **not** tick A4–A8, B3–B12 (except shipped B1/B2/B5), C2/C5–C7, D1–D2/D5–D10, or any
E/F rows as done until their owning slice’s DoD is ticked on this tip.

---

## Feature catalog

Grouped by player-facing fantasy. Each item notes suggested sub-spec, rough size, and
whether it needs new assets (prefer Kenney / CC0; credit in `static/studio/CREDITS.md`).
**Status** reflects this integration tip after 21a–21d gap landings — not aspirational
branch tips in other worktrees.

### A. More NPCs & residents — sub-spec **21a**

| #   | Feature                       | Pitch                                                                                  | Size | Status                                  |
| --- | ----------------------------- | -------------------------------------------------------------------------------------- | ---- | --------------------------------------- |
| A1  | **Dedicated Mum spritesheet** | Unique walk/idle frames; retire the peach tint hack                                    | S    | **Shipped**                             |
| A2  | **Staff on the floor**        | Hired Apprentice paints at a second desk; Curator paces show zone; MD answers the door | L    | **Shipped** (`print-shop` never floors) |
| A3  | **Client look per tier**      | Walk-in / corporate / billionaire / auction-house distinct tint/frame looks            | M    | **Shipped**                             |
| A4  | **Passing pedestrians**       | Storefront+ window: NPCs walk past outside; optional wave if reputation high           | M    | Deferred (out of 21a v1)                |
| A5  | **Rival artist cameo**        | Rare idle visitor who snarks at your wall art (flavour only; no economy)               | S    | Deferred                                |
| A6  | **Critic ghost preview**      | During `critiquing`, a translucent “critic” silhouette appears near the desk (comedy)  | S    | Deferred                                |
| A7  | **Pet / studio mascot**       | Unlockable cat/dog that wanders; fridge magnet of the pet after first Mum commission   | M    | Deferred                                |
| A8  | **Crowd at mega-museum**      | Ambient gallery-goers in foyer/show zones who stop at easels                           | M    | Deferred                                |

**Bridge seams (additive, landed):** `hiredRoleIds`, `client.tier` when client non-null.
Catalog extras once floated `spawn-staff` / `npc-bark` / `ambient-density` — **not**
required for A1–A3; sync is enough. Phaser still never imports `GameStore`.

### B. Interactable objects & props — sub-spec **21b**

| #   | Feature                      | Pitch                                                                                | Size | Status                           |
| --- | ---------------------------- | ------------------------------------------------------------------------------------ | ---- | -------------------------------- |
| B1  | **Interactable registry**    | Data-driven prop → `{ promptLabel, onInteract }` so E targets are not hardcoded      | M    | **Shipped**                      |
| B2  | **Fridge**                   | Open → short Mum line or random magnet trivia; closed fridge sprite swap             | S    | **Shipped**                      |
| B3  | **Radio / boombox**          | Toggle ambient music bed (see C1); visual “on” frame                                 | S    | Deferred (needs 21c API — ready) |
| B4  | **Coffee machine / kettle**  | Sip animation; tiny +Hustle flavour toast once per N minutes (cosmetic, not real XP) | S    | Deferred                         |
| B5  | **Supply shelf / toolkit**   | E opens ToolkitShop (same modal as menu) from the garage workbench                   | S    | **Shipped**                      |
| B6  | **Suggestion box / mail**    | E shows next-unlock teaser from `nextUnlock` (spec 20) in flavour prose              | S    | Deferred                         |
| B7  | **Guest book (storefront+)** | E lists last 3 client names + scores as wall text                                    | S    | Deferred                         |
| B8  | **Light switch / blinds**    | Toggle day/dusk tint per venue (local preference, not save-critical)                 | S    | Deferred                         |
| B9  | **Plinth labels**            | Show-zone easels show title under art when player stands nearby                      | S    | Deferred                         |
| B10 | **Trash bin / reject pile**  | Optional: archive of failed commissions as crumpled paper (inspect only)             | M    | Out of scope (retention)         |
| B11 | **Door bell**                | Manual ring summons next walk-in when Marketing Director not hired                   | S    | Deferred                         |
| B12 | **Window display rearrange** | E in window zone cycles layout preset (ties to spec 14 layouts)                      | M    | Out of scope (vs gallery shop)   |

### C. Sound & music — sub-spec **21c**

Mute-first, mobile-safe, **no autoplay until a gesture**. All cues behind
`adt.audio.v1` preference (master + music + sfx). Respect system mute where possible.
Phaser stays audio-free; Svelte owns HTMLAudioElement playback.

| #   | Feature                    | Pitch                                                                | Size | Status               |
| --- | -------------------------- | -------------------------------------------------------------------- | ---- | -------------------- |
| C1  | **Venue music beds**       | Soft loop per venue tier (kitchen hum → museum hush); radio toggles  | M    | **Shipped**          |
| C2  | **Footstep / door cues**   | Soft step ticks + door open/close on visitor spawn/dismiss           | S    | Deferred             |
| C3  | **Work loop SFX**          | Pencil scratch during `generating`; typewriter/“hmm” during critique | S    | **Shipped**          |
| C4  | **Cash / XP stingers**     | Collect Cash coin + soft level-up chime when skill levels            | S    | **Shipped**          |
| C5  | **Idle earnings chime**    | Optional in-session tick when Apprentice pays (not only on reload)   | S    | Deferred             |
| C6  | **UI click pack**          | Lightweight taps for shop buy / invite / collect                     | S    | Deferred             |
| C7  | **Mum bark VO (optional)** | 3–5 short mumbling lines; text captions always available             | M    | Deferred (after 21e) |
| C8  | **Audio settings panel**   | Sliders in GameMenuBar; persist; default music off or very low       | S    | **Shipped**          |

**MUST:** decode failures never break commissions. Missing files → silent no-op.
**MUST NOT** ship copyrighted sample packs; CC0 / self-authored only.
**Note:** `audioEnabled` on `StudioSnapshot` was **not** used — prefs stay in
`localStorage` (`adt.audio.v1`). Radio (B3) can call the audio controller API later.

### D. Graphics, lighting, VFX — sub-spec **21d**

| #   | Feature                       | Pitch                                                                | Size | Status      |
| --- | ----------------------------- | -------------------------------------------------------------------- | ---- | ----------- |
| D1  | **Venue palette polish**      | Richer ground/wall tiles per venue (still CC0; may composite sheets) | M    | Deferred    |
| D2  | **Time-of-day wash**          | Subtle ambient tint by clock or commission count band                | S    | Deferred    |
| D3  | **Desk work particles**       | Pencil dust / paper scraps while generating (reduced-motion → off)   | S    | **Shipped** |
| D4  | **Cash confetti**             | Small coin burst on Collect (reduced-motion → instant number only)   | S    | **Shipped** |
| D5  | **Easel spotlight**           | Soft cone on displayed art in gallery zones                          | S    | Deferred    |
| D6  | **Player cosmetic outfits**   | Hat/apron unlocks from reputation milestones (sprite overlays)       | M    | Deferred    |
| D7  | **Hi-DPI / scale modes**      | Crisp nearest-neighbor vs soft upscale toggle                        | S    | Deferred    |
| D8  | **Weather outside window**    | Rain/snow particles beyond storefront glass (cosmetic)               | S    | Deferred    |
| D9  | **Screenshot / postcard**     | Export current canvas frame as PNG “studio postcard”                 | S    | Deferred    |
| D10 | **Loading art for BootScene** | Branded splash while tiles load; never blank WebGL flash             | S    | Deferred    |

### E. Ambient life & comedy systems — sub-spec **21e**

| #   | Feature                    | Pitch                                                                     | Size | Status                     |
| --- | -------------------------- | ------------------------------------------------------------------------- | ---- | -------------------------- |
| E1  | **Bark / thought bubbles** | Mum + staff + visitors show 1-line bubbles on a timer (data pool, no LLM) | M    | **Shipped**                |
| E2  | **Phone rings**            | Rare event: answer for a flavour corporate brief teaser (or decline)      | M    | Deferred                   |
| E3  | **Noise complaint**        | Joke event if player idles in kitchen too long; Mum “clears throat”       | S    | Deferred                   |
| E4  | **Opening night**          | On venue unlock, one-shot visitor burst + banner toast                    | M    | Deferred                   |
| E5  | **Series wall plaque**     | Completing a palette series (spec 15) drops a permanent plaque prop       | M    | Deferred                   |
| E6  | **Tutorial ghosts**        | First-run translucent arrows to Mum / desk / Collect (dismissible, saved) | M    | Deferred                   |
| E7  | **Photo mode**             | Freeze NPCs, hide HUD, pan camera for postcard (ties D9)                  | S    | Deferred                   |

### F. Quality-of-life tied to the floor — sub-spec **21f**

| #   | Feature                      | Pitch                                                                          | Size | Status                                                |
| --- | ---------------------------- | ------------------------------------------------------------------------------ | ---- | ----------------------------------------------------- |
| F1  | **Pathfinding vs furniture** | Replace Mum waypoint slide with simple A\* / funnel around props (spec 19 gap) | M    | **Shipped** (BFS tile path)                           |
| F2  | **Camera follow easing**     | Smoother pan in large museums; optional look-ahead                             | S    | Deferred (MAY in 21f)                                 |
| F3  | **Minimap (mega-museum)**    | Tiny zone dots: atelier / gallery / foyer                                      | S    | Deferred                                              |
| F4  | **Interact prompt polish**   | Contextual verb (“Talk to Mum”, “Open fridge”, “View show”) not bare “E”       | S    | **Shipped**                                           |
| F5  | **Gamepad / Space**          | Map interact; hold-to-run optional                                             | S    | Deferred                                              |
| F6  | **Reduced-motion profile**   | One flag dims particles, camera shake, confetti, NPC density                   | S    | **Shipped** — `reducedVfx` + camera/Mum consumers     |
| F7  | **Performance budget**       | Cap ambient NPCs on low `deviceMemory` / coarse pointer heuristics             | S    | Deferred                                              |

---

## Suggested delivery waves

Do **not** implement this whole file in one ownership zone. Proposed split (historical;
Wave G MVP for a–d has landed on the integration tip):

```
Wave G  (after 20 — living floor foundation) — 21a + 21b SHIPPED on tip
   ├── 21a NPCs & residents
   └── 21b Interactables

Wave H  (AV + polish) — 21c + 21d SHIPPED on tip; 21f still open
   ├── 21c Audio
   ├── 21d Graphics / VFX
   └── 21f Floor QoL            → sibling ../adt-wt-gap-studio-qol (etc.)

Wave I  (content comedy — after A/B so bubbles have targets) — 21e still open
   └── 21e Ambient events       → sibling ../adt-wt-gap-ambient (etc.)
```

**Bridge freeze (done inside 21a / 21b / 21d):** `hiredRoleIds`, `client.tier`,
`reducedVfx`; outbound `open-shop` / `prop-bark`. No `audioEnabled` on snapshot.

---

## Priority shortlist (kitchen that feels alive)

Original MVP set and current tip status:

1. **A1** Mum sheet — **done**
2. **A2** Apprentice + Curator floor presence (hired roles only) — **done** (+ MD)
3. **B1 + B2 + B5** Interact registry, fridge, toolkit shelf — **done**
4. **C1 + C3 + C4 + C8** Music bed, work SFX, cash stinger, mute settings — **done**
5. **D3 + D4** Desk dust + collect confetti (reduced-motion safe) — **done**
6. **E1** Bark bubbles for Mum — **open** (21e)
7. **F4** Contextual interact verbs — **open** (21f; fridge/toolkit already labelled)

---

## Explicitly out of scope (for all of 21.x)

- New economy loops, paid cosmetics marketplace, or gacha.
- Server, accounts, push notifications (contradicts static / no-backend).
- Changing Level 1 hidden modifiers or surfacing them.
- Replacing Phaser or rewriting shop unlock tables.
- Full voice acting / licensed music.
- Multiplayer visitors or real chat.
- Spec 10 ADT Cloud (separate monetization track).

---

## Open questions (resolved / remaining)

| #   | Question                           | Resolution                                                                                                                                 |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Staff sprites vs shop art          | **Resolved:** Tiny-Dungeon-scale `mum.png` / `staff.png` under `static/studio/characters/` (Kenney-derived); shop avatars unused on floor. |
| 2   | Cosmetic XP toasts from props (B4) | **Lean flavour-only** (unchanged); B4 still deferred.                                                                                      |
| 3   | Music default                      | **Resolved:** music volume default `0` until player raises it / radio later; gesture `unlock()` required.                                  |
| 4   | Pet (A7) save flag                 | Still open if/when A7 is scheduled — session-only fluff preferred.                                                                         |
| 5   | Crowd density (A8) FPS floor       | Still open if/when A8 is scheduled — pair with 21f F7.                                                                                     |

---

## Definition of done (for this proposal doc)

- [x] Catalog covers NPCs, interactables, audio, graphics, ambient comedy, and floor QoL.
- [x] Split into sub-specs with a wave order and conflict notes.
- [x] Grounded in current gaps (Mum tint, silent loop, staff off-floor, scenery props).
- [x] Individual 21a–21f specs written with ownership zones + tests.
- [x] `docs/tasks/README.md` indexes Spec 21 (this file).
- [x] Parent status board matches shipped MVP (21a–21f) + deferred catalog rows.

---

## Handoff note for the next orchestrator pass

When promoting a deferred catalog row:

1. Prefer extending the owning sub-spec (or a thin follow-up) rather than editing this
   file’s pitch table alone.
2. Keep Phaser presentation-only; flavour pools live in `src/lib/data/**` if needed.
3. Prefer CC0 Kenney / self-authored SFX; update `CREDITS.md` in the same change.
4. Gate particles and camera motion on `prefers-reduced-motion` / `reducedVfx`.
5. **21e / 21f** own remaining shortlist items E1 and F1/F4/F6 — do not re-implement
   them inside a–d zones.
