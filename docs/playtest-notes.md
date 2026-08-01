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
- [ ] Playtest 2: P11–P15, P17–P18; P16 → Spec 25 outline
- [ ] Triaged into task specs / bugfix PRs

---

# Playtest notes 2 (2026-08-01 evening)

Second pass after wave 1–4 merges. Match to tasks; not fixed yet.

| #   | Kind   | Note                                                                                                                                                                        | Primary task(s) / commits                                                                | Notes / secondary                                                                              |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P11 | Bug    | Still **cannot type** in the SvelteKit prompt box — Phaser may still intercept keys (or another focus/capture bug)                                                          | **17** `domInputFocus` / `StudioScene` (**P5** regression) + **04** PromptComposer focus | **Fixed** — `disableGlobalCapture` + canvas blur on focus-in (2026-08-01)                      |
| P12 | Bug    | Kitchen view better but room sits **top-left** with lots of blank Phaser space — **zoom in ×4**                                                                             | **17** `cameraFit.ts` / `#applyRoomViewport` (follow-up to **P2/P3** `f09efd7`)          | **Fixed** — 4× max zoom + letterbox bounds center room (2026-08-01)                            |
| P13 | Bug    | P6 loop: when prompt image finishes, **drawing disappears** — keep canvas; show **AI image below** drawing; player must finish painting                                     | **11** / **P6** (`7caf51e` `confirmSubmitChoice` / `StudioHudOverlay`)                   | **Fixed** — canvas stays visible/interactive; AI preview stacked below (2026-08-01)            |
| P14 | Design | Replace “Waiting for the commissioner” with **medium-relevant stall** lines (“Ironing out the paper”, “Framing it up”, “Putting pencils away”, …) — art not handed over yet | **03** UI + **13** mediums — `StudioHudOverlay` critiquing `stageLabel` / message pools  | **Fixed** — `$lib/data/stallMessages` + `activeMediumTierId` on overlay (2026-08-01)           |
| P15 | Bug    | Image / critique **titles often cut too short**                                                                                                                             | **03** `ResultsPanel` / artwork title display (+ maybe engine title length)              | **Fixed** — wrap + tooltip on results headings; mock titles use five prompt words (2026-08-01) |
| P16 | Design | **New Spec 25** — brush types: draw in crayons/watercolours/etc.; choose medium in painting section                                                                         | **[25](./tasks/25-brush-media.md)** outline; builds on **11** + **13**                   | Catalog only for now                                                                           |
| P17 | Design | When player can afford an unlock, show a **notification badge** on the relevant menu button                                                                                 | **13/14/16** shops + **03** `GameMenuBar` (affordability affordance)                     | Toolkit / Gallery / Staff badges                                                               |
| P18 | Design | Player should be able to **decline / say no** to commissions                                                                                                                | **04** invite/brief flow (+ **24a** receptionist board when present)                     | Decline Mum walk-in and board offers                                                           |

## Suggested fix order (playtest 2)

1. ~~**P11** — typing broken again (blocks prompt loop)~~ **done**
2. ~~**P13** — paint + AI layout (blocks new loop fantasy)~~ **done**
3. ~~**P12** — kitchen zoom ×4 / centering~~ **done**
4. ~~**P14** — stall copy by medium~~ **done**
5. ~~**P15** — title truncation~~ **done**
6. **P18** — decline commission
7. **P17** — affordability badges on menu
8. **P16** → Spec **25** (after outline lock)
