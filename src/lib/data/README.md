# Static game data (`src/lib/data`)

Curated content consumed by the domain layer and UI. No runtime I/O — just typed records
validated at module load.

## Public surface

| Module                 | Exports                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kitchenBriefs.ts`     | `KITCHEN_BRIEFS`, `maxWalkInAbstractness`, `isBriefEligibleForProgress`                                                                                      |
| `briefs.ts`            | `LEVEL_1_BRIEFS` (re-export of kitchen), `KITCHEN_BRIEFS`, `pickBrief`, band helpers                                                                         |
| `environments.ts`      | `ENVIRONMENTS`, `getEnvironmentForLevel`                                                                                                                     |
| `mediumTiers.ts`       | `MEDIUM_TIERS`, `MediumTier`, `DEFAULT_MEDIUM_TIER_ID`, `getMediumTier`, `getNextMediumTier`, `canUnlockMediumTier`                                          |
| `galleryVenues.ts`     | `GALLERY_VENUES`, `GalleryVenue`, `DEFAULT_VENUE_ID`, `getVenue`, `canUnlockVenue`                                                                           |
| `galleryLayouts.ts`    | `GALLERY_LAYOUTS`, `GalleryLayout`, `DEFAULT_LAYOUT_ID`, `getLayout`, `canUnlockLayout`                                                                      |
| `galleryAtmosphere.ts` | `ATMOSPHERE_ITEMS`, `AtmosphereItem`, `getAtmosphereItem`, `totalAtmosphereBonus`                                                                            |
| `staffRoles.ts`        | `STAFF_ROLES`, `StaffRole`, `getStaffRole`, `canHireStaff`, `totalIncomePerSecond`                                                                           |
| `artists.ts`           | Spec 24 — `ARTIST_CATALOG`, `receptionistUnlocked`, `canHireArtist` (parallel to staff roles)                                                                |
| `majorProjects.ts`     | Spec 24 — comic/series defs, `canAcceptMajorProject`, payout/rep helpers                                                                                     |
| `clientTiers.ts`       | `CLIENT_TIER_INFO`, `ClientTierInfo`, `getClientTierInfo`, `unlockedClientTiers`                                                                             |
| `barks.ts`             | `BARK_POOL`, `BarkLine`, `BarkSpeakerId`, `linesForSpeaker`, `barkSpeakerLabel` (ambient comedy; no LLM)                                                     |
| `mumPraise.ts`         | `MUM_PRAISE_POOL`, `MumPraiseLine`, `pickMumPraise` — toddler praise for Mum results (playtest P7)                                                           |
| `stallMessages.ts`     | `STALL_COPY_BY_MEDIUM`, `getStallCopy`, `getStallStageLabel`, `stallMessagesForArtwork` — critiquing stall copy (P14)                                        |
| `brushProfiles.ts`     | `BrushProfile`, `getBrushProfile`, `MVP_BRUSH_MEDIUM_IDS`, `isMvpBrushMedium` — canvas stroke params per medium (Spec 25); ink uses `grainStyle: 'charcoal'` |

Import briefs directly from `$lib/data/briefs` or re-export through a future data barrel
if one is added.

## Invariants

- `KITCHEN_BRIEFS` / `LEVEL_1_BRIEFS` is validated once at import with `clientBriefSchema`;
  a typo fails fast rather than breaking a commission mid-run.
- Walk-in briefs escalate abstractness with `commissionsCompleted` **or** `reputation`
  (0 → concrete Mum asks; band 1 at rep ≥4 or ≥6 commissions; band 2 at rep ≥10 or
  ≥12 commissions). First invite at 0 commissions is forced to Mum band-0 openers
  `{c1,c2,c3,c7}` regardless of reputation.
- **Early economy (playtest P4/P23):** All Mum kitchen briefs use **$5 budget** (UI
  matches payout). Mum commissions always pay exactly **$5** via `MUM_PAYOUT_CASH`, not
  `calculatePayout × presentationMultiplier`. Pencil unlock is **$15** (~3 Mum jobs);
  garage wall is **$30**. Later walk-ins and prestige tiers keep higher budgets.
- Abstract kitchen briefs carry `interpretationClusters`; prestige pools omit them and
  keep legacy keyword scoring.
- `pickBrief` accepts optional `commissionsCompleted`, `reputation`, and injected
  `random` for deterministic tests and replays; production callers omit `random` and
  receive `Math.random`. `GameStore.inviteClient` passes both progress counters.
- When every brief id is excluded, the pool resets to the full list so long runs never
  run out of clients.

## Medium tiers (`mediumTiers.ts`)

Ordered crayon → oil ladder. Each tier has a hidden `promptModifierSuffix` (never shown to
the player) and a `payoutMultiplier`. Unlock gates are cash + reputation; once unlocked,
switching is free. Spec 12 already persists `unlockedMediumTierIds` / `activeMediumTierId`.

## Staff roles (`staffRoles.ts`)

Independent, stackable hires (Apprentice, Print Shop, Marketing Director, Curator). Some
roles contribute `incomePerSecond` for idle accrual; Marketing Director speeds auto-invite;
Curator reorders gallery display by score and picks the best owned layout multiplier
without mutating the player's `activeLayoutId`. Persisted as `hiredStaffIds`.

## Ambient barks (`barks.ts`)

Static one-line comedy pools for Mum and floor staff (spec 21e). Presentation-only —
never touch cash, briefs, or unlocks. Soft cap 42 characters; `print-shop` is not a
speaker. Optional `cueId` strings are reserved for later audio consumers; this module
does not play sound. Phaser picks lines via `$lib/studio/barkPicker`.

## Not done yet

- Level 2+ brief pools, avatar assets beyond the six SVG placeholders, and any remote
  content loading are out of scope for spec 01.
- Only `home-kitchen` has a real scene component; levels 2–4 are config stubs until
  their gameplay ships.
- Firing staff, recurring salaries, and scene sprites for hired roles are deferred.
