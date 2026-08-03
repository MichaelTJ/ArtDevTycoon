# UI Components

Presentational Svelte 5 components for Art Gallery Tycoon Level 1. Every component is **props
in, callbacks out** — no global state, no `fetch`, no imports from `$lib/stores` or
`$lib/game`. Spec 04 assembles these into the game screen.

## Public surface

Import everything from `$lib/components` (barrel `index.ts`):

| Component              | Props                                                                                                                                                                                                                                                                                                                       | Callbacks                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OperationsPanel`      | `summary`, `needs`, `entries`, `totalMatching`, `query` (bindable)                                                                                                                                                                                                                                                          | `onquerychange?()`                                                                                                                                       |
| `Avatar`               | `src`, `name`, `size?` (`sm`/`md`/`lg`)                                                                                                                                                                                                                                                                                     | —                                                                                                                                                        |
| `ScoreBadge`           | `label`, `score`, `max?`                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                        |
| `HudBar`               | `cash`, `levelName`, commissions/cash targets, `reputation`, `reputationMeter`, `skillSummaries?`, `skillsEmphasize?`, `variant?`                                                                                                                                                                                           | —                                                                                                                                                        |
| `ProgressMeter`        | `label`, `value`, `max`, `hint?`, `delta?`, `emphasize?`, `variant?` — compact puts `hint` on the label row (no third line)                                                                                                                                                                                                 | —                                                                                                                                                        |
| `ProgressPanel`        | `cash`, `reputation`, career/standing meters, `skills`                                                                                                                                                                                                                                                                      | `onclose()`                                                                                                                                              |
| `AudioSettingsPanel`   | `prefs: AudioPrefs`                                                                                                                                                                                                                                                                                                         | `onchange(patch)`, `onclose()`                                                                                                                           |
| `SaveSlotsPanel`       | `slots`, `activeId`, `busy?`                                                                                                                                                                                                                                                                                                | `onswitch` / `onnew` / `ondelete` / `onrename` / `oncopy` / `onclose`                                                                                    |
| `WorkGainToast`        | `gains`, `reputation`, `cash`, `mode` (`pending`/`collected`)                                                                                                                                                                                                                                                               | —                                                                                                                                                        |
| `ClientCard`           | `brief: ClientBrief` (shows `ClientTierBadge`)                                                                                                                                                                                                                                                                              | —                                                                                                                                                        |
| `ClientTierBadge`      | `tier: ClientTier`                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                        |
| `AbstractBriefHint`    | `abstractness: AbstractnessLevel` (renders nothing when `0`)                                                                                                                                                                                                                                                                | —                                                                                                                                                        |
| `PromptComposer`       | `value?` (bindable), `disabled?`, `maxLength?`                                                                                                                                                                                                                                                                              | `onsubmit(prompt)`                                                                                                                                       |
| `GeneratingPanel`      | `messages?`, `intervalMs?`, `progress?`, `stageLabel?`                                                                                                                                                                                                                                                                      | —                                                                                                                                                        |
| `ArtworkFrame`         | `imageUrl`, `title`, `alt`, `size?` (`thumb`/`full`) — full-size captions wrap (`break-words`) with `title` tooltip                                                                                                                                                                                                         | —                                                                                                                                                        |
| `ResultsPanel`         | `artwork`, `critique`, `clientName`, `mumRealCritique?`, `pendingSkillGains?`, `pendingReputation?`                                                                                                                                                                                                                         | `oncollect()`                                                                                                                                            |
| `AuctionResultPanel`   | `bidderCount`, `bids`, `winningBid`                                                                                                                                                                                                                                                                                         | `oncollect()`                                                                                                                                            |
| `PortfolioStrip`       | `entries`, `emptyMessage?`                                                                                                                                                                                                                                                                                                  | —                                                                                                                                                        |
| `ErrorPanel`           | `message`                                                                                                                                                                                                                                                                                                                   | `onretry()`, `ondismiss?()`                                                                                                                              |
| `IdlePanel`            | `disabled?`, `message?`                                                                                                                                                                                                                                                                                                     | `oninvite()`                                                                                                                                             |
| `LevelCompleteOverlay` | `cash`, `commissionsCompleted`, `message?` — career milestone (not a level wipe)                                                                                                                                                                                                                                            | `oncontinue()` — parent should call `acknowledgeCareerMilestone()`, not `reset()`                                                                        |
| `CapabilityNotice`     | `supported`, `reason` — parent shows when active engine is mock (`engines.showCrayonNotice`)                                                                                                                                                                                                                                | `ondismiss()`                                                                                                                                            |
| `EnginePicker`         | `options: EngineOption[]`, `activeId`, optional `loading` / `loadingLabel` / `loadProgress` for init stall                                                                                                                                                                                                                  | `onselect(id)`, `onconfigure?(id)` (My PC setup)                                                                                                         |
| `ModelDownloadGate`    | `engineName`, `approxMb`, `state?`, `progress?`, `stage?`, `detail?`, `errorMessage?`                                                                                                                                                                                                                                       | `onconfirm()`, `oncancel()`                                                                                                                              |
| `MyPcSetup`            | My PC providers incl. OpenRouter/OpenAI; cloud key warning; Coming soon = ComfyUI + ADT Cloud. Bindables: `provider`/`baseUrl`/`apiKey`/`generateModel`/`critiqueModel`/`critiqueProvider`/`critiqueBaseUrl`, plus `availableModels`/`testState`/`testError`                                                                | `onproviderchange?`, `onrefreshmodels()`, `ontest()`, `onconnect()`, `oncancel()`                                                                        |
| `ToolkitShop`          | `tiers: MediumTier[]`, `unlockedTierIds`, `activeTierId`, `cash`, `reputation`                                                                                                                                                                                                                                              | `onunlock(id)`, `onselect(id)`, `onclose()`                                                                                                              |
| `GalleryUpgradeShop`   | `venues`/`layouts`/`atmosphereItems`, unlock/active/owned ids, `cash`, `reputation`                                                                                                                                                                                                                                         | `onunlockvenue`/`onunlocklayout`/`onselectlayout`/`onbuyatmosphere`/`onclose`                                                                            |
| `StaffOffice`          | `roles: StaffRole[]`, `hiredIds`, `cash`, `reputation`                                                                                                                                                                                                                                                                      | `onhire(id)`, `onclose()`, `onopenteam?()`                                                                                                               |
| `ReceptionDesk`        | Spec 24 — `offers: ClientBrief[]`                                                                                                                                                                                                                                                                                           | `onaccept(brief)`, `onclose()` — footer **No thanks** also calls `onclose`                                                                               |
| `TeamRoster`           | Spec 24 — hired artist rows + catalog                                                                                                                                                                                                                                                                                       | `onhire`, `onfire`, `onclose()`                                                                                                                          |
| `AssignArtistModal`    | Spec 24 — assign active brief to roster                                                                                                                                                                                                                                                                                     | `onassign(catalogId)`, `onclose()`                                                                                                                       |
| `MajorProjectPanel`    | Spec 24 — accept comic/series, crew beats, collect                                                                                                                                                                                                                                                                          | `onaccept`, `onassigncrew`, `onstartbeat`, `oncollect`, `onclose()`                                                                                      |
| `IdleEarningsModal`    | `amount`                                                                                                                                                                                                                                                                                                                    | `ondismiss()`                                                                                                                                            |
| `GameMenuBar`          | `cash`, `levelName`, progress fields, engine button props; opens Toolkit / Gallery / Staff / Team / Progress / **Audio** / **Saves**; P17 amber dot + “Upgrades available” on shop buttons when an unlock is affordable; `devEnabled?` / `devReason?` open **Dev**                                                          | `onopenenginemenu()`, `onafterslotchange?()`, `onlatchchange?()`                                                                                         |
| `DevPanel`             | `enabled`, `reason`, economy fields, `draftPrompt`, `modifiedPrompt`; hidden when `enabled=false`                                                                                                                                                                                                                           | cash/rep/commissions/unlock/idle/export/import/latch + optional `onopensaves`                                                                            |
| `GameScene`            | `environment`, `galleryEntries`, `galleryLayoutClassName?`                                                                                                                                                                                                                                                                  | `onselectentry(entry)`                                                                                                                                   |
| `WorkspaceZone`        | `label`, `children` snippet                                                                                                                                                                                                                                                                                                 | —                                                                                                                                                        |
| `FridgeGallery`        | `entries` (order preserved), `label?`, `emptyMessage?`, `layoutClassName?`                                                                                                                                                                                                                                                  | `onselect(entry)`                                                                                                                                        |
| `ArtworkFullView`      | `entry: GalleryEntry`                                                                                                                                                                                                                                                                                                       | `onclose()`                                                                                                                                              |
| `StudioFloor`          | `bridge: StudioBridge`, `initialVenueId?`, `class?`; loading/error until bridge `ready`                                                                                                                                                                                                                                     | — (Phaser emits via bridge)                                                                                                                              |
| `SketchCanvas`         | `disabled?`, `hasStrokes` (bindable), `mediumTierId?` (Spec 25 brush feel), paint tools (brush/eraser, size 2–40, colour palette + custom)                                                                                                                                                                                  | `onexportready?(getBlob)` — PNG blob or `null` when blank                                                                                                |
| `StudioHudOverlay`     | phase, client/artwork/critique, `activeMediumTierId?`, `unlockedMediumTierIds?`, `cash?`, `reputation?`, `mumRealCritique?`, `draftPrompt` (bindable), `pendingSubmitChoice?`, `aiGeneratedImageUrl?`, `clientSummoned`, `floorInteract?`, `pendingSkillGains?`, `onsketchexportready?`, `onconfirmsubmit?`, `studioDebug?` | `oninvite` / `ontalk` / `ondeliver` / `onsubmit` / `oncollect` / `onretry` / `ondismisserror` / `ondecline?` (briefing) / `onselectmedium?` (generating) |

### Sketch pad (spec 11 + playtest P6 + Spec 25)

`SketchCanvas` is a presentational 384×384 paint surface. **P6:** shown during **`generating`** so the player can paint while the engine works; after generate (`pendingSubmitChoice`), the canvas **stays mounted and interactive on top** while the AI preview appears **below** it — player can keep painting until they pick **Submit AI image** vs **Submit your drawing** (disabled when blank). Parent registers the PNG exporter via `onsketchexportready` and calls `game.confirmSubmitChoice` with the blob when the player picks their drawing. Briefing is prompt-only. Undo stack depth is 20; clear wipes to white and clears `hasStrokes`.

**Spec 25:** `mediumTierId` selects a `brushProfiles` stroke feel (crayon grain, pencil thin lines, ink bleed, watercolour wash). `StudioHudOverlay` shows a **Painting medium** picker during `generating`; selection syncs via `onselectmedium` → `game.setActiveMediumTier`. Locked tiers are disabled with cash/rep tease.

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
