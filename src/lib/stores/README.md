# Game stores (`src/lib/stores`)

Reactive Svelte 5 stores that wire the domain layer, engine manager, and UI together.

## Public surface

| Export                      | Role                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `engines`                   | Singleton {@link EngineStore} — engine picker state and the one {@link EngineManager}                  |
| `engines.manager`           | The engine instance {@link GameStore} calls for `generate` / `critique`                                |
| `engines.activeDisplayName` | Player-facing label for {@link EngineStore.activeId}, even before {@link EngineStore.options} populate |
| `engines.isBusy`            | Derived — true during probe/init or an in-flight engine switch                                         |
| `displayNameForEngine(id)`  | Static fallback map (`ENGINE_DISPLAY_NAMES`) for menu labels during init                               |
| `engines.showCrayonNotice`  | Derived — true when `activeId === 'mock'` and the Crayon banner was not dismissed                      |
| `holdPeakProgress`          | Spec 30 — peak-hold HF overall percents; drop Janus processor/model 15%/90% file remaps                |
| `game`                      | Singleton {@link GameStore} — commission loop state machine                                            |
| `game.rescheduleAutoInvite` | Spec 29 — public wrapper around the idle auto-invite timer (retries after a busy no-op summon)         |

Import from:

- `$lib/stores/engineStore.svelte`
- `$lib/stores/gameState.svelte`

## State machine

| Phase           | UI                                                                                                                                                                                              | Entry                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `idle`          | Side rail, or Spec 28 {@link PracticeDesk} in a viewport dialog when `practiceOpen`                                                                                                             | start / after collect                                         |
| `briefing`      | {@link ClientCard} + {@link PromptComposer} + **Skip**                                                                                                                                          | `inviteClient()` / `acceptBoardBrief()`                       |
| `generating`    | Viewport dialog: {@link SketchCanvas} (paint while waiting; stays mounted) + compact wait / **Finished!** in the same right-hand column + {@link SubmitCompareModal} + medium XP bar + **Skip** | `createArt()` then player picks                               |
| `critiquing`    | {@link ClientCard} + {@link ArtworkFrame} + {@link GeneratingPanel} + {@link CritiqueSentToast}                                                                                                 | after submit choice                                           |
| `results`       | {@link ResultsPanel}                                                                                                                                                                            | after critique                                                |
| `failed`        | {@link ErrorPanel} + composer                                                                                                                                                                   | engine error                                                  |
| `levelComplete` | {@link LevelCompleteOverlay} — one-time career milestone; dismiss via `acknowledgeCareerMilestone()`                                                                                            | First time both LEVEL_1 targets met (if not yet acknowledged) |

Every store method guards on the current phase. `collectCash()` is async and idempotent —
calling it twice does not pay twice. Blob image URLs are converted to durable `data:` URLs
before the gallery entry is persisted.

## Invariants

- `GameStore` defaults to `engines.manager`, never a second `EngineManager`.
- Spec 24 adds `hiredArtists`, `artistAssignment`, `majorProjectProgress` (parallel to spec 16
  `hiredStaffIds` — idle income unchanged). Spec 27 adds `playerMediumSkillXp` / per-artist
  `mediumSkillXp` (look, not speed) and `grantPracticeDrawingMs` for Spec 28. Spec 28 adds
  session-only `practiceOpen` / `enterPractice` / `exitPractice` (not a `GamePhase`, not in
  `saveDataSchema`). Auto-invite is paused while practising; leaked canvas ticks grant no XP
  after **Scrap**. Spec 34 persists `practiceArtworks`; session `practiceStrokeMs` /
  `lastPracticeSale`. `keepPractice` / `hangPracticeFromStorage` / `movePracticeToStorage`
  manage keep vs wall vs crate. `displayedGalleryEntries` hangs practice first (newest
  `createdAt`), then commissions in remaining venue capacity; overflow practice goes to
  storage. Idle sale ticks (`PRACTICE_SALE_TICK_MS`) pay cash only — no reputation, no
  commission count, no offline catch-up. `GameStoreDeps.random` seeds the roll.
- `createArt()` calls `engines.setSwitchingLocked(true)` until `confirmSubmitChoice` finishes (or generation fails).
- Playtest P6: `createArt()` runs prompt-only generate, then `pendingSubmitChoice` until the player calls `confirmSubmitChoice('drawing' | 'ai', sketchBlob?)`; critique uses the chosen `imageUrl` (no new `GamePhase` — still `generating` during the choice step).
- Hidden prompt modifiers are applied inside `createArt()` via `buildPrompt(..., skillLevel)`
  (style suffix + Round 7 background) and inside artist assign; the UI never displays the
  built prompt. Rank names show on Progress, the team roster, and the Spec 28 practice desk.
- `GameState` does not persist across reloads (intentional for Level 1 testing). Engine
  choice persists via `EngineManager` / `localStorage`.
- Career milestone overlay (`levelComplete` phase) shows at most once per save slot.
  `acknowledgeCareerMilestone()` persists `careerMilestoneAcknowledged` and returns to
  `idle` without wiping cash, gallery, or unlocks. `reset()` remains for new-game /
  slot wipe only.
- Playtest P25: `declineClient()` skips during **briefing** or **generating** (including
  `pendingSubmitChoice`); clears client/artwork/draft and returns to `idle` with no payout.
  In-flight generate/critique abort via existing phase guards; `#setSwitchingLocked(false)`
  when skipping from generating.
- Playtest P23: Mum commissions bypass `calculatePayout` — `#applyCritiqueResult` and
  artist handoff set `finalPayout` to `MUM_PAYOUT_CASH` ($5), `pendingSkillGains` to
  `mumSkillGains()` (10/10/20), and `collectCash` applies `MUM_REPUTATION_GAIN` (3).
  Non-Mum clients unchanged.
- Playtest P27: `commissionChannel` / `commissionBoardAvailable` derive from
  `unlockedVenueId` (fridge → none; garage → letterbox; storefront → computer;
  gallery-hall+ → receptionist). `receptionistAvailable` is true only for the
  receptionist channel.

## Tests

```powershell
npm run test:unit -- --run --project=client src/lib/stores
npm run test:unit -- --run --project=node src/lib/stores
```

E2E commission loop: `e2e/game-loop.e2e.ts`.
