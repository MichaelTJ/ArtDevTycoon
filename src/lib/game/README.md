# Domain rules (`src/lib/game`)

Pure game logic with no Svelte, DOM, fetch, or engine dependencies. Safe to import from
stores, engines, workers, and tests. Every function is deterministic and side-effect free
except where an injected `random` callback is passed through from callers.

## Public surface

Import from `$lib/game` via the barrel in `index.ts`.

| Module              | Exports                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `text.ts`           | `normalize`, `stem`, `STOPWORDS`                                                                                                      |
| `promptPipeline.ts` | `sanitizePlayerPrompt`, `buildLevel1Prompt`, `MAX_PROMPT_LENGTH`                                                                      |
| `scoring.ts`        | `scorePrompt`, `calculatePayout`, `toGalleryScore`, `reputationGain`, `ScoreBreakdown`                                                |
| `levelRules.ts`     | `isLevelComplete`, `levelProgress`                                                                                                    |
| `operations.ts`     | `filterGalleryEntries`, `identifyOperationalNeeds`, `buildOperationsSummary`, `buildOperationalSnapshot` and their input/output types |

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

## Not done yet

- Level 2+ rules, additional prompt pipelines, and reputation-gated client tiers are
  deferred. `reputationGain` accumulates for a future level but is unused in Level 1 UI.
