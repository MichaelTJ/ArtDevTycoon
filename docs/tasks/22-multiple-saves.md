# Spec 22 — Multiple save slots

**Worktree:**

```powershell
git worktree add -b agent/multiple-saves ../adt-wt-multiple-saves main
New-Item -ItemType Junction -Path ../adt-wt-multiple-saves/node_modules -Target ./node_modules
```

**Depends on:** Spec 12 (persistence) merged — `save.ts` / `GameStore` hydrate+`#persist` exist.
Does **not** depend on 05–11 or 21.x.
**Priority:** QoL / meta. Safe after Wave F (spec 20); can run beside living-studio branches
only if ownership stays off `StudioScene` / `bridge.ts`.

---

## Mission

Today there is one blob at `adt.save.v1`. A player who wants a “fresh kitchen run” and a
“museum empire” must wipe progress. Spec 20 already said multi-slot saves were out of
scope; this spec adds them.

1. **Three named slots** (ids `0` | `1` | `2`) each holding a full `SaveData` blob.
2. **One active slot** — all `persistSave` / `loadSave` traffic goes through it.
3. **Migrate** the legacy single key into slot `0` on first boot so nobody loses a run.
4. **UI** to view slots, switch, rename, copy, delete, and start a new game in an empty
   slot — without cloud sync and without a server.

In-flight commissions still do **not** persist (spec 12 rule unchanged). Switching slots
aborts the current commission and reloads meta-state from the chosen slot.

---

## Ownership zone

```
New:
  src/lib/game/saveSlots.ts
  src/lib/game/saveSlots.test.ts
  src/lib/components/SaveSlotsPanel.svelte
  src/lib/components/SaveSlotsPanel.svelte.test.ts
  docs/tasks/22-multiple-saves.md          ← this file (DoD ticks only after impl)

Edit:
  src/lib/game/save.ts                     ← thin wrappers OR re-export through slots (§2)
  src/lib/game/save.test.ts                ← migration + active-slot cases
  src/lib/game/index.ts                    ← export slot public API
  src/lib/game/README.md
  src/lib/stores/gameState.svelte.ts       ← switchSlot / newGameInSlot / deleteSlot hooks
  src/lib/stores/gameState.svelte.test.ts
  src/lib/components/GameMenuBar.svelte    ← “Saves” entry opening the panel
  src/lib/components/GameMenuBar.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  src/routes/+page.svelte                  ← wire panel callbacks (minimal)
  docs/architecture.md                     ← short § under persistence (exact blurb §8)
  docs/agent-log.md                        ← handoff
  docs/tasks/README.md                     ← index row
```

**MUST NOT** edit: `package.json`, lockfiles, `src/lib/types/contracts.ts`, Phaser
`src/lib/studio/**`, engines, audio prefs schema (`adt.audio.v1` stays independent).

---

## 1. Storage layout

| Key                   | Contents                                                       |
| --------------------- | -------------------------------------------------------------- |
| `adt.save.slots.v1`   | Zod-validated index + per-slot payloads (see §2)               |
| `adt.save.activeSlot` | `"0"` \| `"1"` \| `"2"` (string for easy `localStorage`)       |
| `adt.save.v1`         | **Legacy.** Read once for migration; then leave or delete (§3) |

```ts
// src/lib/game/saveSlots.ts
export const SLOTS_STORAGE_KEY = 'adt.save.slots.v1';
export const ACTIVE_SLOT_KEY = 'adt.save.activeSlot';
export const SLOT_IDS = ['0', '1', '2'] as const;
export type SaveSlotId = (typeof SLOT_IDS)[number];
export const MAX_SAVE_SLOTS = 3;
```

Do **not** invent a fourth slot in v1.

---

## 2. Schema

Reuse `saveDataSchema` / `SaveData` from `save.ts`. Slot wrapper:

```ts
export const saveSlotMetaSchema = z.object({
	/** Player-facing name, trimmed, 1–24 chars. */
	name: z.string().trim().min(1).max(24),
	/** Mirror of SaveData.savedAt for the slot list without parsing full gallery. */
	savedAt: z.number().int().nonnegative(),
	/** Empty slot = no payload yet. */
	empty: z.boolean()
});

export const saveSlotsFileSchema = z.object({
	version: z.literal(1),
	slots: z.object({
		'0': z.object({
			meta: saveSlotMetaSchema,
			data: saveDataSchema.nullable()
		}),
		'1': z.object({
			meta: saveSlotMetaSchema,
			data: saveDataSchema.nullable()
		}),
		'2': z.object({
			meta: saveSlotMetaSchema,
			data: saveDataSchema.nullable()
		})
	})
});

export type SaveSlotsFile = z.infer<typeof saveSlotsFileSchema>;
```

