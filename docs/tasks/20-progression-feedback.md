# Spec 20 — Progression feedback (bars, skills, work gains)

**Worktree:** work in the main tree after Spec 19 is merged (or
`git worktree add -b agent/progression-feedback ../adt-wt-progression-feedback main`
if another agent is hot on overlapping UI). Prefer main when Spec 19 has landed and no
concurrent agent owns `GameMenuBar` / `HudBar` / `gameState` / `save.ts`.
**Depends on:** Specs 12–16 (economy + shops) and Spec 17 (studio HUD shell). Does **not**
depend on 05–11. Spec 18/19 improve brief copy and floors; this spec is orthogonal but
**MUST wait until Spec 19 has committed** so `+page` / `StudioHudOverlay` / menu wiring
are stable.

## Mission

The tycoon loop already tracks cash, reputation, commissions, mediums, venues, client
tiers, and staff — but the player mostly sees a cash number and a commission
`<progress>`. Reputation silently gates every shop. Completing a commission feels like
"collect dollars", not "I got better".

This spec makes progression **readable and satisfying**:

1. **Surface the meters that already matter** — cash (level goal), reputation (next
   unlock), commissions (level goal) — as clear progress bars in the Svelte menu strip.
2. **Add craft skills** that grow when you work — Prompting, Imagination, Hustle —
   persisted like other meta-progress, shown as levelled bars.
3. **Feed the bars during a commission** — results preview pending XP / reputation /
   cash; Collect Cash applies them with animated fills (respect
   `prefers-reduced-motion`).

Presentation + light skill XP math only. Do **not** redesign shop unlock tables, brief
pools, engines, or Phaser rooms.

---

## Ownership zone

```
New:
  src/lib/game/skills.ts
  src/lib/game/skills.test.ts
  src/lib/game/nextUnlock.ts
  src/lib/game/nextUnlock.test.ts
  src/lib/components/ProgressMeter.svelte
  src/lib/components/ProgressMeter.svelte.test.ts
  src/lib/components/ProgressPanel.svelte
  src/lib/components/ProgressPanel.svelte.test.ts
  src/lib/components/WorkGainToast.svelte
  src/lib/components/WorkGainToast.svelte.test.ts
  docs/tasks/20-progression-feedback.md   ← this file (DoD ticks only after impl)

Edit:
  src/lib/game/save.ts                    ← skillXp fields + defaults
  src/lib/game/save.test.ts
  src/lib/game/index.ts                   ← re-export skills + nextUnlock public API
  src/lib/game/README.md
  src/lib/stores/gameState.svelte.ts      ← hydrate/apply skill XP; #persist; preview
  src/lib/stores/gameState.svelte.test.ts
  src/lib/components/HudBar.svelte
  src/lib/components/HudBar.svelte.test.ts
  src/lib/components/GameMenuBar.svelte
  src/lib/components/GameMenuBar.svelte.test.ts
  src/lib/components/ResultsPanel.svelte
  src/lib/components/ResultsPanel.svelte.test.ts
  src/lib/components/StudioHudOverlay.svelte        ← mount WorkGainToast / pass gains
  src/lib/components/StudioHudOverlay.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  src/routes/+page.svelte                 ← wire ProgressPanel props if needed (minimal)
  docs/tasks/README.md                    ← Wave F row
  docs/architecture.md                    ← short § on skill XP + HUD meters
  docs/agent-log.md                       ← handoff
```

**MUST NOT** edit: `package.json`, lockfiles, `src/lib/types/contracts.ts`,
`src/lib/studio/**` (Phaser), engine files, shop unlock data tables
(`mediumTiers.ts`, `galleryVenues.ts`, `clientTiers.ts`, `staffRoles.ts`), or Spec 19
room builders.

---

## 1. Craft skills — pure domain (`skills.ts`)

Three skills. String ids so save blobs stay forward-compatible:

| Id            | Label       | What it rewards                                   |
| ------------- | ----------- | ------------------------------------------------- |
| `prompting`   | Prompting   | How well the work hit the brief (`accuracyScore`) |
| `imagination` | Imagination | Descriptive inventiveness (`creativityScore`)     |
| `hustle`      | Hustle      | Turning quality into cash (`finalPayout`)         |

