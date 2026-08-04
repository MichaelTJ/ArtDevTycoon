# Playtest notes (2026-08-01)

Tracked during post-gap-review playtest. Not fixed yet — matched to owning tasks.

| #   | Kind    | Note                                                                                                                                                                                                                          | Primary task(s)                                                                                     | Notes / secondary                                                                                    |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| P1  | Bug     | Progression UI is a mess — text stacked on text                                                                                                                                                                               | **20** Progression feedback                                                                         | **Fixed** — compact meters single-line; HudBar full-width below menu buttons (2026-08-01)            |
| P2  | Bug     | Phaser window slowly expands / feels like a zoom-in after start — worrying                                                                                                                                                    | **17** Phaser studio floor                                                                          | **Fixed** — fixed 420px host + `Scale.RESIZE`; no `scale.resize(room)` loop (2026-08-01)             |
| P3  | Bug     | Kitchen only shows ~3×3 tiles; too zoomed. Bigger rooms may show more (zoom tied to room size?). Prefer black/blank letterbox around smaller rooms so camera isn’t a microscope                                               | **17** camera/zoom + **19** office spaces                                                           | **Fixed** — `cameraZoomToFitRoom` caps zoom at 1×; whole kitchen letterboxes (2026-08-01)            |
| P4  | Balance | Mum commission payouts way too big. Target: Mum pays **~$5**; enough for new pencils; garage move should stay pretty cheap                                                                                                    | **01** domain / scoring payouts + **12** progression + **13** mediums + **14** gallery unlock costs | **Fixed** — kitchen budgets $5–8; pencil $15; garage $30 (2026-08-01)                                |
| P5  | Bug     | After painting, focusing “your prompt” still lets Phaser eat keys — typing/WASD moves the character instead of inserting letters                                                                                              | **17** Phaser input capture + **04** integration (prompt field focus)                               | **Fixed** (again) — P11 closed global `addCapture` gap (2026-08-01)                                  |
| P6  | Design  | New loop: player prompts → while waiting, paint on canvas → on reveal, choose submit **own drawing** or **prompted image**                                                                                                    | **11** BAGEL sketch (+ refine)                                                                      | **Fixed** — paint during `generating`, choose-before-critique via `confirmSubmitChoice` (2026-08-01) |
| P7  | Design  | Mum comments = toddler praise (“Wow! I love it so much!”, “Did you do this all by yourself?!”). Auto **10/10** Accuracy + Creativity. Real Janus critique hidden behind **“Ask for real critique”** (harsh = comedy contrast) | **18** abstract prompts / critique presentation + **03** results UI                                 | **Fixed** — praise pool + ResultsPanel reveal; payout uses 10/10 (2026-08-01)                        |
| P8  | Design  | Want to **interact with NPCs** (talk / menus), not just see verbs / barks                                                                                                                                                     | **24** (24a talk handlers) — builds on **21a/21b/21f** floor targets                                | **Fixed** — receptionist `open-reception` + Mum talk/deliver preserved (2026-08-01)                  |
| P9  | Design  | One NPC is a **receptionist** who offers **choices of commissions**                                                                                                                                                           | **24** (24a receptionist + commission board)                                                        | **Fixed** — `ReceptionDesk` board 2–4 offers; unlocks garage+ (2026-08-01)                           |
| P10 | Bug     | ~~**Crayon Mode** notice stays up after selecting **Janus**~~ **Fixed** — notice gates on active mock engine, not device capability                                                                                           | **04** Integration — `CapabilityNotice` / `EngineStore` (`showCrayonNotice`)                        | Merged 2026-08-01                                                                                    |

## Suggested fix order (when we start)

1. ~~**P5** — input focus (blocks typing/play)~~ **done**
2. ~~**P2 / P3** — studio camera (blocks reading the floor)~~ **done**
3. ~~**P10** — Crayon notice vs active engine~~ **done**
4. ~~**P1** — progression HUD readability~~ **done**
5. ~~**P4** — early economy numbers~~ **done**
6. ~~**P7** — Mum praise vs real critique~~ **done**
7. ~~**P6** — paint-while-waiting loop (larger design)~~ **done**
8. ~~**P8 / P9** → Spec **24a** (after bugs above; see [24-artist-team.md](./tasks/24-artist-team.md))~~ **done**

## Status

- [x] P5 / P11 — DOM focus gate + Phaser global capture release (`domInputKeyboardGate`)
- [x] P2 — fixed viewport host; no room-sized `scale.resize` growth loop
- [x] P3 — `cameraZoomToFitRoom` (≤1× zoom, letterbox small rooms)
- [x] P10 — `showCrayonNotice` on active mock engine
- [x] P1 — progression HUD layout (compact meters + GameMenuBar stack)
- [x] P4 — early economy (kitchen budgets, pencil/garage unlock costs)
- [x] P7 — Mum toddler praise + hidden real critique reveal
- [x] P6 — paint while generating + submit drawing vs AI before critique
- [x] P4 follow-up — `LEVEL_1.startingCash` 25 / `targetCash` 50 (orchestrator, contracts)
- [x] P8 / P9 — Spec 24 MVP (receptionist talk + commission board)
- [x] Playtest 2: P11–P18 (incl. Spec 25 MVP for P16)
- [x] Playtest 3: P19–P23 (engine load, no level wipe, Mum max, abstract ramp, ink brush)
- [x] Playtest 4: P24 — medium before My idea + copy rename
- [ ] Playtest 4: P25–P28 (matched only — not fixed yet)
- [ ] Triaged into task specs / bugfix PRs

