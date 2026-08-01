# Task Specs — how to run the build

Self-contained specs. Each is written so an implementing agent needs **no other
context**: exact file paths, exact signatures, exact algorithms with worked examples,
and a test table with literal expected values.

Specs 01-07 built the Level 1 loop (see "The specs" below). Specs 12-16 are the next
wave: **game progression** on top of that loop — mediums, gallery upgrades, client
tiers, and staffing/automation. See "Progression specs" further down.

These are aimed at fast, cheap models. That drives the writing style: nothing is left
as "use your judgement", every formula is given in code, and every test case states the
expected number rather than describing it. Where a decision could go two ways, the spec
picks one.

---

## The specs

| #   | Spec                                                | Owns                                                                                   | Depends on |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------- |
| 01  | [Domain layer](./01-domain.md)                      | `src/lib/game/**`, `src/lib/data/**`                                                   | nothing    |
| 02  | [Engine layer](./02-engine-layer.md)                | `src/lib/engines/*.ts`, `src/lib/engines/mock/**`                                      | 01         |
| 03  | [UI component library](./03-ui-components.md)       | `src/lib/components/**`, `static/avatars/**`                                           | nothing    |
| 04  | [Integration](./04-integration.md)                  | `src/lib/stores/**`, `src/routes/+page.svelte`, `src/routes/+layout.svelte`, `e2e/**`  | 01, 02, 03 |
| 05  | [Janus WebGPU engine](./05-janus-engine.md)         | `src/lib/engines/janus/**`                                                             | 02         |
| 06  | [SD-Turbo engine](./06-sdturbo-engine.md)           | `src/lib/engines/sdturbo/**`                                                           | 02, 05     |
| 07  | [JanusLink My PC remote engine](./07-api-engine.md) | `src/lib/engines/remote/**`, `MyPcSetup.svelte`, plus registry, manager, store, picker | 02, 03, 04 |

### Provider specs (08–09 — ready to implement)

Multi-provider paths use **two model fields** where needed: **generation model** +
**critique model**. Spec 07's JanusLink path still uses one model for both.

| #   | Spec                                       | Owns (extends remote)                                                    | Depends on |
| --- | ------------------------------------------ | ------------------------------------------------------------------------ | ---------- |
| 08  | [Local providers](./08-local-providers.md) | `remote/providers/**` (ollama, lmstudio, a1111), config union, MyPcSetup | 07         |
| 09  | [BYO API](./09-byo-api.md)                 | openrouter + openai clients, cloud config arms, MyPcSetup tabs           | 08         |

### Sketch / refine (11 — ready)

| #   | Spec                                 | Owns                                                                  | Depends on |
| --- | ------------------------------------ | --------------------------------------------------------------------- | ---------- |
| 11  | [BAGEL sketch](./11-bagel-sketch.md) | `SketchCanvas`, optional `sketchImage` on generate, JanusLink `/edit` | 07–09      |

Companion: ADTLocalServe `POST /api/janus/edit` (not ComfyUI).

### Future specs (stubs — not ready to implement)

| #   | Stub                           | Topic                             |
| --- | ------------------------------ | --------------------------------- |
| 10  | [ADT Cloud](./10-adt-cloud.md) | Hosted service, accounts, credits |

## Execution order

```
Wave 1  (run both at once — zero file overlap)
   ├── 01 Domain          → worktree ../adt-wt-domain    branch agent/domain
   └── 03 UI components   → worktree ../adt-wt-ui        branch agent/ui

Wave 2  (after 01 is merged to main)
   └── 02 Engine layer    → worktree ../adt-wt-backend   branch agent/backend

Wave 3  (after 01, 02, 03 are merged — run both at once)
   ├── 04 Integration     → main tree            ← the game becomes playable here
   └── 05 Janus engine    → worktree ../adt-wt-sidecar   branch agent/sidecar

Wave 4  (optional, after 05 is merged)
   └── 06 SD-Turbo        → worktree ../adt-wt-sdturbo   branch agent/sdturbo

Wave 5  (optional, any time after wave 3 — no dependency on 05 or 06)
   └── 07 JanusLink My PC  → worktree ../adt-wt-remote    branch agent/remote

Wave G  (after 07 — local split-model providers; exclusive remote zone)
   └── 08 Local providers  → worktree ../adt-wt-local-providers  branch agent/local-providers

Wave H  (after 08 is merged — cloud BYO keys; same remote zone, do not overlap G)
   └── 09 BYO API          → worktree ../adt-wt-byo-api           branch agent/byo-api
```

