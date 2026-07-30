# Spec 16 — Studio Automation & Staffing

**Worktree:** `git worktree add -b agent/studio-automation ../adt-wt-studio-automation main`
**Depends on:** Specs 12, 13, 14, 15 all merged. This is deliberately the last progression
spec — it automates and cross-references every system the other four built (medium tiers,
gallery capacity/layout, client tiers) and needs all of them to already exist.

## Mission

Every other progression spec still requires the player to sit at the desk and click
through each commission by hand. This spec adds the tycoon-game payoff: hire staff and buy
automation so the studio keeps making money **while the player is away**, and so the
gallery curates and clients arrive faster without a click.

Four roles, one shared shape (`StaffRole`), one shop UI:

| Role                   | Effect                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Apprentice         | Passive cash income while hired (an off-screen "common tier" painter)                                                                             |
| Sell Prints Online     | Passive cash income, no hiring flavour — a pure automation purchase                                                                               |
| The Marketing Director | Clients now walk in on their own after a short delay, instead of requiring a manual "Invite Client" click                                         |
| The Curator            | The gallery display (spec 14) auto-picks its highest-scoring pieces and its best owned layout, instead of most-recent/whatever's currently active |

Passive income accrues in **real elapsed time**, including while the tab is closed —
loading the game after being away shows an "Idle Earnings" summary, the standard idle-game
pattern, using the `lastIncomeTickAt` field spec 12 already reserved for this.

## Ownership zone

```
New:
  src/lib/data/staffRoles.ts
  src/lib/data/staffRoles.test.ts
  src/lib/game/idleIncome.ts
  src/lib/game/idleIncome.test.ts
  src/lib/components/StaffOffice.svelte
  src/lib/components/StaffOffice.svelte.test.ts
  src/lib/components/IdleEarningsModal.svelte
  src/lib/components/IdleEarningsModal.svelte.test.ts

Edit (small, targeted):
  src/lib/game/save.ts                         ← additive field, see §4
  src/lib/game/save.test.ts
  src/lib/stores/gameState.svelte.ts
  src/lib/stores/gameState.svelte.test.ts
  src/lib/components/FridgeGallery.svelte       ← consumes curator-aware ordering, no new props
  src/lib/components/GameMenuBar.svelte
  src/lib/components/GameMenuBar.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  src/routes/+page.svelte                       ← mount IdleEarningsModal on load, see §6
  docs/tasks/README.md
```

Do not edit `src/lib/types/contracts.ts`.

---

## 1. `src/lib/data/staffRoles.ts`

```ts
export interface StaffRole {
	id: string;
	name: string;
	tagline: string;
	hireCost: number;
	requiredReputation: number;
	/** Cash earned per real-world second while hired. 0 for roles with no direct income. */
	incomePerSecond: number;
	/**
	 * Divides the delay before a new client auto-arrives while idle (see §5). 1 = no
	 * effect. Only one role in the current roster sets this above 1.
	 */
	autoInviteSpeedMultiplier: number;
	/** If true, the gallery display auto-curates for score instead of recency/activeLayout. */
	autoCurates: boolean;
	icon: string;
}

export const STAFF_ROLES: readonly StaffRole[] = [
	{
		id: 'apprentice',
		name: 'The Apprentice',
		tagline: 'Grinds out common-tier commissions in the back room, unattended.',
		hireCost: 800,
		requiredReputation: 8,
		incomePerSecond: 0.05, // $3/min, $180/hr of idle real time
		autoInviteSpeedMultiplier: 1,
		autoCurates: false,
		icon: '🧑\u200d🎨'
	},
	{
		id: 'print-shop',
		name: 'Sell Prints Online',
		tagline: 'Your back catalogue, printed and shipped automatically.',
		hireCost: 1500,
		requiredReputation: 5,
		incomePerSecond: 0.12,
		autoInviteSpeedMultiplier: 1,
		autoCurates: false,
		icon: '📦'
	},
	{
		id: 'marketing-director',
		name: 'The Marketing Director',
		tagline: 'Foot traffic finds you now. Clients stop waiting to be invited.',
		hireCost: 2200,
		requiredReputation: 14,
		incomePerSecond: 0,
		autoInviteSpeedMultiplier: 3, // 6s base delay becomes 2s
		autoCurates: false,
		icon: '📣'
	},
	{
		id: 'curator',
		name: 'The Curator',
		tagline: 'Rehangs the whole room overnight for the best possible impression.',
		hireCost: 3000,
		requiredReputation: 18,
		incomePerSecond: 0,
		autoInviteSpeedMultiplier: 1,
		autoCurates: true,
		icon: '🗂️'
	}
] as const;

export function getStaffRole(id: string): StaffRole | undefined {
	return STAFF_ROLES.find((r) => r.id === id);
}

export function canHireStaff(
	role: StaffRole,
	state: { cash: number; reputation: number }
): boolean {
	return state.cash >= role.hireCost && state.reputation >= role.requiredReputation;
}

/** Sum of `incomePerSecond` across every hired role id. Unknown ids contribute 0. */
export function totalIncomePerSecond(hiredIds: readonly string[]): number {
	return hiredIds.reduce((sum, id) => sum + (getStaffRole(id)?.incomePerSecond ?? 0), 0);
}
```

