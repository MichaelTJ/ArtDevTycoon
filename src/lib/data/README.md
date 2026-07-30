# Static game data (`src/lib/data`)

Curated content consumed by the domain layer and UI. No runtime I/O — just typed records
validated at module load.

## Public surface

| Module            | Exports                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `briefs.ts`       | `LEVEL_1_BRIEFS`, `pickBrief`                                                                    |
| `environments.ts` | `ENVIRONMENTS`, `getEnvironmentForLevel`                                                         |
| `mediumTiers.ts`  | `MEDIUM_TIERS`, `MediumTier`, `DEFAULT_MEDIUM_TIER_ID`, `getMediumTier`, `getNextMediumTier`, `canUnlockMediumTier` |

Import briefs directly from `$lib/data/briefs` or re-export through a future data barrel
if one is added.

## Invariants

- `LEVEL_1_BRIEFS` is validated once at import with `clientBriefSchema`; a typo fails
  fast rather than breaking a commission mid-run.
- Six briefs give enough variety for the five-commission Level 1 run without guaranteed
  repeats.
- `pickBrief` accepts an optional injected `random` for deterministic tests and replays;
  production callers omit it and receive `Math.random`.
- When every brief id is excluded, the pool resets to the full list so long runs never
  run out of clients.

## Medium tiers (`mediumTiers.ts`)

Ordered crayon → oil ladder. Each tier has a hidden `promptModifierSuffix` (never shown to
the player) and a `payoutMultiplier`. Unlock gates are cash + reputation; once unlocked,
switching is free. Spec 12 already persists `unlockedMediumTierIds` / `activeMediumTierId`.

## Not done yet

- Level 2+ brief pools, avatar assets beyond the six SVG placeholders, and any remote
  content loading are out of scope for spec 01.
- Only `home-kitchen` has a real scene component; levels 2–4 are config stubs until
  their gameplay ships.
- Gallery venues/layouts (spec 14) and client prestige tiers (spec 15) land next.