Empty slot defaults:

| Field          | Value                                                 |
| -------------- | ----------------------------------------------------- |
| `meta.name`    | `"Slot 1"` / `"Slot 2"` / `"Slot 3"` (1-based labels) |
| `meta.savedAt` | `0`                                                   |
| `meta.empty`   | `true`                                                |
| `data`         | `null`                                                |

---

## 3. Migration (exact algorithm)

```ts
/**
 * Ensures slots file + active pointer exist.
 * Call once from loadSave / GameStore ctor before reading a slot.
 */
export function ensureSaveSlotsMigrated(
	startingCash: number,
	now: () => number = Date.now
): SaveSlotsFile;
```

1. Try `localStorage.getItem(SLOTS_STORAGE_KEY)` → `safeParse`. If valid, return it
   (still ensure `ACTIVE_SLOT_KEY` defaults to `'0'` if missing).
2. Else build empty three-slot file via helpers.
3. Read legacy `adt.save.v1`. If `saveDataSchema.safeParse` succeeds:
   - Put that blob in slot `'0'` with `empty: false`, `name: 'Slot 1'`,
     `savedAt: data.savedAt`.
   - Set active slot to `'0'`.
4. Else leave all slots empty; active `'0'`.
5. Persist slots file. **MAY** `removeItem('adt.save.v1')` after successful write so the
   next boot does not re-migrate; if remove fails, next boot sees valid slots file first
   and skips migration — also fine.
6. Never throw. Any `localStorage` error → in-memory empty file (same spirit as
   `loadSave`).

### Test table — migration

| Setup                           | Expected                                         |
| ------------------------------- | ------------------------------------------------ |
| No keys                         | 3 empty slots; active `'0'`                      |
| Legacy valid `adt.save.v1` only | Slot 0 filled; 1+2 empty; active `'0'`           |
| Valid slots file already        | Unchanged; legacy ignored                        |
| Corrupt slots JSON              | Fall back to empty (+ legacy migrate if present) |

---

## 4. Public API (`saveSlots.ts` + `save.ts`)

Keep existing call sites working:

```ts
/** Reads the ACTIVE slot's SaveData (or default). Migrates first. */
export function loadSave(startingCash: number, now?: () => number): SaveData;

/** Writes into the ACTIVE slot; updates meta.savedAt / empty=false. */
export function persistSave(data: SaveData): void;
```

New:

```ts
export function getActiveSlotId(): SaveSlotId;
export function setActiveSlotId(id: SaveSlotId): void;

export function listSaveSlots(): ReadonlyArray<{
	id: SaveSlotId;
	name: string;
	savedAt: number;
	empty: boolean;
	/** Present when !empty — for UI summary. */
	summary?: { cash: number; reputation: number; lifetimeCommissions: number };
}>;

/** Load slot id into memory shape without changing active (for preview). */
export function peekSlot(id: SaveSlotId, startingCash: number): SaveData | null;

/**
 * Make `id` active and return its SaveData (default if empty).
 * Caller (GameStore) applies hydrate + aborts in-flight commission.
 */
export function activateSlot(id: SaveSlotId, startingCash: number, now?: () => number): SaveData;

/** Replace slot with createDefaultSave; set active to id; return new data. */
export function newGameInSlot(
	id: SaveSlotId,
	startingCash: number,
	name?: string,
	now?: () => number
): SaveData;

/** Clear slot to empty meta; if it was active, keep active but data becomes default on next load OR auto-newGame — pick: keep active + write default save (not empty) so game always has a blob. */
export function deleteSlot(id: SaveSlotId, startingCash: number, now?: () => number): void;

/**
 * After delete: slot becomes empty (data null). If deleted slot was active,
 * activate the lowest-index non-empty slot, or `newGameInSlot('0')` if all empty.
 */
export function renameSlot(id: SaveSlotId, name: string): void;

/** Deep-copy data from `from` → `to` (overwrites to). No-op if from empty. */
export function copySlot(from: SaveSlotId, to: SaveSlotId, now?: () => number): void;
```

`renameSlot`: trim; if length 0 after trim, no-op; clamp to 24 chars.

### Test table — activate / new / delete

| Action                                             | Expected                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `newGameInSlot('1', 100, 'Kitchen')`               | Slot 1 non-empty, cash 100, name Kitchen, active `'1'`                    |
| `persistSave` after activate 1                     | Only slot 1 `data` changes                                                |
| `deleteSlot('1')` while active 1 and slot 0 filled | Active becomes `'0'`; slot 1 empty                                        |
| `deleteSlot` all                                   | Active `'0'` with fresh default save (non-empty) so boot never soft-locks |
| `copySlot('0','2')`                                | Slot 2 equals 0 data; names independent                                   |

---

## 5. `GameStore` seams

