# Domain rules (`src/lib/game`)

Pure game logic with no Svelte, DOM, fetch, or engine dependencies. Safe to import from
stores, engines, workers, and tests. Every function is deterministic and side-effect free
except where an injected `random` callback is passed through from callers.

## Public surface

Import from `$lib/game` via the barrel in `index.ts`.

| Module                       | Exports                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text.ts`                    | `normalize`, `stem`, `STOPWORDS`                                                                                                                                                                  |
| `promptPipeline.ts`          | `sanitizePlayerPrompt`, `buildPrompt(playerInput, tier, skillLevel?)`, `buildLevel1Prompt`, `MAX_PROMPT_LENGTH`                                                                                   |
| `mediumSkill.ts`             | Spec 27 — per-medium ranks, time-based XP, `mediumSkillSuffix`, `mediumSkillBackground`, `grantPracticeDrawingMs` seam lives on GameStore                                                         |
| `scoring.ts`                 | `scorePrompt`, `calculatePayout`, `toGalleryScore`, `reputationGain`, `keywordMatches`, `ScoreBreakdown`                                                                                          |
| `abstractCritique.ts`        | `usesInterpretationScoring`, `selectBestCluster`, `critiqueTargetsForBrief`, `isAbstractParrot`, `ClusterMatch`                                                                                   |
| `levelRules.ts`              | `isLevelComplete`, `levelProgress`                                                                                                                                                                |
| `operations.ts`              | `filterGalleryEntries`, `identifyOperationalNeeds`, `buildOperationsSummary`, `buildOperationalSnapshot` and their input/output types                                                             |
| `save.ts`                    | `SAVE_STORAGE_KEY`, `CURRENT_SAVE_VERSION`, `saveDataSchema`, `SaveData`, `createDefaultSave`, `loadSave`, `persistSave`, `clearSave` (+ spec 24 artist fields)                                   |
| `artistTraining.ts`          | Spec 24 — artist level/XP curve, mock completion scores                                                                                                                                           |
| `commissionChannel.ts`       | P27 — `commissionChannelForVenue`, `commissionBoardAvailable`, `CommissionChannel`                                                                                                                |
| `assignCommission.ts`        | Spec 24 — board offers, work timer, mock artist artwork URL                                                                                                                                       |
| `majorProjectProgress.ts`    | Spec 24 — beat timers, project completion helpers                                                                                                                                                 |
| `saveSlots.ts`               | `SLOTS_STORAGE_KEY`, `ACTIVE_SLOT_KEY`, `SLOT_IDS`, migration + slot CRUD (`listSaveSlots`, `activateSlot`, `newGameInSlot`, …)                                                                   |
| `idleIncome.ts`              | `MAX_IDLE_MS`, `BASE_AUTO_INVITE_DELAY_MS`, `computeIdleEarnings`                                                                                                                                 |
| `auction.ts`                 | `resolveAuction`, `AuctionResult`                                                                                                                                                                 |
| `paletteSeries.ts`           | `checkPaletteUsage`, `seriesCompletionBonus`, `SeriesCheckResult`                                                                                                                                 |
| `skills.ts`                  | `SKILL_IDS`, `skillProgress`, `previewSkillGains`, `applySkillGains`, `skillPayoutMultiplier`, skill types                                                                                        |
| `nextUnlock.ts`              | `buildProgressMeters`, `lockedReputationGates`, `NextUnlock`, `ProgressionSnapshot`                                                                                                               |
| `affordabilityBadges.ts`     | `computeAffordabilityBadges`, per-menu helpers — P17 menu notification dots                                                                                                                       |
| `submitChoice.ts`            | `SubmitChoice`, `artworkForSubmitChoice`, `blobToDataUrl` — P6 submit drawing vs AI before critique                                                                                               |
| `sketchBlank.ts`             | `isSketchBlank(data, threshold?)` — near-white / fully transparent pixel check for sketch bitmaps                                                                                                 |
| `mumCritiquePresentation.ts` | `isMumCommission`, `captureMumRealCritique`, `MUM_DISPLAY_SCORE`, `MUM_PAYOUT_CASH`, `MUM_REPUTATION_GAIN`, `mumSkillGains`, `pickMumPraiseLine`, `praiseSeedFromArtworkId`, `MumRealCritique`    |
| `brushStroke.ts`             | Spec 25 — `applyBrushStrokeStyle`, `effectiveBrushSize`, `stampCrayonGrain`, `stampCharcoalGrain`, `stampBrushGrain`, `stampInkBleed`, `grainSeed`, re-exports `getBrushProfile` / `BrushProfile` |

## Invariants

- Keyword scoring uses stemming plus a 4-character minimum substring rule so `gold` matches
  `golden` and `sword` matches `longsword`, without short tokens matching everything.
- Abstract briefs (`abstractness >= 1` with clusters) score via the best interpretation
  cluster; parroting vague request words yields accuracy 1; inventing a scene that hits
  no cluster yields accuracy 2. Vision engines ask `critiqueTargetsForBrief` keywords
  (empty → accuracy 1).
- Creativity ignores stopwords so filler like "please draw me" does not inflate scores.
- Payout weights accuracy 70% / creativity 30% for concrete briefs, and 50% / 50% when
  interpretation scoring applies. Always clamped to `[0, brief.budget]`; the floor of 1
  on both scores guarantees a non-zero payout on every commission. **Mum** bypasses
  `calculatePayout` — every Mum job pays exactly `MUM_PAYOUT_CASH` ($5) with max rep and
  skill gains via `mumSkillGains()` (playtest P23).
- Level 1 completion requires both `LEVEL_1.targetCommissions` and `LEVEL_1.targetCash`.
  Meeting both triggers a one-time career milestone overlay (not a level wipe).
  `careerMilestoneAcknowledged` on `SaveData` prevents re-showing after dismiss.
- `buildPrompt` appends the Spec 27 rank style suffix for the active medium plus the
  matching Round 7 studio-background clause (`skillLevel` default 1).
  `buildLevel1Prompt` is still the crayon rank-1 wrapper (style stays
  `LEVEL_1.promptModifiers`; the full string also includes the Novice white background).
  The result must never be shown to the player. Rank **names** are the HUD surface.
- Operational helpers read only shapes from `$lib/types/contracts.ts` and preserve
  newest-first gallery ordering.

## Persistence (`save.ts` / `saveSlots.ts`)

Banked meta-progression (`cash`, `reputation`, lifetime commissions, `galleryHistory`,
unlock fields for specs 13–16, and Spec 20 craft XP) lives in up to three named slots
under `adt.save.slots.v1`, with the active pointer in `adt.save.activeSlot`.
`loadSave` / `persistSave` always target the active slot. Legacy `adt.save.v1` migrates
into slot 0 on first boot. The in-flight commission does not persist. Load/persist never
throw — corrupt or unavailable storage falls back to `createDefaultSave`. Specs 13–16/20
extend `GameStore`'s `#persist()` rather than adding parallel writers.