---

# Playtest notes 2 (2026-08-01 evening)

Second pass after wave 1–4 merges. Match to tasks; not fixed yet.

| #   | Kind   | Note                                                                                                                                                                        | Primary task(s) / commits                                                                | Notes / secondary                                                                                         |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P11 | Bug    | Still **cannot type** in the SvelteKit prompt box — Phaser may still intercept keys (or another focus/capture bug)                                                          | **17** `domInputFocus` / `StudioScene` (**P5** regression) + **04** PromptComposer focus | **Fixed** — `disableGlobalCapture` + canvas blur on focus-in (2026-08-01)                                 |
| P12 | Bug    | Kitchen view better but room sits **top-left** with lots of blank Phaser space — **zoom in ×4**                                                                             | **17** `cameraFit.ts` / `#applyRoomViewport` (follow-up to **P2/P3** `f09efd7`)          | **Fixed** — 4× max zoom + letterbox bounds center room (2026-08-01)                                       |
| P13 | Bug    | P6 loop: when prompt image finishes, **drawing disappears** — keep canvas; show **AI image below** drawing; player must finish painting                                     | **11** / **P6** (`7caf51e` `confirmSubmitChoice` / `StudioHudOverlay`)                   | **Fixed** — canvas stays visible/interactive; AI preview stacked below (2026-08-01)                       |
| P14 | Design | Replace “Waiting for the commissioner” with **medium-relevant stall** lines (“Ironing out the paper”, “Framing it up”, “Putting pencils away”, …) — art not handed over yet | **03** UI + **13** mediums — `StudioHudOverlay` critiquing `stageLabel` / message pools  | **Fixed** — `$lib/data/stallMessages` + `activeMediumTierId` on overlay (2026-08-01)                      |
| P15 | Bug    | Image / critique **titles often cut too short**                                                                                                                             | **03** `ResultsPanel` / artwork title display (+ maybe engine title length)              | **Fixed** — wrap + tooltip on results headings; mock titles use five prompt words (2026-08-01)            |
| P16 | Design | **New Spec 25** — brush types: draw in crayons/watercolours/etc.; choose medium in painting section                                                                         | **[25](./tasks/25-brush-media.md)** 25a picker + 25b stroke profiles                     | **Fixed** — medium picker on `StudioHudOverlay`; brush profiles on `SketchCanvas` (2026-08-01)            |
| P17 | Design | When player can afford an unlock, show a **notification badge** on the relevant menu button                                                                                 | **13/14/16** shops + **03** `GameMenuBar` (affordability affordance)                     | **Fixed** — `$lib/game/affordabilityBadges` + amber dots on Toolkit / Gallery / Staff / Team (2026-08-01) |
| P18 | Design | Player should be able to **decline / say no** to commissions                                                                                                                | **04** invite/brief flow (+ **24a** receptionist board when present)                     | **Fixed** — `declineClient()` + briefing **No thanks**; reception board footer (2026-08-01)               |

## Suggested fix order (playtest 2)

1. ~~**P11** — typing broken again (blocks prompt loop)~~ **done**
2. ~~**P13** — paint + AI layout (blocks new loop fantasy)~~ **done**
3. ~~**P12** — kitchen zoom ×4 / centering~~ **done**
4. ~~**P14** — stall copy by medium~~ **done**
5. ~~**P15** — title truncation~~ **done**
6. ~~**P18** — decline commission~~ **done**
7. ~~**P17** — affordability badges on menu~~ **done**
8. ~~**P16** → Spec **25** (after outline lock)~~ **done**

---

# Playtest notes 3 (2026-08-04)

Third pass after Spec 25 merge. Match to tasks/commits; not fixed yet.