```ts
/** Abort in-flight commission, hydrate from slot, persist pointer. */
switchToSlot(id: SaveSlotId): void;

newGameInSlot(id: SaveSlotId, name?: string): void;

deleteSaveSlot(id: SaveSlotId): void;

renameSaveSlot(id: SaveSlotId, name: string): void;

copySaveSlot(from: SaveSlotId, to: SaveSlotId): void;

/** For UI binding. */
readonly saveSlotsList: ReturnType<typeof listSaveSlots>; // $derived or refreshed method
readonly activeSaveSlotId: SaveSlotId;
```

`switchToSlot` algorithm:

1. If `id === active`, return.
2. `#persist()` current slot (best-effort) while still on old active.
3. `activateSlot(id, …)`.
4. Apply hydrate fields exactly like constructor (cash, reputation, gallery, unlocks,
   skills, hired staff, …).
5. Force `phase = 'idle'`; clear client/artwork/critique/draft/error/pending gains.
6. Fire any existing studio dismiss/sync path the page already uses on idle (page may
   call `syncStudio()` after — document the callback if needed).

Inject `loadSave` / `persistSave` deps **unchanged** so tests keep working; slot helpers
use real `localStorage` in unit tests via the same memory stub pattern as `save.test.ts`.

---

## 6. UI — `SaveSlotsPanel.svelte`

Presentational where possible; actions via callbacks:

```ts
interface Props {
	slots: ReturnType<typeof listSaveSlots>;
	activeId: SaveSlotId;
	onswitch: (id: SaveSlotId) => void;
	onnew: (id: SaveSlotId) => void;
	ondelete: (id: SaveSlotId) => void;
	onrename: (id: SaveSlotId, name: string) => void;
	oncopy: (from: SaveSlotId, to: SaveSlotId) => void;
	onclose: () => void;
}
```

UX rules:

- Real `<button>` / `<input>` with accessible names.
- Each slot row: name, cash/rep/commissions (or “Empty”), Active badge, actions.
- **Switch** confirms if `phase !== 'idle'` — parent passes `busy: boolean` **OR** panel
  shows `"Switching abandons the current commission."` confirm `<dialog>`.
- **Delete** always confirms.
- **New game** on a non-empty slot confirms overwrite.
- Copy: simple “Copy to…” choose empty/other slot (overwrite confirm if target filled).

Mount from `GameMenuBar` like Progress / shops (`Saves` button).

### Component tests

| Case                       | Assert                   |
| -------------------------- | ------------------------ |
| Renders 3 slots            | roles/names visible      |
| Active badge on `activeId` | visible                  |
| Switch click               | `onswitch` fired with id |
| Delete confirm cancel      | `ondelete` not fired     |

---

## 7. Explicitly out of scope

- Cloud sync, accounts, cross-device.
- More than 3 slots.
- Export/import JSON file (that is Spec 23 Dev Mode — MAY deep-link later).
- Persisting in-flight commissions.
- Per-slot engine / audio prefs (engine + `adt.audio.v1` stay global to the browser).

---

## 8. Architecture blurb

Add under the Spec 12 persistence note in `docs/architecture.md`:

> Spec 22 stores up to three named `SaveData` slots in `adt.save.slots.v1` with an active
> pointer. Legacy `adt.save.v1` migrates into slot 0. Switching slots reloads meta-progress
> and returns to `idle`; engine choice and audio prefs remain browser-global.

---

## 9. Definition of done

- [x] Migration table cases green.
- [x] `loadSave` / `persistSave` round-trip through the active slot.
- [x] Switch / new / delete / rename / copy covered by unit tests with literal expectations.
- [x] `SaveSlotsPanel` + GameMenuBar entry with component tests.
- [x] Switching mid-commission lands `idle` with the other slot’s cash/unlocks.
- [x] Corrupt storage never bricks boot.
- [x] `npm run check`, `npm run lint`, scoped `test:unit` green for owned files.
- [x] Architecture blurb + agent-log handoff + tasks README row.

---

## 10. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/22-multiple-saves.md`.
>
> Read these before writing any code:
>
> 1. `best-practices.md`
> 2. `docs/architecture.md`
> 3. `src/lib/types/contracts.ts` (do not edit)
> 4. `docs/tasks/22-multiple-saves.md`
> 5. `src/lib/game/save.ts`, `src/lib/stores/gameState.svelte.ts`
> 6. `docs/agent-log.md`
>
> Ownership zone is listed in the spec. No `npm install`. No state-changing git.
> Do not edit Phaser studio files or `contracts.ts`.
>
> Implement slots, migration, GameStore seams, and SaveSlotsPanel. Then run:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Fix failures in your files only. Append `docs/agent-log.md` handoff (§6.3).