Spec 07 connects to **Janus-Pro on the player's home GPU via JanusLink**
([ADTLocalServe](https://github.com/MichaelTJ/ADTLocalServe) — FastAPI + Tailscale phone-app,
Bearer auth from the static game). It does not need the in-browser Janus or SD-Turbo engines
merged, but it does need the engine manager (02) and picker UI (03, 04). Do not run it
concurrently with another agent touching `src/lib/engines/registry.ts`,
`src/lib/engines/manager.ts`, `src/lib/stores/engineStore.svelte.ts`, or
`src/lib/components/EnginePicker.svelte`.

Specs **08 and 09 MUST run sequentially**. Both own `remoteConfig`, `MyPcSetup`,
`engineStore` remote fields, and `getRemoteProviderClient`. Merge 08 and refresh the 09
worktree from `main` before starting 09.

The waves are ordered so the game is **playable and shippable at the end of wave 3**,
on the mock engine, with real AI arriving as an enhancement rather than a prerequisite.
That ordering is deliberate: it means a failure in the hardest, least predictable work
(specs 05 and 06) costs you a feature rather than the project.

Spec 02 leaves stub files at the two real-engine paths so `main` always compiles, which
is what lets 04 and 05 run concurrently.

## Progression specs (12-16)

Once the mock-engine loop from specs 01-04 is playable, `docs/architecture.md` §9
deliberately deferred everything that makes a _tycoon_ game feel like one: upgrades,
staff, gallery customisation, extra mediums, and richer clients. These five specs build
that layer. They do not depend on specs 05-11 (real AI engines) at all — they build on
top of whichever engine (`mock` or real) happens to be active, exactly like specs 03/04 do.

| #   | Spec                                                       | Owns (new)                                                                                                | Depends on                |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------- |
| 12  | [Progression persistence](./12-progression-persistence.md) | `src/lib/game/save.ts`                                                                                    | 01-04                     |
| 13  | [Medium & material tiers](./13-medium-tiers.md)            | `src/lib/data/mediumTiers.ts`, `ToolkitShop.svelte`                                                       | 12                        |
| 14  | [Gallery real estate](./14-gallery-real-estate.md)         | `src/lib/data/galleryVenues.ts`, `galleryLayouts.ts`, `galleryAtmosphere.ts`, `GalleryUpgradeShop.svelte` | 12 (parallel with 13)     |
| 15  | [Client prestige & demographics](./15-client-prestige.md)  | `src/lib/data/clientTiers.ts` + 3 brief pools, `src/lib/game/auction.ts`, `paletteSeries.ts`              | 12 (parallel with 13, 14) |
| 16  | [Studio automation & staffing](./16-studio-automation.md)  | `src/lib/data/staffRoles.ts`, `src/lib/game/idleIncome.ts`, `StaffOffice.svelte`                          | 12, 13, 14, 15            |

```
Wave A  (after 12 is merged — run 13, 14, 15 concurrently, each in its own worktree)
   ├── 13 Medium tiers        → worktree ../adt-wt-medium-tiers        branch agent/medium-tiers
   ├── 14 Gallery real estate → worktree ../adt-wt-gallery-real-estate branch agent/gallery-real-estate
   └── 15 Client prestige     → worktree ../adt-wt-client-prestige     branch agent/client-prestige

Wave B  (after 13, 14, 15 are all merged)
   └── 16 Studio automation   → worktree ../adt-wt-studio-automation   branch agent/studio-automation
```

13, 14 and 15 all touch `src/lib/stores/gameState.svelte.ts` (and possibly
`calculatePayout` when a medium/venue multiplier lands). Spec 15 is the only Wave A
agent allowed to edit `src/lib/types/contracts.ts` (additive `CLIENT_TIERS` + brief
fields) and adds `seriesOnBrandFlags` to `saveDataSchema`. Merge them one at a time and
re-run `npm run check`/`test:unit` after each merge rather than merging all three at once
— the same discipline as any wave-1 pair in the section above. Spec 14 adds the
`multiplier` parameter itself if 13 has not landed yet, and stubs
`activeMediumTier.payoutMultiplier` at `1` until medium tiers merge — after both are on
`main`, confirm `presentationMultiplier` is medium × layout × (1 + atmosphere). 15 is
also the only progression spec allowed to touch `src/lib/types/contracts.ts` (an additive
extension to `clientBriefSchema`); do not run it concurrently with any other agent
editing that file.

Expected merge hotspots with 13/14 on `gameState.svelte.ts`: `inviteClient` /
`createArt` payout branching, `#persist()`, and `GameStoreDeps`.

16 depends on all three because it automates things they each own: the Apprentice's
income needs spec 13's medium concept to make sense narratively (no code dependency), the
Curator reorders spec 14's gallery display, and the roster only becomes fully visible once
spec 15's client tiers exist. Do not start 16 until 13, 14 and 15 are all on `main`.

## Presentation specs (17+)

After the tycoon loop and progression shops work, presentation specs make the game feel
like a place you inhabit rather than a stack of menus. They sit on top of specs 01–04 and
12–16 and do **not** depend on AI engine specs 05–11.

| #   | Spec                                                          | Owns (new)                                                                                                                    | Depends on             |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 17  | [Phaser studio floor](./17-phaser-studio.md)                  | `src/lib/studio/**`, `StudioFloor.svelte`, `static/studio/**` (CC0 assets)                                                    | 01–04, 12–16           |
| 18  | [Progressive abstract prompts](./18-abstract-prompts.md)      | `kitchenBriefs.ts`, `abstractCritique.ts`, `AbstractBriefHint.svelte`, scoring/pickBrief/engine critique targets              | 01–04, 12–16           |
| 19  | [Office spaces & resident Mum](./19-office-spaces.md)         | `src/lib/studio/rooms*`, `npcWander`, `venueRooms`, Phaser scene rebuild / Mum NPC; small `+page` summon wiring               | 17, 18                 |
| 20  | [Progression feedback & skills](./20-progression-feedback.md) | `skills.ts`, `nextUnlock.ts`, `ProgressMeter` / `ProgressPanel` / `WorkGainToast`; HudBar + GameMenuBar meters; save skill XP | 12–16, 17; wait for 19 |
| 21  | [Living studio (catalog)](./21-living-studio.md)              | Parent catalog + ship board; boss plan [`21-boss-plan.md`](./21-boss-plan.md). MVP 21a–21f on tip                             | 17–20                  |
| 21a | [Living NPCs](./21a-living-npcs.md)                           | Mum sheet, floor staff, client tier looks, `hiredRoleIds` + `client.tier` — **shipped** (A1–A3; A4–A8 deferred)               | 17–20                  |
| 21b | [Interactables](./21b-interactables.md)                       | Prop registry, fridge, toolkit → open-shop — **shipped** (B1/B2/B5; B3–B12 deferred)                                          | 17–20; after/with 21a  |
| 21c | [Studio audio](./21c-studio-audio.md)                         | Music beds, work/cash SFX, `adt.audio.v1` — **shipped** (C1/C3/C4/C8; C2/C5–C7 deferred)                                      | 17–20                  |
| 21d | [Studio VFX](./21d-studio-vfx.md)                             | Desk dust + cash confetti; `reducedVfx` — **shipped** (D3/D4; D1–D2/D5–D10 deferred)                                          | 17–20                  |
| 21e | [Ambient events](./21e-ambient-events.md)                     | Bark / thought bubbles (Mum + staff) — **shipped** (E1; E2–E7 deferred)                                                       | 21a (+ ideally 21b)    |
| 21f | [Studio QoL](./21f-studio-qol.md)                             | Contextual E verbs, Mum BFS pathfind, `reducedVfx` consumers — **shipped** (F1/F4/F6; rest deferred)                          | after 21a/21b scene    |

### Meta / tooling specs (22–23)

| #   | Spec                                          | Owns (new)                                                                                  | Depends on                                        |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 22  | [Multiple save slots](./22-multiple-saves.md) | `saveSlots.ts`, `SaveSlotsPanel`, GameStore switch/new/delete, migration from `adt.save.v1` | 12 (+ ideally 20)                                 |
| 23  | [Dev mode](./23-dev-mode.md)                  | `src/lib/dev/**`, `DevPanel`, gated cheats + modifier peek; subsumes `?studioDebug`         | 01–04, 12; **after 22** if both touch GameMenuBar |

```
Wave C  (after 16 is merged — presentation)
   └── 17 Phaser studio floor → worktree ../adt-wt-phaser-studio   branch agent/phaser-studio

Wave D  (after 01–04 + 12–16 merged — content & critique; parallel pair, disjoint zones)
   ├── 18a Abstract prompts domain → worktree ../adt-wt-abstract-prompts      branch agent/abstract-prompts
   └── 18b Abstract prompts wire   → worktree ../adt-wt-abstract-prompts-wire branch agent/abstract-prompts-wire

Wave E  (after 17 and 18 are merged — do not overlap Wave D studio/`+page` edits)
   └── 19 Office spaces & Mum → main tree (or ../adt-wt-office-spaces)  branch agent/office-spaces

Wave F  (after 19 has committed — HUD/progression feedback; do not overlap 19's +page/studio edits)
   └── 20 Progression feedback & skills → main tree (or ../adt-wt-progression-feedback)  branch agent/progression-feedback

Wave G+ (after 20 — living studio; **do not merge to main** until user approves)
   ├── 21a Living NPCs      → shipped on gap tip (R1)     historical: agent/living-npcs
   ├── 21b Interactables    → shipped on gap tip (R2)     historical: agent/interactables
   ├── 21c Studio audio     → shipped on gap tip (R3)     historical: agent/studio-audio
   ├── 21d Studio VFX       → shipped on gap tip (R3)     historical: agent/studio-vfx
   ├── 21f Studio QoL       → shipped on gap tip (R4)     historical: agent/gap-studio-qol
   └── 21e Ambient events   → shipped on gap tip (R5)     historical: agent/gap-ambient

Wave J  (meta / tooling — after 12; prefer serial GameMenuBar)
   ├── 22 Multiple saves    → ../adt-wt-multiple-saves   branch agent/multiple-saves
   └── 23 Dev mode          → ../adt-wt-dev-mode         branch agent/dev-mode  (after 22)
```

Spec 17 adds Phaser 3 as an npm dependency (allowed exception in that spec), mounts a
walkable tilemap kitchen, and bridges to `GameStore` via `StudioBridge`. Domain rules and
engines stay in SvelteKit. Do not run it concurrently with another agent editing
`src/routes/+page.svelte` or `src/lib/stores/gameState.svelte.ts`.

Spec 18 makes walk-in briefs escalate from Mum's concrete kitchen asks ("Paint me a cat")
to pure mood ("I miss the old days"), and scores abstract briefs via interpretation
clusters instead of parroting vague request words. The orchestrator lands the additive
`contracts.ts` fields first; then Wave D runs two agents in parallel:

- **18a** owns `src/lib/data/**`, `src/lib/game/**` (kitchen briefs, `abstractCritique`,
  `scorePrompt` / `calculatePayout` / `pickBrief` gating).
- **18b** owns engines' critique target wiring, `gameState.inviteClient` progress arg,
  `AbstractBriefHint.svelte` + mount, and the architecture blurb.

Do not run 18a/18b concurrently with another agent editing `src/lib/game/scoring.ts`,
`src/lib/data/briefs.ts`, `src/lib/stores/gameState.svelte.ts`, or the Janus/remote/mock
`critique` methods. Merge 18a before 18b if either branch conflicts; prefer merging 18a
first so 18b's imports resolve on `main` during conflict fixups.

Spec 19 shrinks Mum's kitchen to a real `6×6` tile room, makes Mum a resident wander NPC
(first client; she never door-enters or leaves), and authors distinct floor plans /
textures / multi-room zones for garage → mega-museum venues. It edits Phaser studio
files and a thin `+page` summon path — **wait until Wave D (18) has committed and merged**
before starting, and do not run it beside any other agent on `src/lib/studio/**` or
`src/routes/+page.svelte`.

Spec 20 makes scoring and meta-progress readable: HUD progress meters for commissions,
cash goal, and reputation-to-next-unlock; three persisted craft skills (Prompting,
Imagination, Hustle) that gain XP on collect; pending gains on the results panel. It
touches `HudBar` / `GameMenuBar` / `ResultsPanel` / `save.ts` / `gameState` — **wait until
Wave E (19) has committed** so studio/`+page` wiring is stable, and do not run it beside
another agent on those menu or store files.

Spec 21’s parent catalog is [21-living-studio.md](./21-living-studio.md); implementable
slices are **21a–21f** (see table). MVP for **21a–21f is on the gap integration tip**.
Deferred catalog rows (A4–A8, B3–B12 extras, C2/C5–C7, D1–D2/D5–D10, E2–E7, most of F)
stay unticked until a follow-up owns them. Orchestrator tracking:
[21-boss-plan.md](./21-boss-plan.md). Only one agent may edit `StudioScene.ts` /
`bridge.ts` at a time.

Spec 22 adds three local save slots (`adt.save.slots.v1`) with migration from legacy
`adt.save.v1`. Spec 23 adds gated Dev mode (`?dev=1` / Vite DEV / latch) with cheats,
save import/export, and a dev-only Level 1 modifier peek — production players without
the gate never see it. Run **22 before 23** so GameMenuBar gains Saves, then Dev.

## Worktrees are already set up

```
C:/Users/JensenM/Documents/My Apps/Art Dev Tycoon          main                      → specs 01-05 merged
C:/Users/JensenM/Documents/My Apps/adt-wt-domain           agent/domain              → spec 01
C:/Users/JensenM/Documents/My Apps/adt-wt-ui               agent/ui                  → spec 03
C:/Users/JensenM/Documents/My Apps/adt-wt-backend          agent/backend             → spec 02
C:/Users/JensenM/Documents/My Apps/adt-wt-sidecar          agent/sidecar             → spec 05
C:/Users/JensenM/Documents/My Apps/adt-wt-progression-save agent/progression-save    → spec 12
C:/Users/JensenM/Documents/My Apps/adt-wt-studio-automation agent/studio-automation → spec 16
```

Spec 06 has no worktree yet; create one if and when you get to it. Spec 12 is merged
into `main`. Specs 13–15 are merged; Wave B (spec 16) runs in
`adt-wt-studio-automation`. Create any remaining progression worktrees with the
`git worktree add` command shown at the top of each spec file when you start them.

Each has `node_modules` junctioned to the main checkout, so `npm run check`, `npm run
lint` and `npm run test:unit` all work inside a worktree with no extra install. Every
worktree has its own git index and its own `.svelte-kit` cache, so concurrent agents
never race.

### Merging a finished branch

Agents do not run git. You do, from the main checkout:

```powershell
cd "C:\Users\JensenM\Documents\My Apps\Art Dev Tycoon"
git -C "..\adt-wt-domain" add -A
git -C "..\adt-wt-domain" -c user.name="Agent Domain" -c user.email="agent@local" commit -m "feat(domain): scoring, prompt pipeline and Level 1 brief pool"
git merge --no-ff agent/domain -m "merge: domain layer"
npm run check; npm run lint; npm run test:unit -- --run
```

If a wave-1 branch merges cleanly but breaks `check`, fix it on `main` before starting
the next wave. Do not start wave 2 on a red main.

### Refreshing a worktree after a merge

Wave 2 and 3 agents need the merged work:

```powershell
git -C "..\adt-wt-backend" merge main
```

---

## Prompting an implementing agent

Open the target worktree as the workspace, then paste this, substituting the two
bracketed values:

> Implement the spec at `docs/tasks/[01-domain.md]`.
>
> Read these four files completely before writing any code:
>
> 1. `best-practices.md` — the binding rules for this repo
> 2. `docs/architecture.md` — how the system fits together
> 3. `src/lib/types/contracts.ts` — the frozen shared types you must build against
> 4. `docs/tasks/[01-domain.md]` — your spec
>
> The spec lists exactly which files to create and which paths you own. Do not create
> or modify any file outside your ownership zone. Do not edit `package.json`,
> `vite.config.ts`, `tsconfig.json`, or anything in `src/lib/types/`. Do not run
> `npm install`. Do not run any git command that changes state — no commit, add,
> checkout, merge, or push.
>
> Implement every file in the spec, including its tests. Then run all three of these
> and fix anything they report in your own files:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Finally, write the directory `README.md` the spec asks for and append your handoff
> entry to `docs/agent-log.md` using the template in `best-practices.md` §6.3.

Specs 05 and 06 also require a manual browser check that cannot be automated; it is
described inside each of them.

### If the agent stalls or drifts

Cheaper models tend to fail in a few specific ways here. Watch for them:

- **Inventing a type instead of importing it.** Everything it needs is already in
  `src/lib/types/contracts.ts`. Point it back there.
- **Naming a component test `Foo.test.ts`.** It must be `Foo.svelte.test.ts`, or Vitest
  runs it in Node where it cannot mount, and the failure message is confusing.
- **Reaching for Svelte 4 syntax** (`export let`, `$:`, `writable`). Runes are forced on
  in `vite.config.ts`, so this is a hard compile error. The spec shows the runes form.
- **Writing a test that downloads a model.** On specs 05 and 06 this turns a test run
  into a multi-gigabyte download. Both specs forbid it; check the tests actually use the
  injected fakes.
- **Adding a server route.** There is no server. If an agent reaches for `+server.ts` or
  `$lib/server`, it has misread the architecture.

## Definition of done for the whole project

- [ ] Specs 01–05 implemented and merged into `main` (06 is optional)
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green on `main`
- [ ] `npm run test:e2e` passes the full commission loop on the mock engine
- [ ] `npm run build` produces a static bundle that runs from a plain file server
- [ ] `npm run dev` gives a playable Level 1 with nothing downloaded
- [ ] Selecting the Janus engine in a WebGPU browser generates real artwork
- [ ] On a device without WebGPU the game is still completable end to end