## Medium skill (`mediumSkill.ts`)

Per-medium Novice→Master ranks (1–7) for the player and each hired artist. Level is derived
from XP (cap 7, 810 XP to Master). Unlocking a medium does not grant skill. Distinct from
Spec 20 craft skills (payout) and Spec 24 artist training XP (assignment speed). Artist
time ticks are floor-only — leftover ms are dropped so idle vs assigned rates cannot share
a remainder. Spec 28 calls `GameStore.grantPracticeDrawingMs`.

## Craft skills (`skills.ts`)

Prompting / Imagination / Hustle accumulate XP on `collectCash`. Levels are derived from
XP (cap 10). `skillPayoutMultiplier` soft-boosts non-auction payouts by up to +15%.
`nextUnlock.ts` derives HUD meters toward the next reputation/cash/commission gate.

## Idle income (`idleIncome.ts`)

Elapsed-time accrual clamped to `MAX_IDLE_MS` (8 hours). `computeIdleEarnings` is pure;
`GameStore.startIncomeTicker` does catch-up on mount plus a `setInterval` tick. A null
`lastIncomeTickAt` on load is initialised to `now()` so old saves never pass null into
the formula.

## Not done yet

- Level 2+ rules and additional prompt pipelines are deferred.
- Staff firing, salaries, and on-scene staff sprites are out of scope for spec 16.
