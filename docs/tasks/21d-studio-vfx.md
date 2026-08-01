# Spec 21d — Studio VFX (desk work particles + cash confetti)

**Worktree:**

```powershell
git worktree add -b agent/studio-vfx ../adt-wt-studio-vfx main
New-Item -ItemType Junction -Path ../adt-wt-studio-vfx/node_modules -Target ./node_modules
```

**Depends on:** Specs 17–20 merged (walkable venues, Mum, HUD cash tween). Catalog parent:
`docs/tasks/21-living-studio.md` §D. Boss plan: `docs/tasks/21-boss-plan.md` (Wave H / R3).
Does **not** depend on 05–11 or on 21c audio.
**Priority:** Shortlist D3 + D4 from the living-studio MVP (“kitchen that feels alive”).

---

## Mission

The desk work loop already snaps the player to the desk and shows a progress bar during
`generating` / `critiquing`. Collect Cash already tweens the HUD cash number (Spec 20 /
`HudBar`). The floor itself is still silent visually — no pencil dust, no coin pop.

This spec adds **two presentation-only VFX**:

1. **D3 — Desk work particles** — light pencil-dust / paper scraps near the desk while
   `phase` is `generating` or `critiquing`.
2. **D4 — Cash confetti** — a short coin / scrap burst when Collect Cash lands (floor
   deliver or ResultsPanel collect).

Both **MUST** turn **OFF** when the player prefers reduced motion. Detection lives in
Svelte (`matchMedia('(prefers-reduced-motion: reduce)')`), flows into Phaser as
`StudioSnapshot.reducedVfx`, and never breaks the existing cash number tween.

No new npm dependencies. Phaser particle emitters or a tiny handful of tinted sprites
are fine. Cap counts hard so mobile WebGL stays calm.

---

## Ownership zone

```
New:
  src/lib/studio/vfx.ts
  src/lib/studio/vfx.test.ts
  docs/tasks/21d-studio-vfx.md          ← this file (DoD ticks only after impl)

Edit:
  src/lib/studio/bridge.ts              ← additive StudioSnapshot.reducedVfx only
  src/lib/studio/bridge.test.ts         ← default false on fixture snapshots
  src/lib/studio/scenes/StudioScene.ts  ← emitter setup / teardown / sync hooks ONLY
  src/lib/studio/README.md              ← VFX + reducedVfx paragraph
  src/routes/+page.svelte               ← matchMedia → reducedVfx on syncStudio()
  src/lib/components/StudioFloor.svelte.test.ts  ← only if mocks need reducedVfx
  static/studio/CREDITS.md              ← only if new particle textures are authored
  docs/agent-log.md                     ← handoff
```

**MAY** add tiny generated textures under `static/studio/vfx/` (1×1–4×4 PNG scrap /
coin dot) **or** draw particles with Phaser graphics / tinted rectangles — prefer
zero new assets when a solid-colour particle texture created in `BootScene` /
`StudioScene` via `textures.generate` (or equivalent) is enough. If a file is added,
credit it in `CREDITS.md` as ADT original (CC0).

**MUST NOT** edit:

- `package.json`, lockfiles, Vite/TS/ESLint/Prettier/Svelte configs
- `src/lib/types/contracts.ts`
- Audio system / `src/lib/audio/**` / Spec 21c files
- NPC roster / spawn / Mum wander logic (21a)
- Interact registry / prop interactables (21b)
- Shop unlock tables, engines, scoring, save schema
- `HudBar` cash `Tween` behaviour (keep Spec 20 number tween intact)

### Conflict / serialize note

**Only one agent may edit `StudioScene.ts` at a time.** If 21a (NPCs) or 21b
(interactables) land first, **rebase / serialize** this branch after those scene edits.
This spec **owns only**:

- Private emitter fields + create/start/stop/destroy helpers
- Calls from existing `update` / `#onCommand(sync)` / scene shutdown
- Reading `snapshot.reducedVfx` and phase edges for VFX

