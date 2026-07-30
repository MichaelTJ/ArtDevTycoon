# Spec 12 — Progression persistence (save/load)

**Worktree:** `git worktree add -b agent/progression-save ../adt-wt-progression-save main`
**Depends on:** Specs 01–04 merged (the playable Level 1 loop must exist).
**Unlocks:** Specs 13, 14, 15, 16 — every progression system needs somewhere permanent to
keep its unlocks.

## Why this has to come first

`docs/architecture.md` §4 currently says, deliberately: _"`GameState` — cash, gallery, the
current commission — does **not** persist. Level 1 starts fresh every session by design."_
That was the right call when the only thing to lose was one five-commission run. It stops
being the right call the moment a purchase is supposed to be permanent — a player who
spends $5,000 on an oil-painting unlock (spec 13) cannot have that erased by an accidental
tab refresh, and a player must not be able to farm infinite upgrades by refreshing after
every purchase to get their cash back.

This spec is the product decision that reverses that paragraph, scoped narrowly: **meta
-progression persists, the live commission does not.** Concretely:

| Persists across reload                                                  | Does not persist                                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| `cash`, `reputation`, lifetime `commissionsCompleted`                   | `phase` (always boots to `'idle'`)                   |
| `galleryHistory`                                                        | `currentClient`, `currentArtwork`, `currentCritique` |
| Everything spec 13–16 add (unlocked tiers, owned upgrades, hired staff) | `draftPrompt`, `errorMessage`, `generationProgress`  |

A player who reloads mid-commission loses that one in-flight brief and lands back on
`idle` with an "invite a client" prompt — exactly like today — but keeps every dollar and
every upgrade they'd already banked. That is the only behavioural change this spec makes
to Level 1.

Update `docs/architecture.md` §4 once this spec is merged: replace the "does not persist"
paragraph with a short pointer to this file (exact wording in §5 below).

## Ownership zone

```
New:
  src/lib/game/save.ts
  src/lib/game/save.test.ts

Edit (small, targeted):
  src/lib/stores/gameState.svelte.ts
  src/lib/stores/gameState.svelte.test.ts
  src/lib/game/index.ts               ← re-export save.ts's public functions
  docs/architecture.md                ← §4 addendum (exact text in §5 below)
  docs/tasks/README.md
```

Do not edit `src/lib/types/contracts.ts`. The save schema is a **localStorage-boundary**
schema, not a cross-layer contract — it lives next to the code that owns it, the same way
`remoteEngineConfigSchema` lives in `src/lib/engines/remote/remoteConfig.ts` (spec 07)
rather than in `contracts.ts`. Follow that precedent exactly: your own Zod schema, your own
file, `safeParse` on load, never throw.

---

## 1. `src/lib/game/save.ts`