```ts
export const SKILL_IDS = ['prompting', 'imagination', 'hustle'] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export interface SkillDef {
	id: SkillId;
	label: string;
	/** One short line for ProgressPanel. */
	tagline: string;
}

export const SKILL_DEFS: readonly SkillDef[] = [
	{ id: 'prompting', label: 'Prompting', tagline: 'Hitting the brief.' },
	{ id: 'imagination', label: 'Imagination', tagline: 'Inventing the scene.' },
	{ id: 'hustle', label: 'Hustle', tagline: 'Getting paid for it.' }
];

/** Lifetime XP per skill. Level is derived; never store level separately. */
export type SkillXpMap = Record<SkillId, number>;

export function createEmptySkillXp(): SkillXpMap {
	return { prompting: 0, imagination: 0, hustle: 0 };
}

/**
 * XP required to advance from `level` → `level + 1`.
 * Level is 1-based. Level 1→2 costs 15, then +10 per step (25, 35, …).
 * Cap display level at 10 (further XP still accumulates but bar stays full).
 */
export const SKILL_LEVEL_CAP = 10;

export function xpToNextLevel(level: number): number {
	if (level < 1) return 15;
	if (level >= SKILL_LEVEL_CAP) return 0;
	return 15 + (level - 1) * 10;
}

/** Total XP needed to *reach* `level` from zero (level 1 = 0). */
export function xpThresholdForLevel(level: number): number {
	let total = 0;
	for (let L = 1; L < level; L++) total += xpToNextLevel(L);
	return total;
}

export interface SkillProgress {
	id: SkillId;
	label: string;
	xp: number;
	level: number;
	/** XP into the current level. */
	xpIntoLevel: number;
	/** XP needed for next level; 0 when capped. */
	xpForNext: number;
	/** 0–1 fill for the current level segment. 1 when capped. */
	fill: number;
}

export function skillProgress(id: SkillId, xp: number): SkillProgress;

/**
 * Pending gains from a finished critique (before Collect Cash).
 * Exact formulas (literal — tests pin these):
 *   prompting   += accuracyScore          // 1..10
 *   imagination += creativityScore        // 1..10
 *   hustle      += clamp(round(finalPayout / 25), 1, 20)
 */
export interface SkillGainPreview {
	prompting: number;
	imagination: number;
	hustle: number;
}

export function previewSkillGains(input: {
	accuracyScore: number;
	creativityScore: number;
	finalPayout: number;
}): SkillGainPreview;

export function applySkillGains(current: SkillXpMap, gains: SkillGainPreview): SkillXpMap;

/**
 * Soft payout bonus from craft levels. Level 1 in all three = 1.0.
 * Each level above 1 across all skills adds +0.01, capped at +0.15.
 *   bonus = min(0.15, max(0, (sum(levels) - 3) * 0.01))
 *   multiplier = 1 + bonus
 */
export function skillPayoutMultiplier(skills: SkillXpMap): number;
```

**Tests (`skills.test.ts`) — literal:**

| Call / scenario                                                                 | Expected                                      |
| ------------------------------------------------------------------------------- | --------------------------------------------- |
| `skillProgress('prompting', 0).level`                                           | `1`                                           |
| `skillProgress('prompting', 0).xpForNext`                                       | `15`                                          |
| `skillProgress('prompting', 14).fill`                                           | `14/15`                                       |
| `skillProgress('prompting', 15).level`                                          | `2`                                           |
| `skillProgress('prompting', xpThresholdForLevel(10)).level`                     | `10`                                          |
| `skillProgress('prompting', xpThresholdForLevel(10)).fill`                      | `1`                                           |
| `previewSkillGains({ accuracyScore: 8, creativityScore: 6, finalPayout: 100 })` | `{ prompting: 8, imagination: 6, hustle: 4 }` |
| `previewSkillGains({ … finalPayout: 10 })`.hustle                               | `1` (floor)                                   |
| `previewSkillGains({ … finalPayout: 900 })`.hustle                              | `20` (cap)                                    |
| `skillPayoutMultiplier(createEmptySkillXp())`                                   | `1`                                           |
| All skills at level 4 XP thresholds → multiplier                                | `1.09` (`(12-3)*0.01`)                        |

---

## 2. Next-unlock meters — pure domain (`nextUnlock.ts`)

