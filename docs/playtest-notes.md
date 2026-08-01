# Playtest notes (2026-08-01)

Tracked during post-gap-review playtest. Not fixed yet — matched to owning tasks.

| #   | Kind    | Note                                                                                                                                                                                                                          | Primary task(s)                                                                                     | Notes / secondary                                                                         |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| P1  | Bug     | Progression UI is a mess — text stacked on text                                                                                                                                                                               | **20** Progression feedback                                                                         | **Fixed** — compact meters single-line; HudBar full-width below menu buttons (2026-08-01) |
| P2  | Bug     | Phaser window slowly expands / feels like a zoom-in after start — worrying                                                                                                                                                    | **17** Phaser studio floor                                                                          | **Fixed** — fixed 420px host + `Scale.RESIZE`; no `scale.resize(room)` loop (2026-08-01)  |
| P3  | Bug     | Kitchen only shows ~3×3 tiles; too zoomed. Bigger rooms may show more (zoom tied to room size?). Prefer black/blank letterbox around smaller rooms so camera isn’t a microscope                                               | **17** camera/zoom + **19** office spaces                                                           | **Fixed** — `cameraZoomToFitRoom` caps zoom at 1×; whole kitchen letterboxes (2026-08-01) |
| P4  | Balance | Mum commission payouts way too big. Target: Mum pays **~$5**; enough for new pencils; garage move should stay pretty cheap                                                                                                    | **01** domain / scoring payouts + **12** progression + **13** mediums + **14** gallery unlock costs | Confirm which table drives kitchen payouts vs venue unlock prices                         |
| P5  | Bug     | After painting, focusing “your prompt” still lets Phaser eat keys — typing/WASD moves the character instead of inserting letters                                                                                              | **17** Phaser input capture + **04** integration (prompt field focus)                               | **Fixed** — `domInputFocus` gate via `StudioFloor` registry sync (2026-08-01)             |
| P6  | Design  | New loop: player prompts → while waiting, paint on canvas → on reveal, choose submit **own drawing** or **prompted image**                                                                                                    | **11** BAGEL sketch (+ refine)                                                                      | Touches **04** flow / results submit; may need a small new sub-spec later                 |
| P7  | Design  | Mum comments = toddler praise (“Wow! I love it so much!”, “Did you do this all by yourself?!”). Auto **10/10** Accuracy + Creativity. Real Janus critique hidden behind **“Ask for real critique”** (harsh = comedy contrast) | **18** abstract prompts / critique presentation + **03** results UI                                 | **Fixed** — praise pool + ResultsPanel reveal; payout uses 10/10 (2026-08-01)             |
| P8  | Design  | Want to **interact with NPCs** (talk / menus), not just see verbs / barks                                                                                                                                                     | **24** (24a talk handlers) — builds on **21a/21b/21f** floor targets                                | Today “Talk to …” is mostly label-only                                                    |
| P9  | Design  | One NPC is a **receptionist** who offers **choices of commissions**                                                                                                                                                           | **24** (24a receptionist + commission board)                                                        | Grown-up desk loop vs Mum kitchen invite                                                  |
| P10 | Bug     | ~~**Crayon Mode** notice stays up after selecting **Janus**~~ **Fixed** — notice gates on active mock engine, not device capability                                                                                           | **04** Integration — `CapabilityNotice` / `EngineStore` (`showCrayonNotice`)                        | Merged 2026-08-01                                                                         |

## Suggested fix order (when we start)

1. ~~**P5** — input focus (blocks typing/play)~~ **done**
2. ~~**P2 / P3** — studio camera (blocks reading the floor)~~ **done**
3. ~~**P10** — Crayon notice vs active engine~~ **done**
4. ~~**P1** — progression HUD readability~~ **done**
5. **P4** — early economy numbers
6. **P7** — Mum praise vs real critique (fun payoff)
7. **P6** — paint-while-waiting loop (larger design)
8. **P8 / P9** → Spec **24a** (after bugs above; see [24-artist-team.md](./tasks/24-artist-team.md))

## Status

- [x] P5 — DOM focus gate (`domInputFocus` + `StudioFloor` registry sync)
- [x] P2 — fixed viewport host; no room-sized `scale.resize` growth loop
- [x] P3 — `cameraZoomToFitRoom` (≤1× zoom, letterbox small rooms)
- [x] P10 — `showCrayonNotice` on active mock engine
- [x] P1 — progression HUD layout (compact meters + GameMenuBar stack)
- [x] P7 — Mum toddler praise + hidden real critique reveal
- [ ] Triaged into task specs / bugfix PRs
- [ ] Remaining items implemented
