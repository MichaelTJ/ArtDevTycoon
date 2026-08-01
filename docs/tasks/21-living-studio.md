# Spec 21 — Living Studio (NPCs, interactables, AV polish) — PROPOSAL

**Status:** Parent catalog. Implementable slices exist:

| Slice | Spec                                             |
| ----- | ------------------------------------------------ |
| 21a   | [21a-living-npcs.md](./21a-living-npcs.md)       |
| 21b   | [21b-interactables.md](./21b-interactables.md)   |
| 21c   | [21c-studio-audio.md](./21c-studio-audio.md)     |
| 21d   | [21d-studio-vfx.md](./21d-studio-vfx.md)         |
| 21e   | [21e-ambient-events.md](./21e-ambient-events.md) |
| 21f   | [21f-studio-qol.md](./21f-studio-qol.md)         |

Boss tracking: [21-boss-plan.md](./21-boss-plan.md).
**Depends on:** Specs 17–20 merged (walkable venues, Mum resident, HUD/skills). Does
**not** depend on 05–11 (AI engines).
**Priority:** Next presentation wave after Wave F — make the floor feel inhabited.

---

## Mission

Specs 17–20 turned menus into a place: sized rooms, a resident Mum, and readable
progress. The studio still feels sparse. Furniture is mostly scenery, staff exist only
as shop cards, door clients are generic tinted sprites, and the loop is silent.

This proposal catalogs **immersion and life** features so the garage → museum ladder
feels like a growing creative household — without touching scoring formulas, engine
tiers, or the Level 1 crayon joke.

Product constraints that settle design arguments (from `best-practices.md` §8):

1. Still playable with `mock` and zero AI installed.
2. Never block the player on assets, audio decode, or optional flair.
3. Level 1 prompt modifiers stay invisible.
4. Presentation-only unless a sub-spec explicitly owns a tiny domain seam (e.g. flavour
   text pools). Money and unlock tables stay in specs 12–16.

---

## Where we are today (context for proposers)

| Already shipped                        | Still thin                                            |
| -------------------------------------- | ----------------------------------------------------- |
| Phaser venues fridge → mega-museum     | Tiny Dungeon only; Mum is a tinted client frame       |
| Mum patrols kitchen; visitors use door | No other residents; staff not on the floor            |
| E near client / desk / show zone       | Most furniture is non-interactive                     |
| Easels / fridge magnets show art       | No inspect flavour, no wall labels, no lighting moods |
| Skills + HUD meters (spec 20)          | No desk-side FX when XP ticks                         |
| Idle earnings modal (spec 16)          | No sound / toast when cash ticks in-session           |
| Marketing Director auto-invite         | Apprentice / Curator / MD are invisible sprites       |

---

## Feature catalog

Grouped by player-facing fantasy. Each item notes suggested sub-spec, rough size, and
whether it needs new assets (prefer Kenney / CC0; credit in `static/studio/CREDITS.md`).

### A. More NPCs & residents — sub-spec **21a**

| #   | Feature                       | Pitch                                                                                  | Size | Assets                          |
| --- | ----------------------------- | -------------------------------------------------------------------------------------- | ---- | ------------------------------- |
| A1  | **Dedicated Mum spritesheet** | Unique walk/idle frames; retire the peach tint hack                                    | S    | `mum.png` (or recolour pack)    |
| A2  | **Staff on the floor**        | Hired Apprentice paints at a second desk; Curator paces show zone; MD answers the door | L    | 3 staff sheets or palette swaps |
| A3  | **Client look per tier**      | Neighbour / corporate / billionaire / auctioneer use distinct frames + wait poses      | M    | `clients.png` expand            |
| A4  | **Passing pedestrians**       | Storefront+ window: NPCs walk past outside; optional wave if reputation high           | M    | 1–2 walker sheets               |
| A5  | **Rival artist cameo**        | Rare idle visitor who snarks at your wall art (flavour only; no economy)               | S    | 1 NPC + dialogue lines          |
| A6  | **Critic ghost preview**      | During `critiquing`, a translucent “critic” silhouette appears near the desk (comedy)  | S    | 1 silhouette / tint             |
| A7  | **Pet / studio mascot**       | Unlockable cat/dog that wanders; fridge magnet of the pet after first Mum commission   | M    | pet sheet + optional save flag  |
| A8  | **Crowd at mega-museum**      | Ambient gallery-goers in foyer/show zones who stop at easels                           | M    | reuse client frames             |

**Bridge seams (additive):** e.g. `snapshot.hiredRoleIds`, `spawn-staff`, `npc-bark`,
`ambient-density`. Phaser still never imports `GameStore`.

### B. Interactable objects & props — sub-spec **21b**

