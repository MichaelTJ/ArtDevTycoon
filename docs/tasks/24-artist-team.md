# Spec 24 — Artist team, training & major projects

**Status:** **MVP shipped** on branch `agent/artist-team` (Wave K — 24a–24d MVP).
**Worktree:** `../adt-wt-artist-team`
**Depends on:** Specs **16** (idle staff), **21a–21b** (floor NPCs + interact), **12–15**
(progressions). Assignment uses **simulated timers** (no engine generate required in MVP).

## Mission

Spec 16’s staff are **idle automations**. Spec 24 is the active studio fantasy: named
**artists**, **training**, **commission hand-off**, **major projects**, and a
**receptionist** commission board once the venue is garage or better.

Keep Spec 16 roles. Spec 24 adds a parallel `hiredArtists[]` roster (does not replace
`hiredStaffIds` or idle income).

---

## Locked formulas (MVP)

| Item                | Literal / rule                                              | Tests                          |
| ------------------- | ----------------------------------------------------------- | ------------------------------ |
| Receptionist unlock | `unlockedVenueId !== 'fridge'` (garage+)                    | `artists.test.ts`              |
| Artist hire costs   | Jade $45/4 rep, Sam $60/6, Riley $75/8                      | `artists.test.ts`              |
| XP / level          | +25 XP per assignment/beat; level = `floor(xp/40)+1` cap 5  | `artistTraining.test.ts`       |
| Mock artist scores  | Level 1 → 6/6; level 5 → 10/10                              | `artistTraining.test.ts`       |
| Assignment timer    | `8000 × levelFactor × mediumFactor`; crayon L1 → **6800ms** | `assignCommission.test.ts`     |
| Comic project       | 4 beats, **$120**, 3 rep on complete                        | `majorProjects.test.ts`        |
| Series project      | 6 beats, **$180**, 5 rep on complete                        | `majorProjects.test.ts`        |
| Beat timer base     | **10000ms** × level × specialism match (0.85) × kind        | `majorProjectProgress.test.ts` |

Save fields (Zod v1 defaults): `hiredArtists[]`, `artistAssignment`, `majorProjectProgress`.

---

## Definition of done (parent)

- [x] A1–A3 NPC talk + receptionist + commission board (garage+)
- [x] B1–B3 Named artist roster, hire/fire UI, training XP
- [x] C1–C3 Assign brief → artist, work timer, player can still paint personally
- [x] D1–D4 Comic + animated-series projects with beats, crew, payout/rep
- [x] Spec 16 idle income unchanged
- [x] Mum kitchen loop preserved
- [x] Save migrate round-trips new fields
- [x] Unit + component tests for owned modules
- [x] P8/P9 playtest notes marked fixed

### Deferred (post-MVP)

- A4 Mum/staff small talk
- B4 Floor desks for hired artists
- B5 Training minigames
- C4 Parallel artist jobs
- C5 Artist prompt style bias
- D5 Continuity rules, D6 Client pitch UI

---

## Slices (reference)

| ID    | Feature            | MVP                                                 |
| ----- | ------------------ | --------------------------------------------------- |
| A1    | NPC talk handlers  | ✅ receptionist → `open-reception`                  |
| A2    | Receptionist NPC   | ✅ Phaser sprite at `clientWait` when garage+       |
| A3    | Commission board   | ✅ `ReceptionDesk` 2–4 offers via `pickBoardOffers` |
| B1–B3 | Roster / hire / XP | ✅ `TeamRoster`, `artistTraining.ts`                |
| C1–C3 | Assign + timer     | ✅ `AssignArtistModal`, mock completion → results   |
| D1–D4 | Major projects     | ✅ `MajorProjectPanel`, beat timers, collect payout |

---

## Public surface

- `$lib/data/artists` — catalog, `receptionistUnlocked`, `canHireArtist`
- `$lib/data/majorProjects` — defs, `canAcceptMajorProject`, rep rewards
- `$lib/game/artistTraining` — level/XP/scores
- `$lib/game/assignCommission` — timers, `pickBoardOffers`, mock artwork URL
- `$lib/game/majorProjectProgress` — beat progress helpers
- `GameStore` — `pickCommissionBoardOffers`, `acceptBoardBrief`, `hireArtist`, `fireArtist`,
  `assignBriefToArtist`, major-project APIs
- `StudioBridge` — `open-reception`, snapshot `receptionistVisible`
