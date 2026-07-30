# Domain rules (`src/lib/game`)

Pure game logic with no Svelte, DOM, fetch, or engine dependencies. Safe to import from
stores, engines, workers, and tests. Every function is deterministic and side-effect free
except where an injected `random` callback is passed through from callers.

## Public surface

Import from `$lib/game` via the barrel in `index.ts`.

| Module              | Exports                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `text.ts`           | `normalize`, `stem`, `STOPWORDS`                                                                                                      |
| `promptPipeline.ts` | `sanitizePlayerPrompt`, `buildPrompt`, `buildLevel1Prompt`, `MAX_PROMPT_LENGTH`                                                       |
| `scoring.ts`        | `scorePrompt`, `calculatePayout`, `toGalleryScore`, `reputationGain`, `ScoreBreakdown`                                                |
| `levelRules.ts`     | `isLevelComplete`, `levelProgress`                                                                                                    |
| `operations.ts`     | `filterGalleryEntries`, `identifyOperationalNeeds`, `buildOperationsSummary`, `buildOperationalSnapshot` and their input/output types |
| `save.ts`           | `SAVE_STORAGE_KEY`, `CURRENT_SAVE_VERSION`, `saveDataSchema`, `SaveData`, `createDefaultSave`, `loadSave`, `persistSave`, `clearSave` |
| `idleIncome.ts`     | `MAX_IDLE_MS`, `BASE_AUTO_INVITE_DELAY_MS`, `computeIdleEarnings`                                                                     |
| `auction.ts`        | `resolveAuction`, `AuctionResult`                                                                                                     |
| `paletteSeries.ts`  | `checkPaletteUsage`, `seriesCompletionBonus`, `SeriesCheckResult`                                                                     |

## Invariants

- Keyword scoring uses stemming plus a 4-character minimum substring rule so `gold` matches
  `golden` and `sword` matches `longsword`, without short tokens matching everything.
- Creativity ignores stopwords so filler like "please draw me" does not inflate scores.
- Payout weights accuracy 70% / creativity 30% and is always clamped to `[0, brief.budget]`;
  the floor of 1 on both scores guarantees a non-zero payout on every commission.
- Level 1 completion requires both `LEVEL_1.targetCommissions` and `LEVEL_1.targetCash`.
- `buildLevel1Prompt` appends hidden modifiers from `LEVEL_1.promptModifiers`; the result
  must never be shown to the player.
- Operational helpers read only shapes from `$lib/types/contracts.ts` and preserve
  newest-first gallery ordering.

## Persistence (`save.ts`)

Banked meta-progression (`cash`, `reputation`, lifetime commissions, `galleryHistory`, and
unlock fields for specs 13–16) persists under `adt.save.v1`. The in-flight commission does
not. Load/persist never throw — corrupt or unavailable storage falls back to
`createDefaultSave`. Specs 13–16 extend `GameStore`'s `#persist()` rather than adding
parallel writers.

## Idle income (`idleIncome.ts`)

Elapsed-time accrual clamped to `MAX_IDLE_MS` (8 hours). `computeIdleEarnings` is pure;
`GameStore.startIncomeTicker` does catch-up on mount plus a `setInterval` tick. A null
`lastIncomeTickAt` on load is initialised to `now()` so old saves never pass null into
the formula.

## Not done yet

- Level 2+ rules and additional prompt pipelines are deferred.
- Staff firing, salaries, and on-scene staff sprites are out of scope for spec 16.