| #   | Feature                      | Pitch                                                                                | Size | Notes                                   |
| --- | ---------------------------- | ------------------------------------------------------------------------------------ | ---- | --------------------------------------- |
| B1  | **Interactable registry**    | Data-driven prop → `{ promptLabel, onInteract }` so E targets are not hardcoded      | M    | Pure TS helpers + StudioScene binding   |
| B2  | **Fridge**                   | Open → short Mum line or random magnet trivia; closed fridge sprite swap             | S    | Kitchen only                            |
| B3  | **Radio / boombox**          | Toggle ambient music bed (see C1); visual “on” frame                                 | S    | Needs audio flag                        |
| B4  | **Coffee machine / kettle**  | Sip animation; tiny +Hustle flavour toast once per N minutes (cosmetic, not real XP) | S    | Keep economy honest — toast only        |
| B5  | **Supply shelf / toolkit**   | E opens ToolkitShop (same modal as menu) from the garage workbench                   | S    | Bridge → Svelte already pattern         |
| B6  | **Suggestion box / mail**    | E shows next-unlock teaser from `nextUnlock` (spec 20) in flavour prose              | S    | Read-only snapshot field                |
| B7  | **Guest book (storefront+)** | E lists last 3 client names + scores as wall text                                    | S    | From `galleryHistory`                   |
| B8  | **Light switch / blinds**    | Toggle day/dusk tint per venue (local preference, not save-critical)                 | S    | `prefers-reduced-motion` safe fades     |
| B9  | **Plinth labels**            | Show-zone easels show title under art when player stands nearby                      | S    | Uses existing `GalleryEntry.title`      |
| B10 | **Trash bin / reject pile**  | Optional: archive of failed commissions as crumpled paper (inspect only)             | M    | Needs failed-run retention decision     |
| B11 | **Door bell**                | Manual ring summons next walk-in when Marketing Director not hired                   | S    | Same path as Invite Client              |
| B12 | **Window display rearrange** | E in window zone cycles layout preset (ties to spec 14 layouts)                      | M    | Careful ownership vs GalleryUpgradeShop |

### C. Sound & music — sub-spec **21c**

Mute-first, mobile-safe, **no autoplay until a gesture**. All cues behind
`adt.audio.v1` preference (master + music + sfx). Respect system mute where possible.

| #   | Feature                    | Pitch                                                                | Size |
| --- | -------------------------- | -------------------------------------------------------------------- | ---- |
| C1  | **Venue music beds**       | Soft loop per venue tier (kitchen hum → museum hush); radio toggles  | M    |
| C2  | **Footstep / door cues**   | Soft step ticks + door open/close on visitor spawn/dismiss           | S    |
| C3  | **Work loop SFX**          | Pencil scratch during `generating`; typewriter/“hmm” during critique | S    |
| C4  | **Cash / XP stingers**     | Collect Cash coin + soft level-up chime when skill levels            | S    |
| C5  | **Idle earnings chime**    | Optional in-session tick when Apprentice pays (not only on reload)   | S    |
| C6  | **UI click pack**          | Lightweight taps for shop buy / invite / collect                     | S    |
| C7  | **Mum bark VO (optional)** | 3–5 short mumbling lines; text captions always available             | M    |
| C8  | **Audio settings panel**   | Sliders in GameMenuBar; persist; default music off or very low       | S    |

**MUST:** decode failures never break commissions. Missing files → silent no-op.
**MUST NOT** ship copyrighted sample packs; CC0 / self-authored only.

### D. Graphics, lighting, VFX — sub-spec **21d**

| #   | Feature                       | Pitch                                                                | Size |
| --- | ----------------------------- | -------------------------------------------------------------------- | ---- |
| D1  | **Venue palette polish**      | Richer ground/wall tiles per venue (still CC0; may composite sheets) | M    |
| D2  | **Time-of-day wash**          | Subtle ambient tint by clock or commission count band                | S    |
| D3  | **Desk work particles**       | Pencil dust / paper scraps while generating (reduced-motion → off)   | S    |
| D4  | **Cash confetti**             | Small coin burst on Collect (reduced-motion → instant number only)   | S    |
| D5  | **Easel spotlight**           | Soft cone on displayed art in gallery zones                          | S    |
| D6  | **Player cosmetic outfits**   | Hat/apron unlocks from reputation milestones (sprite overlays)       | M    |
| D7  | **Hi-DPI / scale modes**      | Crisp nearest-neighbor vs soft upscale toggle                        | S    |
| D8  | **Weather outside window**    | Rain/snow particles beyond storefront glass (cosmetic)               | S    |
| D9  | **Screenshot / postcard**     | Export current canvas frame as PNG “studio postcard”                 | S    |
| D10 | **Loading art for BootScene** | Branded splash while tiles load; never blank WebGL flash             | S    |

### E. Ambient life & comedy systems — sub-spec **21e**

| #   | Feature                    | Pitch                                                                     | Size |
| --- | -------------------------- | ------------------------------------------------------------------------- | ---- |
| E1  | **Bark / thought bubbles** | Mum + staff + visitors show 1-line bubbles on a timer (data pool, no LLM) | M    |
| E2  | **Phone rings**            | Rare event: answer for a flavour corporate brief teaser (or decline)      | M    |
| E3  | **Noise complaint**        | Joke event if player idles in kitchen too long; Mum “clears throat”       | S    |
| E4  | **Opening night**          | On venue unlock, one-shot visitor burst + banner toast                    | M    |
| E5  | **Series wall plaque**     | Completing a palette series (spec 15) drops a permanent plaque prop       | M    |
| E6  | **Tutorial ghosts**        | First-run translucent arrows to Mum / desk / Collect (dismissible, saved) | M    |
| E7  | **Photo mode**             | Freeze NPCs, hide HUD, pan camera for postcard (ties D9)                  | S    |

