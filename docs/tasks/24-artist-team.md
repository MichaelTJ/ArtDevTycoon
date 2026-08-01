# Spec 24 — Artist team, training & major projects

**Status:** Design / catalog — **not ready to implement** until playtest bugs P1–P5 are
stabilised and this doc is promoted into implementable slices (24a…).
**Worktree (when ready):** `git worktree add -b agent/artist-team ../adt-wt-artist-team main`
**Depends on:** Specs **16** (staff shop / hire model), **21a–21b** (floor NPCs +
interact), **12–15** (save, mediums, venues, client tiers). Does **not** require AI
engine specs 05–11 for domain MVP (assignment can complete with mock/timer; generation
hooks optional later).

## Mission

Spec 16’s staff are **idle automations** (apprentice drip, marketing auto-invite,
curator rehang). Spec 24 is the active studio fantasy:

1. Build a **team of artists** (named individuals, not just role cards).
2. **Train** them (skills / specialisms improve over completed jobs).
3. **Hand off** individual commissions to a specific artist (player stays producer /
   art director).
4. Take on **major projects** — multi-piece arcs such as an animated series or a comic
   book — that need crew assignment and staged delivery.
5. Floor fantasy: a **receptionist** NPC you can talk to, who offers a menu of available
   commission choices (replacing or sitting beside pure “Invite Client” as the grown-up
   desk).

Comedy tone stays ADT: Mum still exists for kitchen tutorials; the receptionist is the
“real office” face once you leave the kitchen.

### Distinct from Spec 16

| Spec 16                                    | Spec 24                                                  |
| ------------------------------------------ | -------------------------------------------------------- |
| Hire role ids (`apprentice`, `curator`, …) | Hire/train **named artists** with per-person stats       |
| Passive `incomePerSecond` while away       | Assign a **specific brief** to a person; they work it    |
| Marketing auto-invites one client          | Receptionist presents **choices** of commissions         |
| No multi-episode / multi-page structure    | **Major projects** (series / comic) with chapters & crew |

Keep Spec 16 roles. Spec 24 adds a parallel `artists[]` roster (or evolves apprentice into
the first trainable artist — pick one in 24a; prefer parallel roster to avoid breaking
idle income).

---

## Playtest origins

| Note                                                            | Source                   |
| --------------------------------------------------------------- | ------------------------ |
| Interact with NPCs; receptionist offers commission choices      | Playtest P8 / P9         |
| Team of artists, train them, hand off commissions, big projects | User request → this spec |

---

## Catalog (MVP vs later)

### A. Front desk & NPC talk — slice **24a** (suggested first)

| ID  | Feature                | Player fantasy                                                                | Size | Priority |
| --- | ---------------------- | ----------------------------------------------------------------------------- | ---- | -------- |
| A1  | **NPC talk handlers**  | “Talk to …” opens a small dialogue / menu (not only a verb label)             | M    | MVP      |
| A2  | **Receptionist NPC**   | Distinct floor NPC (desk near door / lobby once venue ≥ garage or storefront) | M    | MVP      |
| A3  | **Commission board**   | Receptionist offers 2–4 brief choices; player picks one to accept             | M    | MVP      |
| A4  | Mum / staff small talk | Optional one-liners; no economy effect                                        | S    | Deferred |

### B. Artist roster & training — slice **24b**

| ID  | Feature             | Player fantasy                                                     | Size | Priority |
| --- | ------------------- | ------------------------------------------------------------------ | ---- | -------- |
| B1  | **Artist entities** | Name, portrait key, specialism tags, level / XP, wage              | M    | MVP      |
| B2  | **Hire / fire UI**  | Extend Staff office or new Team panel                              | M    | MVP      |
| B3  | **Training**        | Completing assigned jobs grants artist XP; unlock specialism tiers | M    | MVP      |
| B4  | **Floor desks**     | Hired artists occupy work spots (extends 21a staff presence)       | M    | After B1 |
| B5  | Training minigames  | Optional drills beyond job XP                                      | L    | Deferred |

### C. Commission hand-off — slice **24c**

| ID  | Feature                   | Player fantasy                                                           | Size | Priority |
| --- | ------------------------- | ------------------------------------------------------------------------ | ---- | -------- |
| C1  | **Assign brief → artist** | From active commission (or board), pick who paints it                    | M    | MVP      |
| C2  | **Work timer / queue**    | Artist occupies a slot until done; quality scales with training + medium | M    | MVP      |
| C3  | **Player vs artist**      | Player can still paint personally; artists are optional leverage         | S    | MVP      |
| C4  | Parallel jobs             | Multiple artists on different briefs at once (cap by desk count / venue) | M    | Later    |
| C5  | Artist prompt style       | Optional: artist applies a baked style bias to generation                | L    | Deferred |