It **MUST NOT** rewrite interact targeting, Mum patrol, easel rebuild, or input.

Shared additive snapshot field (boss freeze — keep the name):

```ts
reducedVfx: boolean; // default false; 21d owns wiring; 21f may later broaden the profile
```

---

## 1. Pure helpers — `src/lib/studio/vfx.ts`

Keep Phaser out of this module so unit tests stay Node-only.

```ts
/** Hard caps — document + enforce. Do not raise without a perf note in agent-log. */
export const WORK_PARTICLE_MAX = 12;
/** Max particles alive in the desk emitter at once. */
export const WORK_PARTICLE_FREQUENCY_MS = 90;
/** Emit period while working (Phaser frequency ≈ ms between spawns). */

export const CASH_BURST_COUNT = 18;
/** Particles spawned in one Collect Cash burst. */
export const CASH_BURST_LIFESPAN_MS = 700;
/** Max lifetime of a cash particle before auto-destroy. */

export type WorkVfxPhase = 'generating' | 'critiquing';

/**
 * True when desk dust/paper should run.
 * OFF when reducedVfx, or when phase is not generating/critiquing.
 */
export function shouldEmitWorkParticles(phase: string, reducedVfx: boolean): phase is WorkVfxPhase;

/**
 * True when a one-shot cash burst may play.
 * OFF when reducedVfx — Collect Cash still banks money; HUD tween still runs.
 */
export function shouldBurstCashConfetti(reducedVfx: boolean): boolean;

/**
 * Detect OS/browser reduced-motion preference.
 * `media` injects `window.matchMedia` (or a fake) for tests; defaults to
 * `globalThis.matchMedia` when available, else `false`.
 */
export function queryPrefersReducedMotion(media?: (query: string) => { matches: boolean }): boolean;

/**
 * Edge detector for Collect Cash presentation.
 * Fire burst when leaving `results` for `idle` or `levelComplete`.
 * Do not fire on results → failed, or idle → anything.
 */
export function shouldTriggerCashBurst(prevPhase: string | null, nextPhase: string): boolean;
```

**Literal algorithms:**

```ts
export function shouldEmitWorkParticles(phase: string, reducedVfx: boolean): boolean {
	if (reducedVfx) return false;
	return phase === 'generating' || phase === 'critiquing';
}

export function shouldBurstCashConfetti(reducedVfx: boolean): boolean {
	return !reducedVfx;
}

export function queryPrefersReducedMotion(
	media?: (query: string) => { matches: boolean }
): boolean {
	const m =
		media ??
		(typeof globalThis.matchMedia === 'function'
			? globalThis.matchMedia.bind(globalThis)
			: undefined);
	if (!m) return false;
	return m('(prefers-reduced-motion: reduce)').matches;
}

export function shouldTriggerCashBurst(prevPhase: string | null, nextPhase: string): boolean {
	if (prevPhase !== 'results') return false;
	return nextPhase === 'idle' || nextPhase === 'levelComplete';
}
```

Clamp helpers (optional but useful if emitters take count args):

```ts
/** Clamp requested particle count into [0, WORK_PARTICLE_MAX]. */
export function clampWorkParticleCount(n: number): number;

/** Clamp burst count into [0, CASH_BURST_COUNT]. */
export function clampCashBurstCount(n: number): number;
```

---

## 2. Bridge — `StudioSnapshot.reducedVfx`

Additive field on `StudioSnapshot` in `bridge.ts`:

```ts
export interface StudioSnapshot {
	// …existing fields…
	/**
	 * Spec 21d. When true, Phaser must not start desk work particles or cash
	 * confetti. Default false for older callers; Svelte MUST set from
	 * prefers-reduced-motion.
	 */
	reducedVfx: boolean;
}
```

- Default in docs / test fixtures: **`false`**.
- Do **not** add new inbound command types for VFX unless an implementer discovers
  phase-edge detection is unreliable — prefer `shouldTriggerCashBurst` on sync.
- Do **not** touch `contracts.ts`.