### F. Quality-of-life tied to the floor — sub-spec **21f**

| #   | Feature                      | Pitch                                                                          | Size |
| --- | ---------------------------- | ------------------------------------------------------------------------------ | ---- |
| F1  | **Pathfinding vs furniture** | Replace Mum waypoint slide with simple A\* / funnel around props (spec 19 gap) | M    |
| F2  | **Camera follow easing**     | Smoother pan in large museums; optional look-ahead                             | S    |
| F3  | **Minimap (mega-museum)**    | Tiny zone dots: atelier / gallery / foyer                                      | S    |
| F4  | **Interact prompt polish**   | Contextual verb (“Talk to Mum”, “Open fridge”, “View show”) not bare “E”       | S    |
| F5  | **Gamepad / Space**          | Map interact; hold-to-run optional                                             | S    |
| F6  | **Reduced-motion profile**   | One flag dims particles, camera shake, confetti, NPC density                   | S    |
| F7  | **Performance budget**       | Cap ambient NPCs on low `deviceMemory` / coarse pointer heuristics             | S    |

---

## Suggested delivery waves

Do **not** implement this whole file in one ownership zone. Proposed split:

```
Wave G  (after 20 — living floor foundation)
   ├── 21a NPCs & residents     → worktree ../adt-wt-living-npcs      branch agent/living-npcs
   └── 21b Interactables        → worktree ../adt-wt-interactables    branch agent/interactables
       (disjoint: 21a owns characters/spawn; 21b owns prop registry + room prop tags.
        Orchestrator lands shared bridge field names first.)

Wave H  (after G — AV + polish; can parallel if zones stay clean)
   ├── 21c Audio                → ../adt-wt-studio-audio             branch agent/studio-audio
   ├── 21d Graphics / VFX       → ../adt-wt-studio-vfx               branch agent/studio-vfx
   └── 21f Floor QoL            → ../adt-wt-studio-qol               branch agent/studio-qol

Wave I  (content comedy — after A/B so bubbles have targets)
   └── 21e Ambient events       → ../adt-wt-studio-ambient           branch agent/studio-ambient
```

**Orchestrator prep before Wave G:** additive `StudioSnapshot` / command union fields in
`bridge.ts` (or a short “21-bridge” patch on main) listing every new field with defaults
so 21a/21b do not fight over the type.

---

## Priority shortlist (if we only ship one wave)

If time is scarce, ship this “kitchen that feels alive” MVP first:

1. **A1** Mum sheet
2. **A2** Apprentice + Curator floor presence (hired roles only)
3. **B1 + B2 + B5** Interact registry, fridge, toolkit shelf
4. **C1 + C3 + C4 + C8** Music bed, work SFX, cash stinger, mute settings
5. **D3 + D4** Desk dust + collect confetti (reduced-motion safe)
6. **E1** Bark bubbles for Mum
7. **F4** Contextual interact verbs

That set alone turns “empty tile room” into “home studio with a person in it.”

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

## Open questions (resolve before writing 21a)

1. **Staff sprites vs shop art** — reuse avatar PNGs from `static/avatars/` scaled up, or
   new Tiny-Dungeon-scale sheets?
2. **Cosmetic XP toasts from props (B4)** — flavour-only, or tiny real Hustle XP? (Lean
   flavour-only so shops stay the progression spine.)
3. **Music default** — off until radio interacted, or very quiet on first gesture?
4. **Pet (A7)** — needs a save flag; is that worth a `contracts`/`save.ts` touch, or keep
   pets as session-only fluff?
5. **Crowd density (A8)** — hard cap for mobile WebGL; what’s the FPS floor we protect?

---

## Definition of done (for this proposal doc)

- [x] Catalog covers NPCs, interactables, audio, graphics, ambient comedy, and floor QoL.
- [x] Split into sub-specs with a wave order and conflict notes.
- [x] Grounded in current gaps (Mum tint, silent loop, staff off-floor, scenery props).
- [ ] Individual 21a–21f specs written with ownership zones + tests (orchestrator follow-up).
- [x] `docs/tasks/README.md` indexes Spec 21 (this file).

---

## Handoff note for the next orchestrator pass

When promoting an item from this catalog:

1. Copy the feature row into a new `docs/tasks/21a-….md` (etc.).
2. Freeze bridge field names and any save keys on main first.
3. Keep Phaser presentation-only; flavour pools live in `src/lib/data/**` if needed.
4. Prefer CC0 Kenney / self-authored SFX; update `CREDITS.md` in the same change.
5. Gate particles and camera motion on `prefers-reduced-motion`.