```ts
import { z } from 'zod';
import { galleryEntrySchema, type GalleryEntry } from '$lib/types/contracts';

export const SAVE_STORAGE_KEY = 'adt.save.v1';
export const CURRENT_SAVE_VERSION = 1;

/**
 * Everything a progression system needs to persist. Specs 13-16 each own one array of
 * string ids on this shape — string ids (not enums) so a later spec can add new tiers,
 * upgrades or staff roles without touching this schema again.
 */
export const saveDataSchema = z.object({
	version: z.literal(1),
	cash: z.number().int().min(0),
	reputation: z.number().int().min(0),
	lifetimeCommissions: z.number().int().min(0),
	galleryHistory: z.array(galleryEntrySchema),

	/** Spec 13. First entry is always 'crayon'; never empty. */
	unlockedMediumTierIds: z.array(z.string().min(1)).min(1).default(['crayon']),
	activeMediumTierId: z.string().min(1).default('crayon'),

	/** Spec 14. */
	unlockedVenueId: z.string().min(1).default('fridge'),
	unlockedLayoutIds: z.array(z.string().min(1)).default(['cluttered']),
	activeLayoutId: z.string().min(1).default('cluttered'),
	ownedAtmosphereIds: z.array(z.string().min(1)).default([]),

	/** Spec 15. */
	unlockedClientTiers: z.array(z.string().min(1)).default(['walk-in']),

	/** Spec 16. */
	hiredStaffIds: z.array(z.string().min(1)).default([]),
	/** Epoch ms of the last time idle income was collected/ticked. Null until spec 16. */
	lastIncomeTickAt: z.number().int().nonnegative().nullable().default(null),

	/** Epoch ms this blob was written. Not shown to the player; useful for debugging. */
	savedAt: z.number().int().nonnegative()
});

export type SaveData = z.infer<typeof saveDataSchema>;

/** A brand-new player. `startingCash` matches `LEVEL_1.startingCash` at call time. */
export function createDefaultSave(startingCash: number, now: () => number = Date.now): SaveData {
	return saveDataSchema.parse({
		version: CURRENT_SAVE_VERSION,
		cash: startingCash,
		reputation: 0,
		lifetimeCommissions: 0,
		galleryHistory: [],
		savedAt: now()
	});
}

/**
 * Reads and validates the save blob. Returns `createDefaultSave(startingCash)` for a
 * missing key, malformed JSON, a schema mismatch, or a `localStorage` throw (Safari
 * private mode, quota errors) — a corrupt save must never block the game from loading.
 */
export function loadSave(startingCash: number, now: () => number = Date.now): SaveData {
	try {
		const raw = localStorage.getItem(SAVE_STORAGE_KEY);
		if (!raw) return createDefaultSave(startingCash, now);
		const parsed = saveDataSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : createDefaultSave(startingCash, now);
	} catch {
		return createDefaultSave(startingCash, now);
	}
}

/** Best-effort write. Swallows quota/private-mode errors — a failed save must never throw. */
export function persistSave(data: SaveData): void {
	try {
		localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
	} catch {
		// Storage full or unavailable. Losing one write is better than crashing the game.
	}
}

/** Clears the save. Exposed for a future "reset progress" button; not wired to any UI yet. */
export function clearSave(): void {
	try {
		localStorage.removeItem(SAVE_STORAGE_KEY);
	} catch {
		// ignore
	}
}
```

There is deliberately **no migration function for version 2+** yet — one version exists.
When spec 13 needs a new field, it adds it to `saveDataSchema` with a Zod `.default(...)`
so old blobs keep parsing (see the fields above already written that way pre-emptively;
specs 13-16 should follow the same pattern rather than bumping `version`). Only bump
`CURRENT_SAVE_VERSION` and add a real migration if a field's **meaning** changes, not
when a field is added.

**Tests (`save.test.ts`, Node, fake `localStorage` via `vi.stubGlobal` or a simple in-memory
polyfill):**

| Scenario                                   | Expected                                                            |
| ------------------------------------------ | ------------------------------------------------------------------- |
| Nothing in storage                         | `loadSave(100)` returns `createDefaultSave(100)` shape, `cash: 100` |
| Valid JSON, matches schema                 | Returns the parsed object unchanged                                 |
| Valid JSON, missing new-ish optional field | Zod fills the default (e.g. `hiredStaffIds: []`)                    |
| `localStorage.getItem` throws              | Falls back to default, does not throw                               |
| Malformed JSON string                      | Falls back to default, does not throw                               |
| `persistSave` then `loadSave`              | Round-trips exactly                                                 |
| `persistSave` when `setItem` throws        | Does not throw                                                      |

---

## 2. Wiring into `GameStore` (`src/lib/stores/gameState.svelte.ts`)

1. Constructor: hydrate `cash`, `reputation`, `commissionsCompleted` (rename source is
   `lifetimeCommissions`), and `galleryHistory` from `loadSave(LEVEL_1.startingCash)`
   instead of hardcoding `LEVEL_1.startingCash` / `0` / `[]`. Accept an injected
   `loadSave`/`persistSave` pair via `GameStoreDeps` (same dependency-injection pattern
   already used for `engine`, `random`, `now`) so tests never touch real `localStorage`.
2. Add a private `#persist(): void` method that reads the store's current persisted
   fields plus whatever specs 13-16 have added by then, builds a `SaveData`, and calls
   `persistSave`. Specs 13-16 extend this one method rather than adding their own
   parallel save calls — one writer, one place to see the whole shape.