All four roles are independent and stackable (hiring one never precludes another) —
unlike medium tiers or gallery venues, there is no "better role replaces worse role"
relationship here.

**Tests:** 4 roles with distinct ids; `totalIncomePerSecond([])` is `0`;
`totalIncomePerSecond(['apprentice', 'print-shop'])` is `0.17`;
`totalIncomePerSecond(['apprentice', 'nonexistent'])` is `0.05` (unknown id ignored, no
throw); `canHireStaff` boundary cases mirroring spec 13 §1.

---

## 2. `src/lib/game/idleIncome.ts` — offline-safe accrual

```ts
/** Cap how much offline time counts, so leaving a tab open for a week isn't a windfall. */
export const MAX_IDLE_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Cash earned between `lastTickAt` and `now` at `incomePerSecond`. Clamps elapsed time to
 * `MAX_IDLE_MS` and to a minimum of 0 (a clock that appears to run backwards, e.g. a
 * corrected system clock, earns nothing rather than a negative number).
 */
export function computeIdleEarnings(
	lastTickAt: number,
	now: number,
	incomePerSecond: number
): { earned: number; elapsedMs: number } {
	const rawElapsed = now - lastTickAt;
	const elapsedMs = Math.min(Math.max(rawElapsed, 0), MAX_IDLE_MS);
	const earned = Math.floor((elapsedMs / 1000) * incomePerSecond);
	return { earned, elapsedMs };
}
```

**Worked examples (`idleIncome.test.ts`):**

| lastTickAt | now                         | incomePerSecond | elapsedMs                  | earned                     |
| ---------- | --------------------------- | --------------- | -------------------------- | -------------------------- |
| 0          | 60_000                      | 0.05            | 60_000                     | floor(60 × 0.05) = 3       |
| 0          | 3_600_000                   | 0.17            | 3_600_000                  | floor(3600 × 0.17) = 612   |
| 0          | 100 × 3_600_000             | 0.17            | `MAX_IDLE_MS` (28_800_000) | floor(28800 × 0.17) = 4896 |
| 5000       | 1000 (clock went backwards) | 0.05            | 0                          | 0                          |
| 0          | 0                           | 0.05            | 0                          | 0                          |

---

## 3. Auto-invite while idle

No cooldown exists today — `inviteClient()` fires the instant the player clicks. This spec
adds a **base delay that only matters once the Marketing Director is hired**; without that
role, behaviour is unchanged (manual click, no auto-anything).

```ts
export const BASE_AUTO_INVITE_DELAY_MS = 6000;
```

While `phase === 'idle'` and at least one hired role has `autoInviteSpeedMultiplier > 1`,
`GameStore` schedules a `setTimeout` for
`BASE_AUTO_INVITE_DELAY_MS / bestAutoInviteSpeedMultiplier` (take the max multiplier across
hired roles, not the sum — hiring two marketing-flavoured roles later should not be
required to feel a diminishing-returns stack) that calls `inviteClient()` if still idle
when it fires. Clear the timeout on any phase change away from `idle` and on unmount.

---

## 4. `save.ts` — one additive field

`lastIncomeTickAt` already exists in `saveDataSchema` (spec 12), defaulted to `null`. Add
one more field, additive and defaulted so old saves keep parsing:

