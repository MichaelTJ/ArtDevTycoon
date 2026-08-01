# Spec 23 — Dev mode

**Worktree:**

```powershell
git worktree add -b agent/dev-mode ../adt-wt-dev-mode main
New-Item -ItemType Junction -Path ../adt-wt-dev-mode/node_modules -Target ./node_modules
```

**Depends on:** Specs 01–04 + 12 (playable loop + save). Benefits from 13–16 unlock tables
and 17 (`?studioDebug=1`) but MUST work if Phaser floor is off.
**Priority:** Contributor / QA tooling. Can parallel Spec 22 if zones stay disjoint
(22 owns save slots + SaveSlotsPanel; 23 owns `devMode` module + DevPanel — coordinate
only on `GameMenuBar` / `+page` if both land; prefer **serialise after 22** or give 23
the menu entry and 22 a nested “Saves” from DevPanel only when both merge — default:
**run 22 first**, then 23).

---

## Mission

QA and content work currently lean on a thin `?studioDebug=1` flag (Talk / Deliver
buttons for e2e). There is no safe way to jump venues, grant cash, inspect the Level 1
modifier joke, or import a save without hand-editing `localStorage`.

This spec adds a **gated Dev mode**:

1. **Activation** via URL and/or Vite dev — never shown to normal production players.
2. **Dev panel** with cheats, unlock dumps, save import/export, and studio debug toggles.
3. **Replace / subsume** `studioDebug` so one gate controls floor debug affordances.
4. Keep the Level 1 crayon joke intact for real players — modifier reveal is **dev-only**.

Still no server. Still `adapter-static`. Cheats mutate the local `GameStore` / save only.

---

## Ownership zone

```
New:
  src/lib/dev/devMode.ts
  src/lib/dev/devMode.test.ts
  src/lib/dev/cheats.ts
  src/lib/dev/cheats.test.ts
  src/lib/dev/README.md
  src/lib/components/DevPanel.svelte
  src/lib/components/DevPanel.svelte.test.ts
  docs/tasks/23-dev-mode.md                ← this file (DoD ticks only after impl)

Edit:
  src/routes/+page.svelte                  ← resolve isDevMode; pass props; wire cheats
  src/lib/components/StudioHudOverlay.svelte       ← studioDebug ← isDevMode (or alias)
  src/lib/components/StudioHudOverlay.svelte.test.ts
  src/lib/components/GameMenuBar.svelte            ← Dev entry when enabled
  src/lib/components/GameMenuBar.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  src/lib/stores/gameState.svelte.ts               ← thin cheat methods OR accept cheat apply
  src/lib/stores/gameState.svelte.test.ts
  e2e/game-loop.e2e.ts                             ← use ?dev=1 instead of ?studioDebug=1
  docs/architecture.md                             ← short Dev mode note
  docs/agent-log.md
  docs/tasks/README.md
```

**MUST NOT** edit: `package.json` (no new deps), `contracts.ts`, engine workers,
scoring formulas (read-only import of `buildLevel1Prompt` / modifiers for display OK),
Phaser `StudioScene` internals (HUD overlay props only).

If Spec 22 has already added Saves to the menu, Dev panel **MAY** link “Open saves”
via callback rather than duplicating slot UI.

---

## 1. Activation — `src/lib/dev/devMode.ts`

```ts
export const DEV_QUERY_PARAM = 'dev';
/** Persists “keep dev tools on” across reloads in this browser. */
export const DEV_LATCH_KEY = 'adt.dev.v1';

export const devLatchSchema = z.object({
	version: z.literal(1),
	/** When true, Dev mode stays on even without ?dev=1 until cleared. */
	latched: z.boolean()
});

export type DevLatch = z.infer<typeof devLatchSchema>;

/**
 * Pure. `searchParams` from `$page.url.searchParams` (or URLSearchParams).
 * `viteDev` = import.meta.env.DEV.
 * `latch` = parsed localStorage or null.
 */
export function resolveDevMode(input: {
	searchParams: URLSearchParams | { get(name: string): string | null };
	viteDev: boolean;
	latch: DevLatch | null;
}): { enabled: boolean; reason: 'query' | 'vite' | 'latch' | 'off' };
```

### Rules (normative)

| Condition                     | `enabled`                                                            |
| ----------------------------- | -------------------------------------------------------------------- |
| `?dev=1` or `?dev=true`       | **true** (`reason: 'query'`)                                         |
| `?dev=0`                      | **false** even if vite/latch would enable — hard off for the session |
| else `latch.latched === true` | **true** (`reason: 'latch'`)                                         |
| else `viteDev === true`       | **true** (`reason: 'vite'`) — menu available during `npm run dev`    |
| else                          | **false** (`reason: 'off'`)                                          |