Players need to see **why** reputation and cash matter. Derive the nearest unpaid gate
from existing data tables (import `MEDIUM_TIERS`, `GALLERY_VENUES`, `CLIENT_TIER_INFO`,
`STAFF_ROLES` as read-only).

```ts
export type UnlockTrack = 'reputation' | 'cash' | 'commissions';

export interface NextUnlock {
	track: UnlockTrack;
	/** e.g. "Garage Wall", "Corporate Buyer", "Level cash goal" */
	label: string;
	/** Current resource amount. */
	current: number;
	/** Threshold to clear this gate. */
	target: number;
	/** 0–1, clamped. */
	fill: number;
	/** Short hint: "4 more reputation" / "$120 more" / "2 more commissions". */
	remainingLabel: string;
}

export interface ProgressionSnapshot {
	cash: number;
	reputation: number;
	commissionsCompleted: number;
	targetCash: number;
	targetCommissions: number;
	unlockedVenueId: string;
	unlockedMediumTierIds: readonly string[];
	hiredStaffIds: readonly string[];
}

/**
 * Returns up to three meters for the HUD / ProgressPanel:
 * 1. Commissions → level target (always)
 * 2. Cash → level targetCash (always)
 * 3. Reputation → nearest locked gate among:
 *      - next venue by order after unlockedVenueId
 *      - next medium tier not in unlockedMediumTierIds
 *      - next client tier by requiredReputation
 *      - next unhired staff role by requiredReputation
 *    Pick the gate with the **lowest requiredReputation that is still > current**.
 *    If none remain, label "Max prestige" with current/current fill 1.
 */
export function buildProgressMeters(state: ProgressionSnapshot): {
	commissions: NextUnlock;
	cash: NextUnlock;
	reputation: NextUnlock;
};
```

**Tests — literal:**

| State (abbrev)                       | `reputation.label` contains | `reputation.target`                                                                               |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------- |
| rep 0, fridge, crayon only           | Garage (or Pencil)          | `3` or `4` — pick the **minimum** of locked gates' `requiredReputation` (Pencil=3 beats Garage=4) |
| rep 3, crayon+pencil, fridge         | Garage                      | `4`                                                                                               |
| rep 50, all venues/media/tiers/staff | Max prestige                | `50` (current)                                                                                    |

Cash / commissions meters always use `targetCash` / `targetCommissions` from Level 1
config (passed in via snapshot — do not hardcode 500/5 inside `nextUnlock.ts`).

---

## 3. Persist skill XP (`save.ts`)

Additive fields with Zod defaults (do **not** bump `CURRENT_SAVE_VERSION`):

```ts
/** Spec 20. Lifetime craft XP. Missing keys default to 0 via createEmptySkillXp merge. */
skillXpPrompting: z.number().int().min(0).default(0),
skillXpImagination: z.number().int().min(0).default(0),
skillXpHustle: z.number().int().min(0).default(0),
```

`createDefaultSave` may omit them (defaults apply). `GameStore.#persist` writes all three.
Old saves without the fields load as 0 XP.

Add a round-trip test: persist with `skillXpPrompting: 15` → load → `15`.

---

## 4. `GameStore` wiring

1. Add `skillXp: SkillXpMap` hydrated from save (`skillXpPrompting` etc.).
2. Add `$derived` / getters:
   - `skillProgressList: SkillProgress[]` for all `SKILL_IDS`
   - `progressMeters` via `buildProgressMeters({...})`
   - `pendingSkillGains: SkillGainPreview | null` — set when entering `results` with a
     critique; cleared on `collectCash` / `reset` / failed abort
3. In the payout path (where `calculatePayout` / auction resolution already runs),
   multiply by `skillPayoutMultiplier(this.skillXp)` **in addition to** the existing
   presentation multiplier:

   ```ts
   const multiplier = this.presentationMultiplier() * skillPayoutMultiplier(this.skillXp);
   ```

   Keep the change in the same place medium/layout already compose — do not fork a second
   payout path. Auction `winningBid` is **not** multiplied (auctions stay bid-driven);
   skill XP from auction still uses `finalPayout` / winning bid as `finalPayout` for
   `previewSkillGains`.

4. `collectCash()` after banking cash/reputation:
   - `this.skillXp = applySkillGains(this.skillXp, previewSkillGains(...))`
   - clear `pendingSkillGains`
   - `#persist()` (already called — include new fields)