```ts
hiredStaffIds: z.array(z.string().min(1)).default([]), // already present from spec 12 — confirm, don't duplicate
```

(`hiredStaffIds` was already reserved by spec 12's schema — this spec is the first to
actually populate and read it. If it is missing when you start this spec, add it exactly
as shown; do not bump `CURRENT_SAVE_VERSION` for this.)

On `loadSave`, if `lastIncomeTickAt` is `null` (a save that predates this spec, or a brand
new player), initialise it to `now()` rather than leaving it `null` — a `null` tick time
must never reach `computeIdleEarnings` as a timestamp.

---

## 5. `GameStore` wiring

1. New state: `hiredStaffIds = $state<string[]>([])`, `lastIncomeTickAt = $state<number>(this.#now())`. Hydrate both from the save; include in `#persist()`.
2. `incomePerSecond = $derived(totalIncomePerSecond(this.hiredStaffIds))`.
3. New method `hireStaff(id: string): boolean` — same validate/deduct/append/persist/return
   shape as every other unlock method in specs 13-15 (`canHireStaff` → deduct `hireCost` →
   append to `hiredStaffIds` → persist → `true`; `false` if already hired or unaffordable).
4. **Ticking.** Add a `startIncomeTicker(): () => void` method that:
   - On call, computes `computeIdleEarnings(this.lastIncomeTickAt, this.#now(), this.incomePerSecond)` once immediately — this is the "while you were away" catch-up — and if `earned > 0`, adds it to `cash`, sets `idleEarningsToShow = earned` ($state, read by the modal in §6), and sets `lastIncomeTickAt = this.#now()`.
   - Then starts a `setInterval` (default 1000ms, injectable via `GameStoreDeps.tickIntervalMs` for fast tests) that repeats the same accrual every tick, without the modal (only the one-shot catch-up on load shows the modal).
   - Returns a cleanup function that clears the interval; the mounting `+page.svelte` calls this once on mount and its cleanup on unmount (Svelte's `$effect` teardown), matching how any other subscription in this codebase is torn down.
   - Do not use `requestAnimationFrame` — a background tab throttles rAF to near-zero, which is fine for a rendering loop but wrong for a cash accrual loop that should keep counting while backgrounded. `setInterval` degrades gracefully (browsers just throttle its rate, not its eventual correctness, and the elapsed-time-based formula in `idleIncome.ts` is what makes throttling harmless — the real fix for "was the tab closed for 3 hours" is the elapsed-time formula, not the ticking mechanism).
5. `venue`/`displayedGalleryEntries` (spec 14) become curator-aware:
   ```ts
   displayedGalleryEntries = $derived.by(() => {
   	const curates = this.hiredStaffIds.some((id) => getStaffRole(id)?.autoCurates);
   	const sorted = curates
   		? [...this.galleryHistory].sort((a, b) => b.score - a.score)
   		: [...this.galleryHistory].sort((a, b) => b.completedAt - a.completedAt);
   	return sorted.slice(0, this.venue.capacity);
   });
   ```
   This replaces spec 14's simpler recency-only version — a small, expected edit to a
   `$derived` this spec depends on, not a new concept.
6. Curator also **auto-applies the best owned layout**: when `autoCurates` is true,
   `activeLayoutId` is treated as `[...this.unlockedLayoutIds].sort by curationMultiplier desc)[0].id`
   for the purposes of `presentationMultiplier` (spec 14), overriding whatever the player
   last manually selected. Implement as a derived `effectiveLayoutId` used everywhere
   `activeLayoutId` currently feeds `presentationMultiplier`, rather than mutating
   `activeLayoutId` itself — the player's manual choice should reappear untouched if the
   Curator is ever "fired" (out of scope to implement firing, but don't destroy the data).
7. `reset()`: clear `hiredStaffIds`, reset `lastIncomeTickAt` to `this.#now()`, clear any
   pending auto-invite timeout, clear the income ticker interval if running.

**Tests:**

- `hireStaff('apprentice')` with sufficient cash/reputation → `true`, cash deducted,
  `incomePerSecond` reflects it, `#persist` called.
- `hireStaff('apprentice')` twice → second call `false`, no double deduction.
- `startIncomeTicker()` called with `lastIncomeTickAt` 60s in the past (injected `#now`)
  and `apprentice` hired → `cash` increases by `computeIdleEarnings`'s exact value,
  `idleEarningsToShow` is set to that value.
- `startIncomeTicker()` with no hired income roles → no cash change, `idleEarningsToShow`
  stays unset (or `0` — pick one and assert it; recommend leaving it `null` so the modal's
  presence check is a simple truthiness test).
- With `marketing-director` hired and `phase === 'idle'`, advancing injected fake timers by
  `BASE_AUTO_INVITE_DELAY_MS / 3` calls `inviteClient()` automatically; without it hired,
  the same advance does nothing.
- With `curator` hired, `displayedGalleryEntries` orders by `score` descending even when
  a lower-scored piece is more recent.

---

## 6. UI

### `StaffOffice.svelte`

Same shop pattern as `ToolkitShop`/`GalleryUpgradeShop` — props in, events out. Each role
is a simple **Hired / Not hired** card (no switching, no ordering — see §1); show
`incomePerSecond` as a friendly "$X/min" derived value and `autoInviteSpeedMultiplier`/
`autoCurates` as short descriptive tags rather than raw numbers.

| Prop                  | Type                   |
| --------------------- | ---------------------- |
| `roles`               | `StaffRole[]`          |
| `hiredIds`            | `string[]`             |
| `cash` / `reputation` | `number`               |
| `onhire`              | `(id: string) => void` |
| `onclose`             | `() => void`           |

Wire into `GameMenuBar.svelte` alongside the toolkit/gallery-upgrade buttons, e.g. **"🧑‍💼
Staff Office"**.

### `IdleEarningsModal.svelte`

A one-shot dismissible overlay shown once per page load when `idleEarningsToShow` is
truthy after `startIncomeTicker()`'s initial catch-up runs.

| Prop        | Type         |
| ----------- | ------------ |
| `amount`    | `number`     |
| `ondismiss` | `() => void` |

Copy: "While you were away, your studio earned **$\{amount\}**." Single "Collect" button
calling `ondismiss`, which should also clear `idleEarningsToShow` back to `null` on the
store side so it cannot reappear on the next reload.

Mount both `StaffOffice` (menu-triggered, like the other shops) and `IdleEarningsModal`
(auto-shown, no trigger) from `+page.svelte`; call `game.startIncomeTicker()` once in an
`onMount`/`$effect` there and its returned cleanup on teardown.

**Tests:** `StaffOffice.svelte.test.ts` mirrors `ToolkitShop`'s hired/affordable/locked
card states; `IdleEarningsModal.svelte.test.ts` renders the amount and fires `ondismiss`.

---

## 7. Definition of done

- [ ] Hiring any role is a one-time cash spend; roles are never un-hired or refunded.
- [ ] Passive income accrues correctly whether the tab stays open (repeated `setInterval`
      ticks) or was closed and reopened (one catch-up computed from `lastIncomeTickAt`),
      and never exceeds `MAX_IDLE_MS` worth of accrual regardless of how long the tab was
      actually closed.
- [ ] With no income-producing role hired, `cash` never changes on its own — the ticker
      must be a true no-op at `incomePerSecond === 0`.
- [ ] Marketing Director genuinely removes the need to click "Invite Client" while idle;
      without it, manual-only behaviour is pixel-for-pixel unchanged from before this spec.
- [ ] Curator changes `displayedGalleryEntries` ordering and the effective layout
      multiplier without mutating the player's own `activeLayoutId` selection.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green.
- [ ] `src/lib/components/README.md` documents `StaffOffice` and `IdleEarningsModal`.
- [ ] Handoff entry in `docs/agent-log.md`.

## 8. Explicitly out of scope

- Firing/replacing staff, salaries, or any recurring (non-one-time) cost.
- Any role that affects `accuracyScore`/`creativityScore` directly (an "Art Director" that
  makes the Apprentice's background art score higher, say) — the Apprentice's income is a
  flat rate, not a simulated commission with its own critique.
- Visual representation of the Apprentice/staff on-screen (a little sprite painting in the
  background) — this spec is the economic mechanic and the shop UI, not scene art.
- Notifications, sounds, or push-style alerts when idle earnings are ready — the modal
  shown on the next load is the entire "return visit" experience for this spec.