Notes:

- Production static host + no query + no latch → **off**. That is the safety bar.
- `?studioDebug=1` **MUST** still enable floor Talk/Deliver for one release: treat as
  alias of `?dev=1` inside `resolveDevMode` (if `studioDebug=1` and no `dev=0`, enable
  with `reason: 'query'`). Update e2e to `?dev=1`; keep alias so old links work.
- Latch write/clear only from Dev panel buttons (“Keep enabled” / “Disable & clear”).

```ts
export function loadDevLatch(): DevLatch | null;
export function persistDevLatch(latch: DevLatch): void;
export function clearDevLatch(): void;
```

Swallow `localStorage` errors (same as save.ts).

### Test table — `resolveDevMode`

| viteDev | query           | latch            | Expected `enabled` / `reason` |
| ------- | --------------- | ---------------- | ----------------------------- |
| false   | (none)          | null             | false / off                   |
| false   | `dev=1`         | null             | true / query                  |
| false   | `dev=0`         | `{latched:true}` | false / off                   |
| false   | (none)          | `{latched:true}` | true / latch                  |
| true    | (none)          | null             | true / vite                   |
| false   | `studioDebug=1` | null             | true / query                  |

---

## 2. Cheats — `src/lib/dev/cheats.ts`

Pure functions that take/return patches or operate on a narrow port — **no DOM**.

```ts
export interface DevCheatPort {
	/** Current cash / reputation / commissions / unlocks accessors + mutators. */
	getCash(): number;
	setCash(n: number): void;
	getReputation(): number;
	setReputation(n: number): void;
	setLifetimeCommissions(n: number): void;
	unlockAllMediums(): void;
	unlockAllVenues(): void;
	unlockAllClientTiers(): void;
	hireAllStaff(): void;
	/** Abort commission → idle. */
	forceIdle(): void;
	/** Export active SaveData JSON string (pretty). */
	exportSaveJson(): string;
	/** Replace active save from JSON; return ok / error message. */
	importSaveJson(raw: string): { ok: true } | { ok: false; error: string };
}

export function clampCheatCash(n: number): number; // int, 0..1_000_000_000
export function clampCheatRep(n: number): number; // int, 0..1_000_000
```

`GameStore` gains thin methods used only when Dev mode is on (still safe if called —
they just mutate):

```ts
// Suggested names — match store style
devSetCash(n: number): void;
devSetReputation(n: number): void;
devSetLifetimeCommissions(n: number): void;
devUnlockAllProgression(): void; // mediums + venues/layouts + client tiers + hire all staff
devForceIdle(): void;
devExportSave(): string;
devImportSave(raw: string): { ok: true } | { ok: false; error: string };
```

Import path: `saveDataSchema.safeParse(JSON.parse(raw))` — on success write via
`persistSave` + re-hydrate like slot switch; on failure return player-safe error
(`"Invalid save JSON"` / `"Save failed validation"`). Never throw.

Unlock helpers **MUST** use existing data tables (`MEDIUM_TIERS`, venues, client tiers,
`STAFF_ROLES`) — read ids, assign to store fields, `#persist()`.

### Test table

| Call                                   | Expected                     |
| -------------------------------------- | ---------------------------- |
| `clampCheatCash(3.7)`                  | `3`                          |
| `clampCheatCash(-1)`                   | `0`                          |
| `clampCheatCash(2e9)`                  | `1_000_000_000`              |
| `devImportSave('{')`                   | `{ ok: false, error: ... }`  |
| `devImportSave` valid minimal SaveData | `{ ok: true }`; cash matches |

---

## 3. Modifier peek (dev-only)

```ts
/** Returns the hidden Level 1 suffix for display in DevPanel ONLY. */
export function peekLevel1ModifierSuffix(): string;
```

Implement by importing the same source `buildLevel1Prompt` uses (do not duplicate the
string). DevPanel shows:

- Player draft prompt (from store)
- Full modified prompt (`buildLevel1Prompt(draft)`) in a `<pre>` / readonly textarea
- Banner: `"Dev only — players never see this."`

**MUST NOT** mount this UI when `resolveDevMode` is off. **MUST NOT** log the modified
prompt to console in production builds when disabled.

---

## 4. UI — `DevPanel.svelte`

