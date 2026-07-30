# UI Components

Presentational Svelte 5 components for Art Gallery Tycoon Level 1. Every component is **props
in, callbacks out** — no global state, no `fetch`, no imports from `$lib/stores` or
`$lib/game`. Spec 04 assembles these into the game screen.

## Public surface

Import everything from `$lib/components` (barrel `index.ts`):

| Component              | Props                                                                                                            | Callbacks                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `OperationsPanel`      | `summary`, `needs`, `entries`, `totalMatching`, `query` (bindable)                                               | `onquerychange?()`                                                            |
| `Avatar`               | `src`, `name`, `size?` (`sm`/`md`/`lg`)                                                                          | —                                                                             |
| `ScoreBadge`           | `label`, `score`, `max?`                                                                                         | —                                                                             |
| `HudBar`               | `cash`, `levelName`, `commissionsCompleted`, `targetCommissions`, `targetCash`, `variant?` (`default`/`compact`) | —                                                                             |
| `ClientCard`           | `brief: ClientBrief` (shows `ClientTierBadge`)                                                                   | —                                                                             |
| `ClientTierBadge`      | `tier: ClientTier`                                                                                               | —                                                                             |
| `PromptComposer`       | `value?` (bindable), `disabled?`, `maxLength?`                                                                   | `onsubmit(prompt)`                                                            |
| `GeneratingPanel`      | `messages?`, `intervalMs?`, `progress?`, `stageLabel?`                                                           | —                                                                             |
| `ArtworkFrame`         | `imageUrl`, `title`, `alt`, `size?` (`thumb`/`full`)                                                             | —                                                                             |
| `ResultsPanel`         | `artwork`, `critique`, `clientName`                                                                              | `oncollect()`                                                                 |
| `AuctionResultPanel`   | `bidderCount`, `bids`, `winningBid`                                                                              | `oncollect()`                                                                 |
| `PortfolioStrip`       | `entries`, `emptyMessage?`                                                                                       | —                                                                             |
| `ErrorPanel`           | `message`                                                                                                        | `onretry()`, `ondismiss?()`                                                   |
| `IdlePanel`            | `disabled?`, `message?`                                                                                          | `oninvite()`                                                                  |
| `LevelCompleteOverlay` | `cash`, `commissionsCompleted`, `message?`                                                                       | `oncontinue()`                                                                |
| `CapabilityNotice`     | `supported`, `reason`                                                                                            | `ondismiss()`                                                                 |
| `EnginePicker`         | `options: EngineOption[]`, `activeId`                                                                            | `onselect(id)`                                                                |
| `ModelDownloadGate`    | `engineName`, `approxMb`, `state?`, `progress?`, `stage?`, `detail?`, `errorMessage?`                            | `onconfirm()`, `oncancel()`                                                   |
| `ToolkitShop`          | `tiers: MediumTier[]`, `unlockedTierIds`, `activeTierId`, `cash`, `reputation`                                   | `onunlock(id)`, `onselect(id)`, `onclose()`                                   |
| `GalleryUpgradeShop`   | `venues`/`layouts`/`atmosphereItems`, unlock/active/owned ids, `cash`, `reputation`                              | `onunlockvenue`/`onunlocklayout`/`onselectlayout`/`onbuyatmosphere`/`onclose` |
| `GameMenuBar`          | `cash`, `levelName`, progress fields, `engineButtonLabel`, `engineMenuTitle`, `engineMenuDisabled`               | `onopenenginemenu()`                                                          |
| `GameScene`            | `environment`, `galleryEntries`, `galleryLayoutClassName?`                                                       | `onselectentry(entry)`                                                        |
| `WorkspaceZone`        | `label`, `children` snippet                                                                                      | —                                                                             |
| `FridgeGallery`        | `entries`, `label?`, `emptyMessage?`, `layoutClassName?`                                                         | `onselect(entry)`                                                             |
| `ArtworkFullView`      | `entry: GalleryEntry`                                                                                            | `onclose()`                                                                   |

Types (`ClientBrief`, `Artwork`, `Critique`, `GalleryEntry`, `EngineOption`) come from
`$lib/types/contracts`. Operations types come from `$lib/game/operations`. Medium tiers
come from `$lib/data/mediumTiers`. Gallery venue/layout/atmosphere data come from
`$lib/data/galleryVenues`, `galleryLayouts`, and `galleryAtmosphere`.

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
  hosts the toolkit and gallery upgrade overlays during progression specs.
- No engine loading logic — `EnginePicker` and `ModelDownloadGate` are display-only.
- `ToolkitShop` / `GalleryUpgradeShop` are display-only; unlock persistence lives in
  `GameStore`.
- No Level 2 UI gameplay (commercial gallery, reputation display). `SceneComingSoon`
  renders placeholder copy for levels 2–4 environments.
- `PortfolioStrip` is retained but unmounted; the fridge gallery replaces it in the
  Level 1 kitchen scene.
