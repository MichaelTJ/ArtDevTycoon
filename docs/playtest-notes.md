# Playtest notes (2026-08-01)

Tracked during post-gap-review playtest. Not fixed yet — matched to owning tasks.

| #   | Kind    | Note                                                                                                                                                                                                                          | Primary task(s)                                                                                     | Notes / secondary                                                             |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| P1  | Bug     | Progression UI is a mess — text stacked on text                                                                                                                                                                               | **20** Progression feedback                                                                         | Possibly layout debt from **03** UI components                                |
| P2  | Bug     | Phaser window slowly expands / feels like a zoom-in after start — worrying                                                                                                                                                    | **17** Phaser studio floor                                                                          | Resize / camera fit / CSS growth in `StudioFloor`                             |
| P3  | Bug     | Kitchen only shows ~3×3 tiles; too zoomed. Bigger rooms may show more (zoom tied to room size?). Prefer black/blank letterbox around smaller rooms so camera isn’t a microscope                                               | **17** camera/zoom + **19** office spaces                                                           | User preference: pad small rooms rather than zoom to fill                     |
| P4  | Balance | Mum commission payouts way too big. Target: Mum pays **~$5**; enough for new pencils; garage move should stay pretty cheap                                                                                                    | **01** domain / scoring payouts + **12** progression + **13** mediums + **14** gallery unlock costs | Confirm which table drives kitchen payouts vs venue unlock prices             |
| P5  | Bug     | After painting, focusing “your prompt” still lets Phaser eat keys — typing/WASD moves the character instead of inserting letters                                                                                              | **17** Phaser input capture + **04** integration (prompt field focus)                               | **Fixed** — `domInputFocus` gate via `StudioFloor` registry sync (2026-08-01) |
| P6  | Design  | New loop: player prompts → while waiting, paint on canvas → on reveal, choose submit **own drawing** or **prompted image**                                                                                                    | **11** BAGEL sketch (+ refine)                                                                      | Touches **04** flow / results submit; may need a small new sub-spec later     |
| P7  | Design  | Mum comments = toddler praise (“Wow! I love it so much!”, “Did you do this all by yourself?!”). Auto **10/10** Accuracy + Creativity. Real Janus critique hidden behind **“Ask for real critique”** (harsh = comedy contrast) | **18** abstract prompts / critique presentation + **03** results UI                                 | Engine stays **05/07**; only the default Mum surface changes                  |
| P8  | Design  | Want to **interact with NPCs** (talk / menus), not just see verbs / barks                                                                                                                                                     | **24** (24a talk handlers) — builds on **21a/21b/21f** floor targets                                | Today “Talk to …” is mostly label-only                                        |
| P9  | Design  | One NPC is a **receptionist** who offers **choices of commissions**                                                                                                                                                           | **24** (24a receptionist + commission board)                                                        | Grown-up desk loop vs Mum kitchen invite                                      |
| P10 | Bug     | **Crayon Mode** notice stays up after selecting **Janus** (likely other non-mock engines too)                                                                                                                                 | **04** Integration — `CapabilityNotice` / `EngineStore` (`realAiSupported` vs `activeId`)           | Secondary: **05** / **07** if availability lags after `select()`              |

## Suggested fix order (when we start)

1. ~~**P5** — input focus (blocks typing/play)~~ **done** (agent/pt-input)
2. **P2 / P3** — studio camera (blocks reading the floor)
3. **P10** — Crayon notice vs active engine (cheap UI fix)
4. **P1** — progression HUD readability
5. **P4** — early economy numbers
6. **P7** — Mum praise vs real critique (fun payoff)
7. **P6** — paint-while-waiting loop (larger design)
8. **P8 / P9** → Spec **24a** (after bugs above; see [24-artist-team.md](./tasks/24-artist-team.md))

## Status

- [x] P5 — DOM focus gate (`domInputFocus` + `StudioFloor` registry sync)
- [ ] Triaged into task specs / bugfix PRs
- [ ] Implemented