5. Expose `lastCollectedGains: { skills: SkillGainPreview; reputation: number; cash: number } | null`
   for one UI pulse after collect (set in `collectCash`, clear after ~1.6s via injected
   `now`/timeout **or** let the UI clear it with a callback `game.clearLastCollectedGains()`
   — prefer the explicit callback so tests stay sync).

**Tests:**

- Hydrate save with `skillXpPrompting: 15` → `skillProgressList` prompting level `2`.
- After mock commission with accuracy 8 / creativity 6 / payout 100, `collectCash`
  increases prompting by 8, imagination by 6, hustle by 4.
- `pendingSkillGains` non-null in `results`, null after collect.
- Payout with empty skills equals pre-spec math; with higher skill levels, payout is
  larger by the documented multiplier (use fixed mock scores).

---

## 5. Shared `ProgressMeter.svelte`

Accessible meter used everywhere (HUD, Progress panel, results gains).

```svelte
<!-- Props -->
label: string; value: number; <!-- current -->
max: number; <!-- target; if 0 treat as full -->
hint?: string; <!-- e.g. "4 more reputation" or "Lv 2 · 3/15 XP" -->
delta?: number; <!-- pending/recent gain; show +N when > 0 -->
emphasize?: boolean; <!-- true while results pending or post-collect pulse -->
variant?: 'default' | 'compact';
```

Implementation rules:

- Use a real `<progress>` (or `role="progressbar"` with `aria-valuenow/min/max`) — not a
  clickable div.
- Visible label text must include the resource name (accessible name).
- When `delta > 0`, render a `+{delta}` suffix with `aria-live="polite"`.
- Tween the displayed value with `Tween` + `prefersReducedMotion` (same pattern as
  `HudBar` cash) when `value` changes.
- Compact variant: single row, smaller bar (`h-2`); default: `h-3` + hint under label.

**Component tests:** mount with value/max/label; assert label text and progress value;
mount with `delta={3}` and assert `+3` is exposed to the accessibility tree.

---

## 6. Menu strip — `HudBar` + `GameMenuBar`

### 6.1 `HudBar`

Extend props (keep backward-compatible defaults where tests need them):

```ts
reputation: number;
reputationMeter: NextUnlock;   // from buildProgressMeters(...).reputation
// existing cash / commissions props remain
skillSummaries?: { id: string; label: string; level: number; fill: number; delta?: number }[];
```

**Compact (menu) layout — one composition row + meters block:**

1. Level name + tweened cash (unchanged).
2. Three compact `ProgressMeter`s: Commissions, Cash-to-goal, Reputation-to-next-unlock.
3. Optional row of three mini skill meters (Prompting / Imagination / Hustle) showing
   `Lv {n}` + fill. Hide skill row only if `skillSummaries` omitted; GameMenuBar **MUST**
   pass them.

**Default variant** (non-compact, if still used): same meters, slightly taller.

Update `HudBar.svelte.test.ts` for the new props and asserted labels
(`Reputation`, skill labels).

### 6.2 `GameMenuBar`

- Pass `reputation` + meters + skill summaries into `HudBar`.
- Add button **"Progress"** that opens `ProgressPanel`.
- Wire `ProgressPanel` with full skill list + all three unlock meters + current cash /
  reputation numbers.

### 6.3 `ProgressPanel.svelte`

Modal (same dialog pattern as `ToolkitShop` / `StaffOffice`):

- Title: `Progress`
- Section **Career:** commission + cash level-goal meters
- Section **Standing:** reputation meter + plain number `Reputation: {n}`
- Section **Craft skills:** one `ProgressMeter` per skill with
  `hint="Lv {level} · {xpIntoLevel}/{xpForNext} XP"` (or `Max level` when capped)
- Close button; focus management like other shops

---

## 7. Work feedback — improve bars while working

### 7.1 Results (`ResultsPanel`)

New optional props:

```ts
pendingSkillGains?: SkillGainPreview | null;
pendingReputation?: number; // reputationGain(...)
```

When present, below the payout line render three compact meters (or a
`WorkGainToast` inline) showing `+prompting` / `+imagination` / `+hustle` and
`+{pendingReputation} reputation`. Copy must stay honest: these apply on Collect.

