# UI Components

Presentational Svelte 5 components for Art Gallery Tycoon Level 1. Every component is **props
in, callbacks out** — no global state, no `fetch`, no imports from `$lib/stores` or
`$lib/game`. Spec 04 assembles these into the game screen.

## Public surface

Import everything from `$lib/components` (barrel `index.ts`):

| Component              | Props                                                                                                                        | Callbacks                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `OperationsPanel`      | `summary`, `needs`, `entries`, `totalMatching`, `query` (bindable)                                                           | `onquerychange?()`                                                            |
| `Avatar`               | `src`, `name`, `size?` (`sm`/`md`/`lg`)                                                                                      | —                                                                             |
| `ScoreBadge`           | `label`, `score`, `max?`                                                                                                     | —                                                                             |
| `HudBar`               | `cash`, `levelName`, `commissionsCompleted`, `targetCommissions`, `targetCash`, `variant?` (`default`/`compact`)             | —                                                                             |
| `ClientCard`           | `brief: ClientBrief`                                                                                                         | —                                                                             |
| `PromptComposer`       | `value?` (bindable), `disabled?`, `maxLength?`                                                                               | `onsubmit(prompt)`                                                            |
| `GeneratingPanel`      | `messages?`, `intervalMs?`, `progress?`, `stageLabel?`                                                                       | —                                                                             |
| `ArtworkFrame`         | `imageUrl`, `title`, `alt`, `size?` (`thumb`/`full`)                                                                         | —                                                                             |
| `ResultsPanel`         | `artwork`, `critique`, `clientName`                                                                                          | `oncollect()`                                                                 |
| `PortfolioStrip`       | `entries`, `emptyMessage?`                                                                                                   | —                                                                             |
| `ErrorPanel`           | `message`                                                                                                                    | `onretry()`, `ondismiss?()`                                                   |
| `IdlePanel`            | `disabled?`, `message?`                                                                                                      | `oninvite()`                                                                  |
| `LevelCompleteOverlay` | `cash`, `commissionsCompleted`, `message?`                                                                                   | `oncontinue()`                                                                |
| `CapabilityNotice`     | `supported`, `reason`                                                                                                        | `ondismiss()`                                                                 |
| `EnginePicker`         | `options: EngineOption[]`, `activeId`                                                                                        | `onselect(id)`                                                                |
| `ModelDownloadGate`    | `engineName`, `approxMb`, `state?`, `progress?`, `stage?`, `detail?`, `errorMessage?`                                        | `onconfirm()`, `oncancel()`                                                   |
| `GameMenuBar`          | `cash`, `levelName`, progress fields, `engineButtonLabel`, `engineMenuTitle`, `engineMenuDisabled`, `onopengalleryupgrades?` | `onopenenginemenu()`, `onopengalleryupgrades?()`                              |
| `GameScene`            | `environment`, `galleryEntries`                                                                                              | `onselectentry(entry)`                                                        |
| `WorkspaceZone`        | `label`, `children` snippet                                                                                                  | —                                                                             |
| `FridgeGallery`        | `entries`, `label?`, `emptyMessage?`, `layoutClassName?`                                                                     | `onselect(entry)`                                                             |
| `GalleryUpgradeShop`   | `venues`/`layouts`/`atmosphereItems`, unlock/active/owned ids, `cash`, `reputation`                                          | `onunlockvenue`/`onunlocklayout`/`onselectlayout`/`onbuyatmosphere`/`onclose` |
| `ArtworkFullView`      | `entry: GalleryEntry`                                                                                                        | `onclose()`                                                                   |

Types (`ClientBrief`, `Artwork`, `Critique`, `GalleryEntry`, `EngineOption`) come from
`$lib/types/contracts`. Operations types come from `$lib/game/operations`.

### `GalleryUpgradeShop`

Presentational overlay for venue / layout / atmosphere purchases (spec 14). Three tabs
with `role="tab"` / `aria-selected`. The parent mounts it (typically from
`GameMenuBar`'s `onopengalleryupgrades`) and wires callbacks to
`game.unlockVenue` / `unlockLayout` / `setActiveLayout` / `buyAtmosphereItem`. Pass
`GALLERY_VENUES`, `GALLERY_LAYOUTS`, and `ATMOSPHERE_ITEMS` as props — the shop does not
import the data modules itself so tests can inject fakes.

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

- No wiring to game stores inside presentational components — spec 04 assembles them in
  `+page.svelte`.
- No engine loading logic — `EnginePicker` and `ModelDownloadGate` are display-only.
- No Level 2 UI gameplay (commercial gallery, reputation display). `SceneComingSoon`
  renders placeholder copy for levels 2–4 environments.
- `PortfolioStrip` is retained but unmounted; the fridge gallery replaces it in the
  Level 1 kitchen scene.