| #   | Kind    | Note                                                                                                                                                                                                                                       | Primary task(s) / commits                                                                                                    | Notes / secondary                                                                                                                   |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| P19 | Bug/UX  | On open, UI says **“Loading Crayon Mode”** while **Janus** is actually loading from a previously selected engine. Engine menu half-opens (only **Close**), stalls ~5–10s, then options appear. Want a clearer **Janus loading** indicator. | **04** `+page` / `EngineStore` + **02** manager init + **03** `EnginePicker` / `ModelDownloadGate` (after **P10** `41b65f5`) | **Fixed** — `activeDisplayName` / `displayNameForEngine` during init; `EnginePicker` loading placeholder with progress (2026-08-04) |
| P20 | Design  | Briefs jump from **“draw a house”** to **“what does peace look like”** too fast. Want **gradual** abstractness as reputation / commissions build.                                                                                          | **18** `maxWalkInAbstractness` / `kitchenBriefs` (`f8f1b63` / Spec 18)                                                       | **Fixed** — band 1 at rep ≥4 or ≥6 commissions; band 2 at rep ≥10 or ≥12; `pickBrief` threads reputation (2026-08-04)               |
| P21 | Design  | Completing the first “level” **resets money and deletes paintings**. There shouldn’t really be levels — progress = unlocks. **Never wipe cash or gallery.**                                                                                | **01** `levelRules` / **04** `LevelCompleteOverlay` → `game.reset()` + **12/20** progression fantasy                         | **Fixed** — one-time `careerMilestoneAcknowledged` overlay; `acknowledgeCareerMilestone()` keeps progress (2026-08-04)              |
| P22 | Design  | Watercolour brush feels great. **Ink & Charcoal** (`ink` tier) looks like plain pen — little/no distinct texture. Limit colours to **B&W**; give strokes a charcoal/ink texture.                                                           | **[25](./tasks/25-brush-media.md)** B3 / polish **25c** (`e81307d` / `b7927c3`)                                              | **Fixed** — B&W swatches only; charcoal grain + soft edge + bleed; chromatic snap to black (2026-08-04)                             |
| P23 | Balance | **Mum** should always pay the **maximum (~$5)** and grant the **maximum** of other progression (rep / skill XP).                                                                                                                           | **01** `calculatePayout` / briefs + **P7** Mum path (`299bb2d`) + **20** `previewSkillGains` / `reputationGain`              | **Fixed** — `MUM_PAYOUT_CASH` $5, `mumSkillGains()` 10/10/20, `MUM_REPUTATION_GAIN` 3; all Mum brief budgets $5 (2026-08-04)        |

## Suggested fix order (playtest 3)

1. ~~**P21** — level-complete wipe (destroys career progress; blocks trust)~~ **done**
2. ~~**P19** — engine load label / picker stall (first-impression confusion)~~ **done**
3. ~~**P23** — Mum always max $5 + max progression gains (early economy)~~ **done**
4. ~~**P20** — slower abstractness ramp (Spec 18 retune)~~ **done**
5. ~~**P22** — ink/charcoal brush feel + B&W palette (Spec 25 follow-up)~~ **done**

---

# Playtest notes 4 (2026-08-04 morning)

Fourth pass after playtest 3 merges. Match to tasks/commits; not fixed yet.

| #   | Kind   | Note                                                                                                                                                                                         | Primary task(s) / commits                                                                                             | Notes / secondary                                                                                                                                                  |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P24 | Design | Choose **pen / art style (medium) before** entering the idea. Typing then switching brushes makes AI gen ≠ painting. Rename UI **“prompt” → “My idea”**.                                     | **25** medium picker + **03** `PromptComposer` / `StudioHudOverlay` (`e81307d`) + **04** `createArt` medium bind      | **Fixed** — medium picker on **briefing** above **My idea**; locked label during `generating`; PromptComposer + AI preview alt copy (2026-08-04)                   |
| P25 | Design | Ability to **skip commissions**                                                                                                                                                              | **04** / **P18** `declineClient` (`4f3218e`) + **24a** board                                                          | Briefing already has **No thanks**; may need clearer **Skip** wording, idle skip, or skip after accept / while generating — confirm affordance coverage            |
| P26 | Design | Mum reveal button: **“You can be honest with me mum…”** instead of **“Ask for a real critique”**                                                                                             | **03** `ResultsPanel` + **P7** (`299bb2d`)                                                                            | **Fixed** — Mum reveal button copy + aria-label on `ResultsPanel` Mum path only (2026-08-04)                                                                       |
| P27 | Design | Garage **must not** have a receptionist yet. Keep commission **selection** UI, but: **garage = letterbox**, next venue = **computer**, later = **receptionist**.                             | **24** `receptionistUnlocked` / `ReceptionDesk` + **14** venues (`garage` → `storefront` → …) + **21b** interactables | Today `receptionistUnlocked` is true from **garage** up (`artists.ts`). Retune gates + surface variants (letterbox / computer / receptionist) by `unlockedVenueId` |
| P28 | Design | Simple → abstract ramp still too steep — want more **exponential** openness. Garage briefs like **“a cool car”**, **“a beautiful fairy”** (subjective adjectives). Gradually widen openness. | **18** `kitchenBriefs` + `maxWalkInAbstractness` (after **P20** `cf001f8`)                                            | Rewrite early band copy toward concrete + soft subjectivity; push band 1/2 unlocks later (and/or add a gentler mid band) so fridge/garage stay playful longer      |

## Suggested fix order (playtest 4)

1. ~~**P24** — medium before “My idea” (gen/paint mismatch)~~ **done**
2. ~~**P26** — Mum honesty button copy (tiny)~~ **done**
3. **P25** — skip commission affordance polish
4. **P28** — garage brief content + slower/exponential abstractness
5. **P27** — letterbox → computer → receptionist by venue (largest)
