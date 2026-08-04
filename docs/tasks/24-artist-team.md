# Spec 24 — Artist team, training & major projects

**Status:** **MVP shipped** (Wave K — 24a–24d). Playtest **P25** (Skip) shipped; **P27**
commission-channel retune (letterbox → computer → receptionist) landing / in flight.
**Worktree:** `../adt-wt-artist-team` (historical); P27 worktree `../adt-wt-pt4-commission-channels`
**Depends on:** Specs **16** (idle staff), **21a–21b** (floor NPCs + interact), **12–15**
(progressions). Assignment uses **simulated timers** (no engine generate required in MVP).

## Mission

Spec 16’s staff are **idle automations**. Spec 24 is the active studio fantasy: named
**artists**, **training**, **commission hand-off**, **major projects**, and a
**commission selection board** that escalates in fantasy by venue (P27):

| Venue           | Channel         | Fantasy                                      |
| --------------- | --------------- | -------------------------------------------- |
| `fridge`        | none            | Mum walk-ins / invite only                   |
| `garage`        | **letterbox**   | Job slips in the mail — no receptionist NPC  |
| `storefront`    | **computer**    | Jobs arrive in a computer inbox              |
| `gallery-hall+` | **receptionist**| Talkable receptionist NPC + desk board       |

Keep Spec 16 roles. Spec 24 adds a parallel `hiredArtists[]` roster (does not replace
`hiredStaffIds` or idle income).

---

## Locked formulas (MVP + playtest retunes)

| Item                  | Literal / rule                                                         | Tests                              |
| --------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| Board channel         | `commissionChannelForVenue(venue)` — see table above                   | `commissionChannel.test.ts`        |
| Receptionist NPC      | `receptionistUnlocked` = gallery-hall+ only (P27)                      | `artists.test.ts`                  |
| Board UI available    | channel ≠ `none` (garage letterbox / storefront computer / receptionist) | store + `ReceptionDesk` tests    |
| Skip commission (P25) | `declineClient()` in `briefing` **or** `generating`; UI label **Skip** | `gameState` / overlay / desk tests |
| Artist hire costs     | Jade $45/4 rep, Sam $60/6, Riley $75/8                                 | `artists.test.ts`                  |
| XP / level            | +25 XP per assignment/beat; level = `floor(xp/40)+1` cap 5             | `artistTraining.test.ts`           |
| Mock artist scores    | Level 1 → 6/6; level 5 → 10/10                                         | `artistTraining.test.ts`           |
| Assignment timer      | `8000 × levelFactor × mediumFactor`; crayon L1 → **6800ms**            | `assignCommission.test.ts`         |
| Comic project         | 4 beats, **$120**, 3 rep on complete                                   | `majorProjects.test.ts`            |
| Series project        | 6 beats, **$180**, 5 rep on complete                                   | `majorProjects.test.ts`            |
| Beat timer base       | **10000ms** × level × specialism match (0.85) × kind                   | `majorProjectProgress.test.ts`     |

Save fields (Zod v1 defaults): `hiredArtists[]`, `artistAssignment`, `majorProjectProgress`.

---

## Definition of done (parent)

- [x] A1–A3 NPC talk + commission board (MVP; garage+ board)
- [x] B1–B3 Named artist roster, hire/fire UI, training XP
- [x] C1–C3 Assign brief → artist, work timer, player can still paint personally
- [x] D1–D4 Comic + animated-series projects with beats, crew, payout/rep
- [x] Spec 16 idle income unchanged
- [x] Mum kitchen loop preserved
- [x] Save migrate round-trips new fields
- [x] Unit + component tests for owned modules
- [x] P8/P9 playtest notes marked fixed
- [x] P25 — **Skip** on briefing / generating / board footer
- [ ] P27 — letterbox / computer / receptionist by venue (no receptionist on garage)

### Deferred (post-MVP)

- A4 Mum/staff small talk
- B4 Floor desks for hired artists
- B5 Training minigames
- C4 Parallel artist jobs
- C5 Artist prompt style bias
- D5 Continuity rules, D6 Client pitch UI
- Distinct floor props for letterbox / computer (P27 may ship UI chrome first)

---

## Slices (reference)

| ID    | Feature            | MVP / retune                                                              |
| ----- | ------------------ | ------------------------------------------------------------------------- |
| A1    | NPC talk handlers  | ✅ `open-reception` opens board for any board channel                   |
| A2    | Receptionist NPC   | ✅ sprite only when channel = `receptionist` (P27; was garage+)           |
| A3    | Commission board   | ✅ `ReceptionDesk` + channel chrome (letterbox / computer / receptionist) |
| A3b   | Skip (P25)         | ✅ **Skip** clears briefing/generating → idle                             |
| B1–B3 | Roster / hire / XP | ✅ `TeamRoster`, `artistTraining.ts`                                      |
| C1–C3 | Assign + timer     | ✅ `AssignArtistModal`, mock completion → results                         |
| D1–D4 | Major projects     | ✅ `MajorProjectPanel`, beat timers, collect payout                       |

---

## Public surface

- `$lib/data/artists` — catalog, `receptionistUnlocked` (NPC gate), `canHireArtist`
- `$lib/game/commissionChannel` — `CommissionChannel`, `commissionChannelForVenue`,
  `commissionBoardAvailable` (P27)
- `$lib/data/majorProjects` — defs, `canAcceptMajorProject`, rep rewards
- `$lib/game/artistTraining` — level/XP/scores
- `$lib/game/assignCommission` — timers, `pickBoardOffers` (+ `reputation`), mock artwork URL
- `$lib/game/majorProjectProgress` — beat progress helpers
- `GameStore` — `pickCommissionBoardOffers`, `acceptBoardBrief`, `declineClient` / Skip,
  `hireArtist`, `fireArtist`, `assignBriefToArtist`, major-project APIs; channel-derived
  board availability
- `StudioBridge` — `open-reception`, snapshot `receptionistVisible` (NPC only)
- `ReceptionDesk` — `channel` / variant chrome + **Skip** footer