### D. Major projects — slice **24d**

| ID  | Feature                     | Player fantasy                                                    | Size | Priority |
| --- | --------------------------- | ----------------------------------------------------------------- | ---- | -------- |
| D1  | **Project types**           | At least: `comic-book`, `animated-series` (data-driven)           | M    | MVP      |
| D2  | **Chapter / episode beats** | N deliverables under one project id; progress bar                 | M    | MVP      |
| D3  | **Crew assignment**         | Assign artists (and later roles) per beat or to the whole project | M    | MVP      |
| D4  | **Payout & reputation**     | Big cash + rep on project complete; mid checkpoints optional      | M    | MVP      |
| D5  | Continuity rules            | Shared palette / character sheet constraints across beats         | L    | Later    |
| D6  | Client pitch UI             | Bid for projects at receptionist / producer meeting               | M    | Later    |

---

## Proposed ownership (when implementing)

Exact paths locked in 24a+; this is the intended zone so agents do not collide with 16/21:

```
New (expected):
  src/lib/data/artists.ts (+ tests)
  src/lib/data/majorProjects.ts (+ tests)
  src/lib/game/artistTraining.ts (+ tests)
  src/lib/game/assignCommission.ts (+ tests)
  src/lib/game/majorProjectProgress.ts (+ tests)
  src/lib/components/ReceptionDesk.svelte (+ tests)
  src/lib/components/TeamRoster.svelte (+ tests)
  src/lib/components/AssignArtistModal.svelte (+ tests)
  src/lib/components/MajorProjectPanel.svelte (+ tests)

Edit (expected, additive):
  src/lib/game/save.ts                    ← artists[], activeAssignments, majorProjects
  src/lib/stores/gameState.svelte.ts      ← hire/train/assign/accept APIs
  src/lib/data/staffRoles.ts              ← optional: receptionist unlock / desk role
  src/lib/studio/scenes/StudioScene.ts    ← receptionist sprite + talk target
  src/lib/studio/bridge.ts                ← snapshot flags if needed
  src/lib/components/StaffOffice.svelte   ← or link out to TeamRoster
  src/routes/+page.svelte                 ← mount modals / wire talk events
```

**MUST NOT** (without a dedicated follow-up): replace Spec 16 idle income; delete Mum kitchen
loop; require cloud accounts (Spec 10).

---

## Receptionist (A2–A3) — player-facing sketch

1. Player walks to receptionist → prompt **Talk to Receptionist**.
2. Modal / Phaser→DOM bridge opens with 2–4 offers drawn from unlocked brief pools
   (respect reputation / venue / client tiers from 12–15).
3. Player picks one → becomes the active commission (same store path as today’s invite,
   or a new `acceptBrief(id)` that shares scoring).
4. Later (24c): from the same desk or Team panel, **Assign to…** an artist.

Kitchen / Mum path remains for early game; receptionist unlocks with garage (or first
staff hire) — **decide in 24a** and put the gate in a test table.

---

## Major project sketch (D1–D4)

```ts
// Illustrative — lock schemas in 24d
type MajorProjectKind = 'comic-book' | 'animated-series';

interface MajorProjectDef {
	id: string;
	kind: MajorProjectKind;
	title: string;
	beatCount: number; // e.g. 4 comic pages or 6 episodes
	basePayout: number;
	requiredReputation: number;
	preferredSpecialisms: string[]; // artist tags that speed / quality boost
}
```

Beats are individual art deliveries (player or assigned artist). Project completes when
all beats are collected; mid-fail rules TBD in 24d (fail one beat → repair cost vs cancel).

---

## Suggested slice order

```
24a  NPC talk + receptionist + commission board   ← playtest P8/P9
24b  Artist roster + training
24c  Assign commission → artist (+ work timer)
24d  Major projects (comic / series)
```

Do not start 24b until 24a’s talk/bridge pattern is stable. 24d needs 24b+24c.

---

## Definition of done (parent)

- [ ] Playtest P8/P9 accepted into 24a with ownership zone + tests.
- [ ] 24a–24d implementable specs written (or this file promoted with locked formulas).
- [ ] Distinct from Spec 16 documented in README.
- [ ] Save migration plan for `artists[]` / assignments / projects.
- [ ] No claim of “shipped” until MVP A1–A3 + B1–B3 + C1–C3 + D1–D4 land on tip.

---

## Open decisions (resolve before 24a coding)

1. Receptionist unlock: garage venue vs marketing-director hire vs always-on after kitchen?
2. Are Spec 16 role NPCs talkable, or only receptionist + Mum at first?
3. Artist vs apprentice: separate roster, or apprentice becomes artist #1?
4. Assigned work: simulated timer only in MVP, or must call generate/critique engines?
5. Major project beat count & payouts — tune after P4 economy rebalance.
