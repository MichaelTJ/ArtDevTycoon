# UI Components

Presentational Svelte 5 components for Art Gallery Tycoon Level 1. Every component is **props
in, callbacks out** — no global state, no `fetch`, no imports from `$lib/stores` or
`$lib/game`. Spec 04 assembles these into the game screen.

## Public surface

Import everything from `$lib/components` (barrel `index.ts`):

| Component              | Props                                                                                                                                                                                                                                                        | Callbacks                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `OperationsPanel`      | `summary`, `needs`, `entries`, `totalMatching`, `query` (bindable)                                                                                                                                                                                           | `onquerychange?()`                                                                            |
| `Avatar`               | `src`, `name`, `size?` (`sm`/`md`/`lg`)                                                                                                                                                                                                                      | —                                                                                             |
| `ScoreBadge`           | `label`, `score`, `max?`                                                                                                                                                                                                                                     | —                                                                                             |
| `HudBar`               | `cash`, `levelName`, commissions/cash targets, `reputation`, `reputationMeter`, `skillSummaries?`, `skillsEmphasize?`, `variant?`                                                                                                                            | —                                                                                             |
| `ProgressMeter`        | `label`, `value`, `max`, `hint?`, `delta?`, `emphasize?`, `variant?`                                                                                                                                                                                         | —                                                                                             |
| `ProgressPanel`        | `cash`, `reputation`, career/standing meters, `skills`                                                                                                                                                                                                       | `onclose()`                                                                                   |
| `AudioSettingsPanel`   | `prefs: AudioPrefs`                                                                                                                                                                                                                                          | `onchange(patch)`, `onclose()`                                                                |
| `SaveSlotsPanel`       | `slots`, `activeId`, `busy?`                                                                                                                                                                                                                                 | `onswitch` / `onnew` / `ondelete` / `onrename` / `oncopy` / `onclose`                         |
| `WorkGainToast`        | `gains`, `reputation`, `cash`, `mode` (`pending`/`collected`)                                                                                                                                                                                                | —                                                                                             |
| `ClientCard`           | `brief: ClientBrief` (shows `ClientTierBadge`)                                                                                                                                                                                                               | —                                                                                             |
| `ClientTierBadge`      | `tier: ClientTier`                                                                                                                                                                                                                                           | —                                                                                             |
| `AbstractBriefHint`    | `abstractness: AbstractnessLevel` (renders nothing when `0`)                                                                                                                                                                                                 | —                                                                                             |
| `PromptComposer`       | `value?` (bindable), `disabled?`, `maxLength?`                                                                                                                                                                                                               | `onsubmit(prompt)`                                                                            |
| `GeneratingPanel`      | `messages?`, `intervalMs?`, `progress?`, `stageLabel?`                                                                                                                                                                                                       | —                                                                                             |
| `ArtworkFrame`         | `imageUrl`, `title`, `alt`, `size?` (`thumb`/`full`)                                                                                                                                                                                                         | —                                                                                             |
| `ResultsPanel`         | `artwork`, `critique`, `clientName`, `pendingSkillGains?`, `pendingReputation?`                                                                                                                                                                              | `oncollect()`                                                                                 |
| `AuctionResultPanel`   | `bidderCount`, `bids`, `winningBid`                                                                                                                                                                                                                          | `oncollect()`                                                                                 |
| `PortfolioStrip`       | `entries`, `emptyMessage?`                                                                                                                                                                                                                                   | —                                                                                             |
| `ErrorPanel`           | `message`                                                                                                                                                                                                                                                    | `onretry()`, `ondismiss?()`                                                                   |
| `IdlePanel`            | `disabled?`, `message?`                                                                                                                                                                                                                                      | `oninvite()`                                                                                  |
| `LevelCompleteOverlay` | `cash`, `commissionsCompleted`, `message?`                                                                                                                                                                                                                   | `oncontinue()`                                                                                |
| `CapabilityNotice`     | `supported`, `reason`                                                                                                                                                                                                                                        | `ondismiss()`                                                                                 |
| `EnginePicker`         | `options: EngineOption[]`, `activeId`                                                                                                                                                                                                                        | `onselect(id)`, `onconfigure?(id)` (My PC setup)                                              |
| `ModelDownloadGate`    | `engineName`, `approxMb`, `state?`, `progress?`, `stage?`, `detail?`, `errorMessage?`                                                                                                                                                                        | `onconfirm()`, `oncancel()`                                                                   |
| `MyPcSetup`            | My PC providers incl. OpenRouter/OpenAI; cloud key warning; Coming soon = ComfyUI + ADT Cloud. Bindables: `provider`/`baseUrl`/`apiKey`/`generateModel`/`critiqueModel`/`critiqueProvider`/`critiqueBaseUrl`, plus `availableModels`/`testState`/`testError` | `onproviderchange?`, `onrefreshmodels()`, `ontest()`, `onconnect()`, `oncancel()`             |
| `ToolkitShop`          | `tiers: MediumTier[]`, `unlockedTierIds`, `activeTierId`, `cash`, `reputation`                                                                                                                                                                               | `onunlock(id)`, `onselect(id)`, `onclose()`                                                   |
| `GalleryUpgradeShop`   | `venues`/`layouts`/`atmosphereItems`, unlock/active/owned ids, `cash`, `reputation`                                                                                                                                                                          | `onunlockvenue`/`onunlocklayout`/`onselectlayout`/`onbuyatmosphere`/`onclose`                 |
| `StaffOffice`          | `roles: StaffRole[]`, `hiredIds`, `cash`, `reputation`                                                                                                                                                                                                       | `onhire(id)`, `onclose()`                                                                     |
| `IdleEarningsModal`    | `amount`                                                                                                                                                                                                                                                     | `ondismiss()`                                                                                 |
| `GameMenuBar`          | `cash`, `levelName`, progress fields, engine button props; opens Toolkit / Gallery / Staff / Progress / **Audio** / **Saves**; `devEnabled?` / `devReason?` open **Dev**                                                                                     | `onopenenginemenu()`, `onafterslotchange?()`, `onlatchchange?()`                              |
| `DevPanel`             | `enabled`, `reason`, economy fields, `draftPrompt`, `modifiedPrompt`; hidden when `enabled=false`                                                                                                                                                            | cash/rep/commissions/unlock/idle/export/import/latch + optional `onopensaves`                 |
| `GameScene`            | `environment`, `galleryEntries`, `galleryLayoutClassName?`                                                                                                                                                                                                   | `onselectentry(entry)`                                                                        |
| `WorkspaceZone`        | `label`, `children` snippet                                                                                                                                                                                                                                  | —                                                                                             |
| `FridgeGallery`        | `entries` (order preserved), `label?`, `emptyMessage?`, `layoutClassName?`                                                                                                                                                                                   | `onselect(entry)`                                                                             |
| `ArtworkFullView`      | `entry: GalleryEntry`                                                                                                                                                                                                                                        | `onclose()`                                                                                   |
| `StudioFloor`          | `bridge: StudioBridge`, `initialVenueId?`, `class?`; loading/error until bridge `ready`                                                                                                                                                                      | — (Phaser emits via bridge)                                                                   |
| `SketchCanvas`         | `disabled?`, `hasStrokes` (bindable), paint tools (brush/eraser, size 2–40, colour palette + custom)                                                                                                                                                         | `onexportready?(getBlob)` — PNG blob or `null` when blank                                     |
| `StudioHudOverlay`     | phase, client/artwork/critique, `draftPrompt` (bindable), `clientSummoned`, `floorInteract?`, `pendingSkillGains?`, `onsketchexportready?`, `studioDebug?`                                                                                                   | `oninvite` / `ontalk` / `ondeliver` / `onsubmit` / `oncollect` / `onretry` / `ondismisserror` |

### Sketch pad (spec 11)

`SketchCanvas` is a presentational 384×384 paint surface shown during briefing above
`PromptComposer`. Parent (`+page` via `StudioHudOverlay.onsketchexportready`) registers
the PNG exporter and calls `game.setDraftSketch` before `createArt`. No store imports
inside the canvas. Undo stack depth is 20; clear wipes to white and clears `hasStrokes`.

### Studio floor (spec 17)

When `STUDIO_FLOOR_ENABLED` is true (default), `+page` mounts `StudioFloor` +
`StudioHudOverlay` for Level 1 instead of `KitchenScene`. `GameScene` still hosts the
CSS kitchen when the flag is false, and Coming Soon for levels 2–4. Phaser is created
via dynamic import in `StudioFloor` and destroyed on unmount. E2E uses `?dev=1` (or the
`?studioDebug=1` alias) so Talk/Deliver stay out of Playwright pathfinding.
`AbstractBriefHint` mounts inside `StudioHudOverlay` during briefing when abstractness ≥ 1.

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