```ts
interface Props {
	enabled: boolean; // if false, render nothing
	reason: 'query' | 'vite' | 'latch' | 'off';
	cash: number;
	reputation: number;
	lifetimeCommissions: number;
	draftPrompt: string;
	modifiedPrompt: string; // from peek / buildLevel1Prompt
	onclose: () => void;
	onsetcash: (n: number) => void;
	onsetreputation: (n: number) => void;
	onsetcommissions: (n: number) => void;
	onunlockall: () => void;
	onforceidle: () => void;
	onexport: () => void; // parent copies exportSave() to clipboard or download
	onimport: (raw: string) => void;
	onlatch: () => void;
	onclearlatch: () => void;
}
```

Sections (one column, scrollable dialog — match shop panel chrome):

1. **Status** — reason badge (`query` / `vite` / `latch`); Latch / Clear latch buttons.
2. **Economy** — numeric inputs + Apply for cash, reputation, lifetime commissions.
3. **Unlock all** — one button (`devUnlockAllProgression`).
4. **Commission** — Force idle.
5. **Prompt peek** — draft + modified (dev banner).
6. **Save IO** — Export (textarea fill or download) + Import (textarea + Apply).
7. **Studio** — note that Talk/Deliver appear on the floor HUD while Dev mode is on.

Accessibility: real controls, focusable close, `aria-label="Developer tools"`.

### GameMenuBar

When `devEnabled` prop true, show **Dev** button (visually distinct but not loud —
plain text button, not a purple glow). Opens DevPanel.

### StudioHudOverlay

`studioDebug={devEnabled}` (or rename prop to `devMode` and keep `studioDebug` as
deprecated alias defaulting to same). E2E uses `?dev=1`.

---

## 5. `+page.svelte` wiring

```ts
const viteDev = import.meta.env.DEV;
const latch = loadDevLatch();
const dev = $derived(
	resolveDevMode({
		searchParams: page.url.searchParams,
		viteDev,
		latch: loadDevLatch() // or $state refreshed after latch buttons
	})
);
```

Pass `dev.enabled` into GameMenuBar + StudioHudOverlay. Wire DevPanel callbacks to
`game.dev*`. Export: `navigator.clipboard.writeText` with textarea fallback.

---

## 6. Explicitly out of scope

- Shipping cheats in the normal Options menu.
- Server-side admin, feature flags service, analytics.
- Changing Level 1 balance or unlocking modifiers for real players.
- Auto-playing commissions / bot client.
- Performance profilers / WebGPU inspector (browser tools cover that).

---

## 7. Architecture blurb

> Spec 23 adds gated Dev mode (`?dev=1`, Vite `import.meta.env.DEV`, or `adt.dev.v1`
> latch). When enabled, a Dev panel exposes cheats, save import/export, and the hidden
> Level 1 modifier peek. Production visits without the query or latch never see it.
> `?studioDebug=1` remains an alias for floor e2e controls.

---

## 8. Definition of done

- [x] `resolveDevMode` table green; `dev=0` overrides latch.
- [x] Latch load/persist/clear never throws.
- [x] Cheat clamps + import validation unit-tested.
- [x] DevPanel hidden when `enabled=false`; visible controls when true.
- [x] Modifier peek only rendered inside DevPanel.
- [x] GameMenuBar Dev entry gated; Studio Talk/Deliver tied to same gate.
- [x] e2e updated to `?dev=1` (alias still works).
- [x] `npm run check`, `npm run lint`, scoped `test:unit` green for owned files.
- [x] `src/lib/dev/README.md` + architecture blurb + agent-log handoff.

---

## 9. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/23-dev-mode.md`.
>
> Read these before writing any code:
>
> 1. `best-practices.md` — especially §8 (Level 1 modifiers stay invisible to players)
> 2. `docs/architecture.md`
> 3. `src/lib/types/contracts.ts` (do not edit)
> 4. `docs/tasks/23-dev-mode.md`
> 5. `src/routes/+page.svelte` (`studioDebug` today), `GameMenuBar`, `gameState` save hydrate
> 6. `docs/agent-log.md`
>
> If editing `.svelte`, follow the Svelte 5 skill and run `svelte-autofixer` until clean.
>
> Ownership zone is listed in the spec. No `npm install`. No state-changing git.
> Do not surface modifier text outside DevPanel. Prefer running after Spec 22 if both
> touch GameMenuBar — additive props only.
>
> Implement `devMode` + cheats + DevPanel + wiring. Then run:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Append `docs/agent-log.md` handoff (§6.3).