Update `bridge.test.ts` fixture to include `reducedVfx: false`.

---

## 3. Svelte detection + sync

### 3.1 Where to detect

In `src/routes/+page.svelte` (the existing `syncStudio()` owner):

1. On mount (or module init), subscribe to
   `window.matchMedia('(prefers-reduced-motion: reduce)')` with
   `addEventListener('change', …)` (fallback `addListener` only if needed for old
   engines — modern Chromium is enough).
2. Keep a `$state` boolean `reducedVfx` updated from `queryPrefersReducedMotion()`.
3. Include `reducedVfx` in every `studioBridge.sync({ … })` payload.
4. Tear down the media listener on destroy.

`StudioFloor.svelte` itself does not own the snapshot today — keep it that way. The
“StudioFloor sync” requirement means: **every sync that drives the floor MUST carry
`reducedVfx`**. Component tests / mocks that build snapshots **MUST** set the field
(default `false`).

### 3.2 MUST NOT break cash tween

`HudBar` already uses `Tween` + `prefersReducedMotion` from `svelte/motion` for the
cash counter. Spec 21d **MUST NOT** change that duration logic. Reduced-motion players
still see an instant (or zero-duration) number update; they simply skip floor
particles/confetti.

---

## 4. Phaser — `StudioScene` emitters only

### 4.1 Lifecycle

| Hook                                 | Behaviour                                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create` (after desk / player exist) | Create desk work emitter stopped; create cash burst emitter stopped (or create-on-demand).                                                                        |
| `update` / after phase known         | If `shouldEmitWorkParticles(phase, reducedVfx)` → start/follow desk; else stop.                                                                                   |
| `#onCommand` `sync`                  | Store previous `phase`; apply new snapshot; start/stop work emitter; if `shouldTriggerCashBurst(prev, next) && shouldBurstCashConfetti(reducedVfx)` → burst once. |
| Scene `SHUTDOWN` / `#teardownFloor`  | Stop + destroy emitters so venue rebuilds do not leak.                                                                                                            |

Work emitter position: desk marker (same coords as `#snapPlayerToDesk` /
`#room.desk`), slightly above the desk tile (e.g. `y - 6`). Depth above furniture,
below or near the work bar (~20–24).

Cash burst origin: player sprite position (they are often still near deliver target /
desk) **or** desk — pick one and keep it; prefer **player** so floor-deliver feels
local. If player missing, fall back to desk.

### 4.2 Visual recipe (implementation freedom within caps)

**Desk work (D3)** — pencil dust / paper:

- Warm off-white / paper (`0xf5f0e6`) and soft graphite (`0xa8a29e`) tint mix.
- Small scale (0.2–0.5 of a 4–8 px texture), slow upward drift, short lifespan
  (~400–800 ms), low alpha.
- Quantity: **at most `WORK_PARTICLE_MAX` (12)** alive; frequency ≈
  `WORK_PARTICLE_FREQUENCY_MS` (90).

**Cash confetti (D4)** — coin / scrap burst:

- Amber / coin gold (`0xf59e0b` / `0xfbbf24`) with optional pale scrap.
- One-shot `explode` / `emitParticleAt` of **`CASH_BURST_COUNT` (18)** particles.
- Lifespan ≤ `CASH_BURST_LIFESPAN_MS` (700); gravity or radial velocity OK.
- Auto-stop; never leave a continuous emitter running after collect.

### 4.3 Reduced motion

When `snapshot.reducedVfx === true`:

- Work emitter **MUST** be stopped and emit **zero** particles.
- Cash burst **MUST NOT** run (even if phase edge would fire).
- Existing desk work **animation** (`player-work`) and work progress bar **MAY** keep
  running — those are Spec 17 UX, not this VFX layer. Do not disable them here
  (Spec 21f may later own a broader reduced-motion profile).

### 4.4 Performance budget (normative caps)

