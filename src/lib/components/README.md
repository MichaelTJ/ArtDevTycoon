# UI Components

Presentational Svelte 5 components for Art Gallery Tycoon Level 1. Every component is **props
in, callbacks out** — no global state, no `fetch`, no imports from `$lib/stores` or
`$lib/game`. Spec 04 assembles these into the game screen.

## Public surface

Import everything from `$lib/components` (barrel `index.ts`):

| Component              | Props                                                                                                                                                                                                                                                                                                                                                                                | Callbacks                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OperationsPanel`      | `summary`, `needs`, `entries`, `totalMatching`, `query` (bindable)                                                                                                                                                                                                                                                                                                                   | `onquerychange?()`                                                                                                                                                                                           |
| `Avatar`               | `src`, `name`, `size?` (`sm`/`md`/`lg`)                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                            |
| `ScoreBadge`           | `label`, `score`, `max?`                                                                                                                                                                                                                                                                                                                                                             | —                                                                                                                                                                                                            |
| `HudBar`               | `cash`, `levelName`, commissions/cash targets, `reputation`, `reputationMeter`, `skillSummaries?`, `skillsEmphasize?`, `variant?`                                                                                                                                                                                                                                                    | —                                                                                                                                                                                                            |
| `ProgressMeter`        | `label`, `value`, `max`, `hint?`, `delta?`, `emphasize?`, `variant?` — compact puts `hint` on the label row (no third line)                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                            |
| `ProgressPanel`        | `cash`, `reputation`, career/standing meters, `skills`, `mediumSkills` (Spec 27 ranks, ladder order)                                                                                                                                                                                                                                                                                 | `onclose()`                                                                                                                                                                                                  |
| `AudioSettingsPanel`   | `prefs: AudioPrefs`                                                                                                                                                                                                                                                                                                                                                                  | `onchange(patch)`, `onclose()`                                                                                                                                                                               |
| `SaveSlotsPanel`       | `slots`, `activeId`, `busy?`                                                                                                                                                                                                                                                                                                                                                         | `onswitch` / `onnew` / `ondelete` / `onrename` / `oncopy` / `onclose`                                                                                                                                        |
| `WorkGainToast`        | `gains`, `reputation`, `cash`, `mode` (`pending`/`collected`)                                                                                                                                                                                                                                                                                                                        | —                                                                                                                                                                                                            |
| `ClientCard`           | `brief: ClientBrief` (shows `ClientTierBadge`)                                                                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                            |
| `ClientTierBadge`      | `tier: ClientTier`                                                                                                                                                                                                                                                                                                                                                                   | —                                                                                                                                                                                                            |
| `AbstractBriefHint`    | `abstractness: AbstractnessLevel` (renders nothing when `0`)                                                                                                                                                                                                                                                                                                                         | —                                                                                                                                                                                                            |
| `PromptComposer`       | `value?` (bindable), `disabled?`, `maxLength?`                                                                                                                                                                                                                                                                                                                                       | `onsubmit(prompt)`                                                                                                                                                                                           |
| `GeneratingPanel`      | `messages?`, `intervalMs?`, `progress?`, `stageLabel?`                                                                                                                                                                                                                                                                                                                               | —                                                                                                                                                                                                            |
| `ArtworkFrame`         | `imageUrl`, `title`, `alt`, `size?` (`thumb`/`full`) — full-size captions wrap (`break-words`) with `title` tooltip                                                                                                                                                                                                                                                                  | —                                                                                                                                                                                                            |
| `ResultsPanel`         | `artwork`, `critique`, `clientName`, `mumRealCritique?`, `pendingSkillGains?`, `pendingReputation?`                                                                                                                                                                                                                                                                                  | `oncollect()`                                                                                                                                                                                                |
| `AuctionResultPanel`   | `bidderCount`, `bids`, `winningBid`                                                                                                                                                                                                                                                                                                                                                  | `oncollect()`                                                                                                                                                                                                |
| `PortfolioStrip`       | `entries`, `emptyMessage?`                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                            |
| `ErrorPanel`           | `message`                                                                                                                                                                                                                                                                                                                                                                            | `onretry()`, `ondismiss?()`                                                                                                                                                                                  |
| `IdlePanel`            | `disabled?`, `message?`                                                                                                                                                                                                                                                                                                                                                              | `oninvite()`, `onpractice?()` (Spec 28 CSS kitchen)                                                                                                                                                          |
| `LevelCompleteOverlay` | `cash`, `commissionsCompleted`, `message?` — career milestone (not a level wipe)                                                                                                                                                                                                                                                                                                     | `oncontinue()` — parent should call `acknowledgeCareerMilestone()`, not `reset()`                                                                                                                            |
| `CapabilityNotice`     | `supported`, `reason`, `canDownload?` (default false) — parent shows when active engine is mock (`engines.showCrayonNotice`) and welcome is dismissed. Empty `reason` hides the secondary line. Body: art is (poorly) drawn procedurally.                                                                                                                                            | `ondismiss()`, `ondownload?()` — **Continue without model** / optional amber **Download model**; viewport modal, backdrop does not dismiss                                                                   |
| `EnginePicker`         | `options: EngineOption[]`, `activeId`, optional `loading` / `loadingLabel` / `loadProgress` for init stall. Unavailable options show a **Needs WebGPU** badge when the reason mentions WebGPU. Fieldset is unboxed (`min-w-0 w-full border-0`) so the parent overlay can scroll.                                                                                                     | `onselect(id)`                                                                                                                                                                                               |
| `ModelDownloadGate`    | `engineName`, `approxMb`, `state?`, `progress?`, `stage?`, `detail?`, `errorMessage?`. Prompt/error cancel copy is **Continue without model**; loading stays **Cancel**.                                                                                                                                                                                                             | `onconfirm()`, `oncancel()`                                                                                                                                                                                  |
| `MyPcSetup`            | My PC providers incl. OpenRouter/OpenAI; cloud key warning; Coming soon = ComfyUI + ADT Cloud. Bindables: `provider`/`baseUrl`/`apiKey`/`generateModel`/`critiqueModel`/`critiqueProvider`/`critiqueBaseUrl`, plus `availableModels`/`testState`/`testError`                                                                                                                         | `onproviderchange?`, `onrefreshmodels()`, `ontest()`, `onconnect()`, `oncancel()`                                                                                                                            |
| `ToolkitShop`          | `tiers: MediumTier[]`, `unlockedTierIds`, `activeTierId`, `cash`, `reputation`                                                                                                                                                                                                                                                                                                       | `onunlock(id)`, `onselect(id)`, `onclose()`                                                                                                                                                                  |
| `GalleryUpgradeShop`   | `venues`/`layouts`/`atmosphereItems`, unlock/active/owned ids, `cash`, `reputation`                                                                                                                                                                                                                                                                                                  | `onunlockvenue`/`onunlocklayout`/`onselectlayout`/`onbuyatmosphere`/`onclose`                                                                                                                                |
| `StaffOffice`          | `roles: StaffRole[]`, `hiredIds`, `cash`, `reputation`                                                                                                                                                                                                                                                                                                                               | `onhire(id)`, `onclose()`, `onopenteam?()`                                                                                                                                                                   |
| `ReceptionDesk`        | Spec 24 / P27 — `offers: ClientBrief[]`, optional `channel` (`letterbox` / `computer` / `receptionist`)                                                                                                                                                                                                                                                                              | `onaccept(brief)`, `onclose()` — footer **Skip** also calls `onclose`                                                                                                                                        |
| `TeamRoster`           | Spec 24 — hired artist rows (`mediumSkillXp` per Spec 27) + catalog                                                                                                                                                                                                                                                                                                                  | `onhire`, `onfire`, `onclose()`                                                                                                                                                                              |
| `AssignArtistModal`    | Spec 24 — assign active brief to roster                                                                                                                                                                                                                                                                                                                                              | `onassign(catalogId)`, `onclose()`                                                                                                                                                                           |
| `MajorProjectPanel`    | Spec 24 — accept comic/series, crew beats, collect                                                                                                                                                                                                                                                                                                                                   | `onaccept`, `onassigncrew`, `onstartbeat`, `oncollect`, `onclose()`                                                                                                                                          |
| `IdleEarningsModal`    | `amount`                                                                                                                                                                                                                                                                                                                                                                             | `ondismiss()`                                                                                                                                                                                                |
| `GameMenuBar`          | `cash`, `levelName`, progress fields, engine button props; opens Toolkit / Gallery / Staff / Team / Progress / **Audio** / **How to play** / **Saves**; P17 amber dot + “Upgrades available” on shop buttons when an unlock is affordable; `devEnabled?` / `devReason?` open **Dev**                                                                                                 | `onopenenginemenu()`, `onopenwelcome?()`, `onafterslotchange?()`, `onlatchchange?()`                                                                                                                         |
| `DevPanel`             | `enabled`, `reason`, economy fields, `draftPrompt`, `modifiedPrompt`; hidden when `enabled=false`                                                                                                                                                                                                                                                                                    | cash/rep/commissions/unlock/idle/export/import/latch + optional `onopensaves`                                                                                                                                |
| `GameScene`            | `environment`, `galleryEntries`, `galleryLayoutClassName?`                                                                                                                                                                                                                                                                                                                           | `onselectentry(entry)`                                                                                                                                                                                       |
| `WorkspaceZone`        | `label`, `children` snippet                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                            |
| `FridgeGallery`        | `entries` (order preserved), `label?`, `emptyMessage?`, `layoutClassName?`                                                                                                                                                                                                                                                                                                           | `onselect(entry)`                                                                                                                                                                                            |
| `ArtworkFullView`      | `entry: GalleryEntry`                                                                                                                                                                                                                                                                                                                                                                | `onclose()`                                                                                                                                                                                                  |
| `StudioFloor`          | `bridge: StudioBridge`, `initialVenueId?`, `class?`; loading/error until bridge `ready`                                                                                                                                                                                                                                                                                              | — (Phaser emits via bridge)                                                                                                                                                                                  |
| `SketchCanvas`         | `disabled?`, `hasStrokes` (bindable), `mediumTierId?`, `heading?`, `extraTools?`, `fill?`, `onpracticetick?` / `nowMs?` / `ariaLabel?` — tools left / canvas right (Spec 31); crayon 8 swatches; pencil 14; no Custom colour; watercolor/acrylic/oil RGB wells (Spec 32); **ink = B&W only**; oil **Oil brush** kinds                                                                | `onexportready?(getBlob)` — PNG blob or `null` when blank; `onpracticetick?(deltaMs)` while the brush actually moves                                                                                         |
| `PracticeDesk`         | Spec 28 idle practice — `mediumTierId`, `unlockedMediumTierIds`, `cash`, `reputation`, `skill`, `rankUpLabel?`, `fill?`                                                                                                                                                                                                                                                              | `onselectmedium`, `onpracticetick`, `ondone`                                                                                                                                                                 |
| `StudioHudOverlay`     | phase, client/artwork/critique, `activeMediumTierId?`, `unlockedMediumTierIds?`, `cash?`, `reputation?`, `mumRealCritique?`, `draftPrompt` (bindable), `pendingSubmitChoice?`, `aiGeneratedImageUrl?`, `clientSummoned`, `floorInteract?`, `pendingSkillGains?`, `practiceOpen?`, `skill?`, `onsketchexportready?`, `onconfirmsubmit?`, `studioDebug?`, `modelLoading?`, `busyLine?` | `oninvite` / `ontalk` / `ondeliver` / `onsubmit` / `oncollect` / `onretry` / `ondismisserror` / `ondecline?` / `onassignartist?` / `onselectmedium?` / `onpractice?` / `onpracticetick?` / `onexitpractice?` |
| `EngineLoadSpinner`    | Spec 29 — `visible`, `label`, `reducedMotion?`, `percent?` (0–100). Small non-blocking card; spinner + label + optional `78%`. Hidden when `visible` is false. Not a dialog.                                                                                                                                                                                                         | —                                                                                                                                                                                                            |
| `WelcomeTutorial`      | Spec 30 first-visit one-pager — five locked `<li>` lines. Viewport modal matching `LevelCompleteOverlay` chrome.                                                                                                                                                                                                                                                                     | `oncontinue()` — **Let's go**; parent persists `adt.welcome.v1`                                                                                                                                              |
| `GenerationReadyToast` | Spec 31 — no props besides the open callback. Fixed top-right status toast while generate is ready.                                                                                                                                                                                                                                                                                  | `onopen()`                                                                                                                                                                                                   |
| `SubmitCompareModal`   | Spec 31 — `drawingImageUrl` (`null` = blank), `aiImageUrl`, `canSubmitDrawing`                                                                                                                                                                                                                                                                                                       | `onsubmitai()` / `onsubmitdrawing()` / `onback()`                                                                                                                                                            |

### Sketch pad (spec 11 + playtest P6 + Spec 25)

`SketchCanvas` is a presentational 384×384 paint surface. **Spec 31:** tools and colours sit in a left column; the canvas is centered on the right. The heading is **Practice** or the commission idea — not “Optional sketch”. After generate (`pendingSubmitChoice`), the canvas **stays mounted**; a **Your painting is ready** toast opens `SubmitCompareModal`. Parent registers the PNG exporter via `onsketchexportready`. Better mediums get more colours except Ink & Charcoal (B&W only): crayon 8 swatches, pencil 14, then watercolor/acrylic/oil RGB wells (Spec 32). No Custom colour input. Oil on Canvas shows **Oil brush** kinds (Round / Bristle / Flat / Palette knife). Undo stack depth is 20; clear wipes to white and clears `hasStrokes`.

**Spec 25:** `mediumTierId` selects a `brushProfiles` stroke feel (crayon grain, pencil thin lines, ink charcoal grain + bleed + B&W palette, watercolour wash). `StudioHudOverlay` shows a **Painting medium** picker during **briefing** (before **My idea** submit); selection syncs via `onselectmedium` → `game.setActiveMediumTier`. During **generating**, medium is a locked read-only label so AI gen and paint brush stay aligned. Locked tiers are disabled with cash/rep tease.

**Spec 28:** idle **Practice** (HUD button or desk E) opens `PracticeDesk` in the same viewport dialog as briefing/paint (Spec 31). Brush movement — including slow strokes — calls `onpracticetick`; eraser/idle sitting do not. Rank names and XP are shown — never the hidden suffix. Canvas init failure shows “Canvas unavailable”; **Done** still works.

### `ProgressPanel` (Spec 20 + Spec 27)

Craft skills stay on Collect Cash. **Medium skills** lists unlocked Toolkit mediums with
visible rank names only (never hidden suffixes). Parent passes `mediumSkills` (one
row per unlocked medium in ladder order).

### `ResultsPanel` (playtest P7 + P26)

When `mumRealCritique` is set, the panel shows toddler praise and **10/10** scores until the player clicks **You can be honest with me mum…** (accessible name matches visible copy). That reveals the stored engine critique and real scores; non-Mum results are unchanged.

### Studio floor (spec 17)

When `STUDIO_FLOOR_ENABLED` is true (default), `+page` mounts `StudioFloor` +
`StudioHudOverlay` for Level 1 instead of `KitchenScene`. `GameScene` still hosts the
CSS kitchen when the flag is false, and Coming Soon for levels 2–4. Phaser is created
via dynamic import in `StudioFloor` and destroyed on unmount. E2E uses `?dev=1` (or the
`?studioDebug=1` alias) so Talk/Deliver stay out of Playwright pathfinding.
`AbstractBriefHint` mounts inside `StudioHudOverlay` during briefing when abstractness ≥ 1.

### `EngineLoadSpinner` (Spec 29)

Fixed bottom-right non-blocking card (`pointer-events: none`, `role="status"`) while a
real engine is loading. Optional `percent` shows a monotonic 0–100 number. `reducedMotion`
and `prefers-reduced-motion` freeze the disc. `StudioHudOverlay` optional `busyLine` /
`modelLoading` replace idle “someone wants to talk” copy with channel lines and keep
Practice available; critique flavour sits above the stall panel.

### `WelcomeTutorial` (Spec 30)

First-visit studio one-pager. Prefs live in `$lib/welcome` (`adt.welcome.v1`), not career
saves. `+page` shows it until **Let's go**; `GameMenuBar` **How to play** re-opens it
without clearing dismissed. Crayon Mode notice waits until this overlay is gone. Fourth
bullet is **AI-assisted drawing** (no Janus / Wi-Fi / Crayon Mode).

### `AudioSettingsPanel` (Spec 21c)

Master / Music / SFX faders + Mute all. Prefs live in `$lib/audio` (`adt.audio.v1`), not
career saves. `GameMenuBar` opens this panel and unlocks the audio gesture gate.

### `DevPanel` (Spec 23)

Gated developer dialog: cheats, save import/export, and the Level 1 modifier peek.
Mounted only when `resolveDevMode` is on. Modifier text must never appear outside this
panel. When Spec 22 Saves is present, DevPanel links “Open saves” instead of duplicating
slot UI.

Types (`ClientBrief`, `Artwork`, `Critique`, `GalleryEntry`, `EngineOption`) come from
`$lib/types/contracts`. Operations types come from `$lib/game/operations`. Medium tiers
come from `$lib/data/mediumTiers`. Gallery venue/layout/atmosphere data come from
`$lib/data/galleryVenues`, `galleryLayouts`, and `galleryAtmosphere`. Staff roles come
from `$lib/data/staffRoles`.

### `ToolkitShop`

Purchasable medium ladder (crayon → oil). Props in, callbacks out — no store access.
`GameMenuBar` opens it as an overlay and wires `onunlock` / `onselect` to
`game.unlockMediumTier` / `game.setActiveMediumTier` (the one intentional store
import in this folder, so the shop works without editing orchestrator-owned
`+page.svelte` during parallel progression specs).

### `GalleryUpgradeShop`

Presentational overlay for venue / layout / atmosphere purchases (spec 14). Three tabs
with `role="tab"` / `aria-selected`. `GameMenuBar` mounts it the same way as
`ToolkitShop` and wires callbacks to `game.unlockVenue` / `unlockLayout` /
`setActiveLayout` / `buyAtmosphereItem`.

### `StaffOffice`

Presentational hire shop for spec 16 staff roles (Apprentice, Print Shop, Marketing
Director, Curator). Hired / not-hired cards only — no firing or switching. Shows
`$X/min` passive income and short tags for auto-invite / auto-curate. `GameMenuBar`
hosts it alongside the other shops.

### `IdleEarningsModal`

One-shot overlay shown when `game.idleEarningsToShow` is truthy after
`startIncomeTicker()` catch-up. Copy reports the earned amount; **Collect** calls
`ondismiss`, which clears the flag so it cannot reappear until the next catch-up.

### `OperationsPanel`

Early studio-management preview (not part of spec 03). The parent calls
`buildOperationalSnapshot()` whenever game state or `query` changes, then passes the
snapshot fields into this component. Spec 04 may wire this alongside the main game loop.

## Invariants

- Svelte 5 runes only (`$props`, `$state`, `$derived`, `$effect`). No stores, no
  `createEventDispatcher`.
- All transitions honour `prefersReducedMotion` from `svelte/motion`.
- Interactive elements are real `<button>`/`<input>`/`<progress>` with accessible names.
- Tap targets are at least 44×44 px (`min-h-11` on primary actions).
- `ClientCard` never renders `preferredKeywords` — those are the critic's private rubric.
- Medium skill HUD shows rank **names** only — never `mediumSkillSuffix` / prompt modifiers.
- `AbstractBriefHint` never leaks interpretation clusters; it only shows band-1/2 coaching copy.
- `ModelDownloadGate` prop `state` is renamed internally to `gateState` to avoid clashing
  with the `$state` rune.

## Avatar assets

Six flat SVG portraits live in `static/avatars/c1.svg` … `c6.svg`, matching the Level 1
brief ids. Each is under 2 KB with a `<title>` for accessibility.

## Tests

Every component has a sibling `ComponentName.svelte.test.ts` run in real Chromium
(`--project=client`). Run only this slice:

```powershell
npm run test:unit -- --run --project=client src/lib/components
```

## Deliberately not done

- No wiring to game stores inside presentational components — except `GameMenuBar`, which
  hosts the toolkit, gallery upgrade, and staff office overlays during progression specs.
- No engine loading logic — `EnginePicker` and `ModelDownloadGate` are display-only.
- `ToolkitShop` / `GalleryUpgradeShop` / `StaffOffice` / `IdleEarningsModal` are
  display-only; hire/tick persistence lives in `GameStore`.
- `FridgeGallery` preserves the entry order passed in (curator- or recency-sorted by the
  store); it does not re-sort by `completedAt`.
- No Level 2 UI gameplay (commercial gallery, reputation display). `SceneComingSoon`
  renders placeholder copy for levels 2–4 environments.
- `PortfolioStrip` is retained but unmounted; the fridge gallery replaces it in the
  Level 1 kitchen scene.