3. Call `#persist()` at exactly these points (explicit call sites, not a generic
   `$effect` watcher — a watcher over this many fields is easy to accidentally fire
   during a phase transition and is harder for a future agent to reason about):
   - End of `collectCash()`, after `galleryHistory` is updated.
   - Any purchase/unlock/hire action added by specs 13-16.
4. `reset()` (existing method, currently used by tests) additionally calls `clearSave()`
   so a fresh `GameStore` in a test never leaks a previous test's `localStorage` state.
   Existing `gameState.svelte.test.ts` cases must keep passing; inject a fake
   `loadSave`/`persistSave` pair (returning `createDefaultSave` and a no-op) in the test
   setup so no test suite touches real `localStorage`.

Do not persist `phase`, `currentClient`, `currentArtwork`, `currentCritique`,
`draftPrompt`, `errorMessage`, or `generationProgress`. If any of those end up in
`SaveData`, that is a bug — the whole point of this spec is that only banked progress
survives a reload.

**Tests to add in `gameState.svelte.test.ts`:**

- A `GameStore` constructed with a fake `loadSave` returning `cash: 340, reputation: 12`
  starts with those values instead of `LEVEL_1.startingCash`.
- `collectCash()` calls the injected `persistSave` exactly once with the new `cash` and
  `galleryHistory`.
- `reset()` calls the injected `clearSave`.

---

## 3. Idle-earnings seam for spec 16 (do not implement here)

`lastIncomeTickAt` exists in the schema now so spec 16 does not need to touch this file's
schema-versioning story — it can start reading/writing that one field on day one. Do not
add any ticking, interval, or idle-income logic in this spec; leave `lastIncomeTickAt` at
its default `null` and unused by `GameStore`.

---

## 4. `docs/architecture.md` addendum

Replace the final two sentences of §4's persistence paragraph (the ones beginning
_"`GameState` — cash, gallery, the current commission — does **not** persist..."_) with:

> `GameState` used to be fully session-only by design. Spec 12
> (`docs/tasks/12-progression-persistence.md`) narrowed that: `cash`, `reputation`,
> lifetime commission count and `galleryHistory`, plus every progression unlock from specs
> 13-16, now persist to `localStorage` under `adt.save.v1` and survive a reload. The
> in-flight commission — `phase`, the current client/artwork/critique, the draft prompt —
> still does not persist; a reload always lands back on `idle`. The reasoning that made
> session-only state the right call for a five-commission Level-1 loop does not extend to
> permanent purchases, and losing a half-typed prompt on refresh is an acceptable, honest
> trade against silently erasing $5,000 of banked upgrades.

---

## 5. Definition of done

- [ ] `save.ts` round-trips a `SaveData` through `localStorage` and never throws, even
      with storage unavailable or corrupted.
- [ ] `GameStore` hydrates cash/reputation/lifetime commissions/gallery from the save on
      construction and writes back after every `collectCash()`.
- [ ] A reload mid-`briefing`/`generating`/`critiquing`/`results` phase lands on `idle`
      with the previous commission gone but cash/reputation/gallery intact (verify by hand
      in `npm run dev`: complete one commission, start a second, refresh, confirm cash from
      the first is still there and the game is back at `idle`).
- [ ] No existing test touches real `localStorage`; all use an injected `loadSave`/
      `persistSave` pair.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green.
- [ ] `docs/architecture.md` §4 updated with the addendum in §4 above.
- [ ] Handoff entry in `docs/agent-log.md`.

## 6. Explicitly out of scope

- Multiple save slots, cloud sync, export/import — one save, one browser, one key.
- A "New Game" / reset-progress button in the UI (`clearSave()` is exposed for this but
  unwired).
- Any migration logic beyond "unknown/missing field gets its Zod default." If a spec 13-16
  field's _meaning_ needs to change after it ships, that is a new spec's problem.
- Idle income accrual itself (`lastIncomeTickAt` is a placeholder field only) — spec 16.