| Effect                           | Cap                          | Notes                                     |
| -------------------------------- | ---------------------------- | ----------------------------------------- |
| Desk work max alive              | **12** (`WORK_PARTICLE_MAX`) | Hard stop; do not stack a second emitter. |
| Desk emit period                 | **≥ 90 ms**                  | Do not raise rate without profiling.      |
| Cash burst per collect           | **18** (`CASH_BURST_COUNT`)  | Single explode; no repeat pulses.         |
| Cash particle lifespan           | **≤ 700 ms**                 | Destroy with emitter or maxAlive.         |
| Simultaneous continuous emitters | **1** (desk only)            | Cash is one-shot.                         |

If FPS hitches appear on coarse-pointer / low-memory devices, **lower** counts in a
follow-up — do not add device heuristics in v1 (that is closer to 21f F7).

### 4.5 Suggested private API (names optional)

```ts
// Inside StudioScene — illustrative; keep private fields.
#workEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null;
#cashEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null;
#prevPhase: string | null;

#ensureVfxTextures(): void;
#syncWorkParticles(): void;
#tryCashBurst(): void;
#destroyVfx(): void;
```

Use Phaser 3’s built-in particle system (`this.add.particles(...)`). **MUST NOT**
add a particle plugin npm package.

---

## 5. Catalog extras (MAY / follow-up / out of scope for v1)

From `21-living-studio.md` §D — **not required** for this spec’s DoD:

| #   | Feature                 | Status for 21d v1                            |
| --- | ----------------------- | -------------------------------------------- |
| D1  | Venue palette polish    | **Out of scope** (follow-up / own tile pass) |
| D2  | Time-of-day wash        | **MAY** later; do not block D3/D4            |
| D3  | Desk work particles     | **Required MVP**                             |
| D4  | Cash confetti           | **Required MVP**                             |
| D5  | Easel spotlight         | **Follow-up**                                |
| D6  | Player cosmetic outfits | **Out of scope**                             |
| D7  | Hi-DPI / scale modes    | **Out of scope** (21f-adjacent)              |
| D8  | Weather outside window  | **Follow-up**                                |
| D9  | Screenshot / postcard   | **Out of scope** (ties E7)                   |
| D10 | BootScene loading art   | **Follow-up**                                |

F6 (unified reduced-motion profile) may later read the same `reducedVfx` flag for
camera shake / NPC density — do not expand this spec into F6.

---

## 6. Tests

### 6.1 `vfx.test.ts` — literal

| Call / scenario                                         | Expected |
| ------------------------------------------------------- | -------- |
| `shouldEmitWorkParticles('generating', false)`          | `true`   |
| `shouldEmitWorkParticles('critiquing', false)`          | `true`   |
| `shouldEmitWorkParticles('generating', true)`           | `false`  |
| `shouldEmitWorkParticles('idle', false)`                | `false`  |
| `shouldEmitWorkParticles('results', false)`             | `false`  |
| `shouldBurstCashConfetti(false)`                        | `true`   |
| `shouldBurstCashConfetti(true)`                         | `false`  |
| `shouldTriggerCashBurst('results', 'idle')`             | `true`   |
| `shouldTriggerCashBurst('results', 'levelComplete')`    | `true`   |
| `shouldTriggerCashBurst('results', 'failed')`           | `false`  |
| `shouldTriggerCashBurst('idle', 'idle')`                | `false`  |
| `shouldTriggerCashBurst(null, 'idle')`                  | `false`  |
| `queryPrefersReducedMotion(() => ({ matches: true }))`  | `true`   |
| `queryPrefersReducedMotion(() => ({ matches: false }))` | `false`  |
| `WORK_PARTICLE_MAX`                                     | `12`     |
| `CASH_BURST_COUNT`                                      | `18`     |
| `clampWorkParticleCount(99)`                            | `12`     |
| `clampCashBurstCount(-1)`                               | `0`      |

### 6.2 Bridge

- Fixture snapshots include `reducedVfx: false`.
- Sync still buffers `lastSnapshot` with the new field (existing test updated).

### 6.3 Manual / observational (not automated Phaser)

Document in handoff that you verified locally (or note gap if headless-only):