### 7.2 `WorkGainToast.svelte`

Small presentational strip:

```ts
gains: SkillGainPreview;
reputation: number;
cash: number;
mode: 'pending' | 'collected';
```

- `pending`: "On collect: +$X · +R rep · +P/+I/+H XP"
- `collected`: "Banked: …" then auto-dismiss via parent clearing props

Mount in `StudioHudOverlay` (and non-studio results path if `ResultsPanel` is used
standalone on `+page` — prefer passing through `ResultsPanel` so both shells get it).

### 7.3 During `generating` / `critiquing`

In `StudioHudOverlay` (or `GameMenuBar` if overlay is hidden): set
`emphasize={true}` on the three skill meters in the menu strip while
`phase === 'generating' || phase === 'critiquing'`. Do **not** invent fake XP numbers
before scores exist — only pulse/emphasize that craft meters are "in play".

When phase becomes `results`, switch to real `delta` from `pendingSkillGains`.

### 7.4 After Collect

`+page` / overlay calls collect → store sets `lastCollectedGains` → meters receive
`delta` for ~one tween cycle → UI calls `clearLastCollectedGains()`.

---

## 8. Architecture blurb

Add a short paragraph after the Spec 12 persistence note (or under a new
"Progression feedback" sub-bullet):

> Spec 20 surfaces cash / reputation / commission goals as HUD progress meters and adds
> three persisted craft skills (Prompting, Imagination, Hustle) that gain XP when a
> commission is collected. Skill levels grant a small payout multiplier
> (`skillPayoutMultiplier`, capped +15%). Pending gains preview on the results panel so
> collecting cash feels like banking progress, not only dollars.

---

## 9. Definition of done

- [x] `skills.ts` / `nextUnlock.ts` unit tests green with literal expectations above.
- [x] Save round-trips the three `skillXp*` fields; old saves default to 0.
- [x] `GameStore` applies XP on `collectCash`, exposes pending + last-collected gains,
      and folds `skillPayoutMultiplier` into non-auction payouts.
- [x] `HudBar` (compact) shows commission, cash-goal, reputation, and three skill meters.
- [x] `ProgressPanel` opens from GameMenuBar and lists all meters with levels/hints.
- [x] `ResultsPanel` / `WorkGainToast` show pending XP + reputation before collect.
- [x] Skill meters emphasize while generating/critiquing; show deltas on results/collect.
- [x] All new/edited components have `.svelte.test.ts` coverage.
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for owned files.
- [x] `docs/architecture.md` blurb + `docs/agent-log.md` handoff + tasks README Wave F.

## 10. Explicitly out of scope

- Redesigning venue / medium / staff unlock costs or reputation thresholds.
- Phaser desk XP bars (Svelte menus only; desk `workBarProgress` stays generation-only).
- New npm dependencies.
- Cloud sync / multiple save slots.
- Skill trees, perks menus, or respec — XP + levels + soft payout bonus only.
- Changing abstract-brief scoring (Spec 18) or office layouts (Spec 19).

---

## 11. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/20-progression-feedback.md`.
>
> Read these four files completely before writing any code:
>
> 1. `best-practices.md` — the binding rules for this repo
> 2. `docs/architecture.md` — how the system fits together
> 3. `src/lib/types/contracts.ts` — frozen types (do not edit)
> 4. `docs/tasks/20-progression-feedback.md` — your spec
>
> Also read `docs/agent-log.md` (latest handoffs) and `src/lib/components/README.md`.
>
> The spec lists exactly which files to create and which paths you own. Do not create
> or modify any file outside your ownership zone. Do not edit `package.json`,
> `vite.config.ts`, `tsconfig.json`, or `src/lib/types/**`. Do not run `npm install`.
> Do not run any state-changing git command — no commit, add, checkout, merge, or push.
>
> Wait until Spec 19 is present on the branch you are implementing against (agent-log
> handoff for Spec 19, or `src/lib/studio/npcWander.ts` / `venueRooms.ts` exist). If they
> are missing, stop and report — do not invent Spec 19 files.
>
> Implement every file in the spec, including its tests. Then run all three of these
> and fix anything they report in your own files:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Finally, update component/game READMEs as needed and append your handoff entry to
> `docs/agent-log.md` using the template in `best-practices.md` §6.3.