1. With reduced motion **off**: desk dust while generating; confetti on Collect.
2. With OS reduced motion **on** (or DevTools Rendering → emulate): no particles;
   cash number still updates / tweens per Spec 20 rules.
3. Venue rebuild / Mum kitchen still works; no emitter leaks (no growing display list).

Do **not** construct a real `Phaser.Game` in unit tests (studio README invariant).

---

## 7. README / credits

- `src/lib/studio/README.md`: short “VFX” note — desk particles during work, cash burst
  on collect, gated by `snapshot.reducedVfx`; caps listed.
- `CREDITS.md`: only if new PNG assets land under `static/studio/`.

---

## 8. Definition of done

- [x] `vfx.ts` exports caps + helpers; `vfx.test.ts` green with the table above.
- [x] `StudioSnapshot.reducedVfx` exists; bridge fixture default `false`.
- [x] `+page.svelte` listens to `prefers-reduced-motion` via `matchMedia` and passes
      `reducedVfx` on every `syncStudio()`.
- [x] Desk work particles run only for `generating` / `critiquing` and only when
      `reducedVfx === false`; capped at **12** alive / **≥90 ms** frequency.
- [x] Cash confetti fires once on Collect Cash phase edge (`results` → `idle` /
      `levelComplete`) when `reducedVfx === false`; burst count **≤ 18**, lifespan
      **≤ 700 ms**.
- [x] When `reducedVfx === true`, zero work/cash particles; HudBar cash tween
      behaviour unchanged.
- [x] Emitters destroyed on scene shutdown / floor teardown; no new npm deps.
- [x] Studio README updated; CREDITS updated only if assets added.
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for owned
      files.
- [x] Handoff appended to `docs/agent-log.md`.

---

## 9. Explicitly out of scope

- Audio stingers (21c C4) — visual burst only; no sound from this spec.
- Camera shake, NPC density, or a global F6 reduced-motion profile beyond
  `reducedVfx`.
- D1/D2/D5–D10 features listed in §5.
- Changing Collect Cash economy, XP apply order, or ResultsPanel layout.
- Editing `package.json` / adding particle libraries.
- Broad `StudioScene` refactors outside emitter setup/teardown.

---

## 10. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/21d-studio-vfx.md`.
>
> Worktree (orchestrator creates; you work inside it):
> `../adt-wt-studio-vfx` on branch `agent/studio-vfx`.
>
> Read these files completely before writing any code:
>
> 1. `best-practices.md` — binding rules (`prefers-reduced-motion` MUST)
> 2. `docs/architecture.md` — studio floor is presentation-only via `StudioBridge`
> 3. `docs/tasks/21-living-studio.md` — §D and shortlist D3/D4
> 4. `docs/tasks/21-boss-plan.md` — serialize `StudioScene` after 21a/21b if needed
> 5. `docs/tasks/21d-studio-vfx.md` — your spec
> 6. `src/lib/studio/scenes/StudioScene.ts` — work loop / sync / collect flows
> 7. `src/lib/studio/bridge.ts` — additive snapshot field only
> 8. `docs/agent-log.md` — latest handoffs
>
> Ownership zone is listed in the spec. Confine all writes to that zone. **MUST NOT**
> edit `package.json`, `src/lib/types/contracts.ts`, audio code, NPC roster logic,
> interact registry, or HudBar tween logic. Do not run `npm install`. Do not run any
> state-changing git command.
>
> If `StudioScene.ts` on your branch already has large 21a/21b edits you cannot cleanly
> rebase, stop and report — do not rewrite NPC/interact code to “make room” for
> emitters. Own only emitter setup/teardown + sync hooks.
>
> Implement helpers, bridge field, Svelte `matchMedia` → `reducedVfx`, and Phaser
> particles with the documented caps. Then run:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Fix failures in your owned files only. Update `src/lib/studio/README.md`, append a
> handoff to `docs/agent-log.md` using `best-practices.md` §6.3, and report caps +
> reduced-motion behaviour in your summary.
