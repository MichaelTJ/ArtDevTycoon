# Spec 21e — Ambient life & comedy systems (bark bubbles)

**Worktree:**

```powershell
git worktree add -b agent/studio-ambient ../adt-wt-studio-ambient main
New-Item -ItemType Junction -Path ../adt-wt-studio-ambient/node_modules -Target ./node_modules
```

**Depends on:** Spec **21a** (staff floor targets + `hiredRoleIds` on `StudioSnapshot`) merged
or available on the implementation branch. Spec **21b** is ideal but **not required** —
barks do not need interactable props. If 21a staff sprites are absent, **Mum-only barks
still ship** (kitchen resident always exists from Spec 19).

**Wave:** I (after Wave G — 21a/21b). Boss plan R5: only this agent edits
`StudioScene.ts` while ambient lands. Does **not** depend on 05–11 (AI engines).
**Does not** depend on 21c audio — MAY emit optional cue ids for a later audio consumer.

**Catalog source:** `docs/tasks/21-living-studio.md` §E + shortlist item **E1**.

---

## Mission

The kitchen has Mum pacing and (after 21a) hired staff on the floor, but nobody
_says_ anything unless the player starts a commission. The loop feels silent and thin.

This spec adds **ambient comedy lines** — one-line thought / speech bubbles on a timer,
drawn from curated data pools with **no LLM**. Bubbles are presentation only: they never
change cash, reputation, briefs, or unlocks. They pause while commission UI needs the
screen (briefing / generating / critiquing / results) so they cannot cover prompts or
panels.

MVP is **E1** only. Catalog extras E2–E7 are documented as MAY / follow-up / out of
scope for v1 so implementers do not invent phone rings or photo mode in this slice.

Product constraints (from `best-practices.md` §8):

1. Playable with `mock` and zero AI.
2. Never block the player on bark timing or missing assets.
3. Level 1 prompt modifiers stay invisible.
4. Presentation-only flavour pools — money and unlock tables stay in specs 12–16.

---

## Ownership zone

```
New:
  src/lib/data/barks.ts
  src/lib/data/barks.test.ts
  src/lib/studio/barkPicker.ts
  src/lib/studio/barkPicker.test.ts
  src/lib/studio/barkPresenter.ts          ← Phaser bubble attach helpers (pure-ish)
  src/lib/components/BarkLiveRegion.svelte ← aria-live caption channel
  src/lib/components/BarkLiveRegion.svelte.test.ts
  docs/tasks/21e-ambient-events.md         ← this file (DoD ticks only after impl)

Edit:
  src/lib/data/README.md                   ← document barks public surface
  src/lib/studio/scenes/StudioScene.ts     ← timer tick + show/hide bubbles; phase gate
  src/lib/studio/bridge.ts                 ← additive ONLY if cue/outbound needed (§3.3)
  src/lib/studio/bridge.test.ts            ← if bridge touched
  src/lib/studio/README.md                 ← bark invariants + phase pause table
  src/lib/components/StudioFloor.svelte    ← mount BarkLiveRegion; wire live text
  src/lib/components/StudioFloor.svelte.test.ts
  src/lib/components/index.ts              ← export BarkLiveRegion if barrel used
  docs/agent-log.md                        ← handoff
```

**MUST NOT** edit:

- `package.json`, lockfiles, vite/tsconfig/eslint/prettier configs
- `src/lib/types/contracts.ts`
- `src/lib/game/**` (economy, scoring, skills, save)
- Engine files under `src/lib/engines/**`
- Audio beds / `src/lib/audio/**` (21c) — optional cue **ids** only, no decode
- Shop / staff **economy** tables beyond read-only imports of role ids for speaker tags
- Spec 19 room builders (`rooms.ts` / `venueRooms.ts`) unless a one-line bark
  anchor comment is unavoidable — prefer attaching bubbles to existing sprites

**Orchestrator-owned forever:** see `best-practices.md` §2.1.

---

## Shared bridge contract (frozen with Wave G)

Copy of the boss-plan additive fields. 21e **reads** these; it does not invent competing
names. If they are missing on the branch, stop and report — do not redefine them.

```ts
// Additive StudioSnapshot fields (defaults keep old clients working)
hiredRoleIds: readonly string[];      // e.g. 'apprentice' | 'curator' | 'marketing-director'
audioEnabled: boolean;                // master; 21c
reducedVfx: boolean;                  // 21d/21f
```

21e uses:

| Field          | Use                                                             |
| -------------- | --------------------------------------------------------------- |
| `phase`        | Gate whether barks may fire (§4)                                |
| `hiredRoleIds` | Which staff speakers are eligible (empty → Mum-only)            |
| `client`       | Optional visitor speaker in follow-up E1+; **not required** MVP |
| `audioEnabled` | If false, still show text bubbles; skip emitting audio cue ids  |
| `reducedVfx`   | Shorter bubble lifetime / no float tween when true              |

---

## 1. Required MVP — E1 Bark / thought bubbles

### 1.1 Player-facing behaviour

- While the studio floor is active and `phase` allows ambient life (§4), Mum (and any
  **present** staff from 21a) occasionally show a **one-line** bubble above their head.
- Lines come from a **static data pool** — never from an LLM, never from the player
  prompt, never from critique prose.
- At most **one bubble visible at a time** globally (avoids comic spam in the kitchen).
- Interval between attempts is jittered (§2.3); missing sprites → that speaker is skipped,
  Mum still barks.
- If staff are not on the floor yet (21a not merged / no hires), ship **Mum-only**.

### 1.2 Visual presentation

Prefer **Phaser text** attached to the speaker sprite (follows wander). Acceptable
alternative: a thin Svelte overlay positioned from bridge-reported world coords — but
MVP **SHOULD** stay in Phaser so bubbles track Mum without a new outbound stream.

Bubble rules:

- Max ~42 characters per line (authoring soft cap; picker does not truncate — pools
  **MUST** stay within the cap).
- Lifetime: **2.8 s** default; **1.4 s** when `reducedVfx` / `prefers-reduced-motion`.
- Fade in/out ≤ 200 ms; reduced-motion → hard show/hide.
- Depth above sprites; never block the E interact prompt (offset bubble +18 px above
  the prompt or hide bubble while prompt is visible on that NPC — **pick hide-while-
  prompt** for simplicity).

### 1.3 Accessibility — DOM live region (chosen)

**Chosen approach:** a visually hidden (or screen-reader-oriented) Svelte
`aria-live="polite"` region mounted beside the studio canvas.

Rationale vs caption toggle: bark lines are ephemeral; a live region announces each
line without a new settings surface (settings belong to 21c). Sighted players still
see Phaser bubbles.

```svelte
<!-- BarkLiveRegion.svelte — sketch -->
<div class="bark-live" aria-live="polite" aria-atomic="true">
	{#if line}{speakerLabel}: {line}{/if}
</div>
```

Wiring:

1. When Phaser (or picker consumer) commits a bark, set live-region text to
   `"{Speaker}: {line}"` (e.g. `Mum: Don't forget lunch.`).
2. Clear the live region when the bubble expires (empty string) so the next bark
   re-announces.
3. `StudioFloor` owns the component mount; Phaser notifies via a tiny bridge outbound
   **or** a callback registered on the game registry — see §3.3.

**MUST NOT** rely on canvas pixels for accessibility.

---

## 2. Data pools & picker API

### 2.1 Pools — `src/lib/data/barks.ts`

Flavour content lives with other curated pools (same pattern as briefs / atmosphere).

```ts
/** Who may speak a bark. Staff ids match STAFF_ROLES / hiredRoleIds. */
export type BarkSpeakerId = 'mum' | 'apprentice' | 'curator' | 'marketing-director' | 'visitor'; // reserved; unused in MVP

export interface BarkLine {
	/** Stable id for tests and dedupe. */
	id: string;
	speaker: BarkSpeakerId;
	/** One line, ≤ 42 chars. Comedy, kitchen-safe, no spoilers of modifiers. */
	text: string;
	/**
	 * Optional audio cue id for Spec 21c later. 21e MAY emit this string on the
	 * bridge when audioEnabled; MUST NOT load or play audio itself.
	 */
	cueId?: string;
}

export const BARK_POOL: readonly BarkLine[] = [
	// Mum — kitchen resident (MVP baseline; ≥ 8 lines)
	{ id: 'mum-01', speaker: 'mum', text: "Don't forget lunch.", cueId: 'bark.mum.01' },
	{ id: 'mum-02', speaker: 'mum', text: 'The fridge is judging you.', cueId: 'bark.mum.02' },
	{ id: 'mum-03', speaker: 'mum', text: 'Paint something nice, love.' },
	{ id: 'mum-04', speaker: 'mum', text: 'Is that supposed to be modern?' },
	{ id: 'mum-05', speaker: 'mum', text: 'Mind the wet floor.' },
	{ id: 'mum-06', speaker: 'mum', text: 'Your aunt would buy that.' },
	{ id: 'mum-07', speaker: 'mum', text: 'Tea first. Then genius.' },
	{ id: 'mum-08', speaker: 'mum', text: "I'm not posing for this." },

	// Staff — only eligible when hired + sprite present (21a)
	{ id: 'app-01', speaker: 'apprentice', text: 'Another common. Got it.' },
	{ id: 'app-02', speaker: 'apprentice', text: 'Do I get a lunch break?' },
	{ id: 'cur-01', speaker: 'curator', text: 'Hang it higher. Trust me.' },
	{ id: 'cur-02', speaker: 'curator', text: 'The lighting is… intentional.' },
	{ id: 'md-01', speaker: 'marketing-director', text: 'I already invited someone.' },
	{ id: 'md-02', speaker: 'marketing-director', text: 'Smile. Foot traffic.' }
] as const;

export function linesForSpeaker(speaker: BarkSpeakerId): readonly BarkLine[] {
	return BARK_POOL.filter((b) => b.speaker === speaker);
}

/** Human label for live region / captions. */
export function barkSpeakerLabel(speaker: BarkSpeakerId): string {
	switch (speaker) {
		case 'mum':
			return 'Mum';
		case 'apprentice':
			return 'Apprentice';
		case 'curator':
			return 'Curator';
		case 'marketing-director':
			return 'Marketing Director';
		case 'visitor':
			return 'Visitor';
	}
}
```

Authoring invariants (assert in `barks.test.ts`):

- Every `text.length <= 42`.
- Every `id` unique.
- Mum pool length ≥ 8.
- No line mentions hidden modifiers, API keys, or engine tier names.
- `print-shop` is **not** a floor speaker (online automation) — do not add it.

### 2.2 Picker — `src/lib/studio/barkPicker.ts`

Pure functions. Injected `random` and `nowMs` for deterministic tests (same pattern as
`pickBrief`).

```ts
import type { BarkLine, BarkSpeakerId } from '$lib/data/barks';
import { BARK_POOL, linesForSpeaker } from '$lib/data/barks';

export interface BarkPickerInput {
	/** Speakers that currently exist on the floor. Mum-only → ['mum']. */
	eligibleSpeakers: readonly BarkSpeakerId[];
	/** Last bark id shown; avoid immediate repeat when pool ≥ 2. */
	lastBarkId?: string | null;
	/** Injected RNG in [0, 1). Default Math.random. */
	random?: () => number;
}

export interface BarkPick {
	line: BarkLine;
	speaker: BarkSpeakerId;
}

/**
 * Pick speaker uniformly from eligibleSpeakers, then a line from that speaker's
 * pool. If the only line equals lastBarkId and pool size > 1, draw again once.
 * Returns null when no eligible speaker has any lines.
 */
export function pickBark(input: BarkPickerInput): BarkPick | null;

export interface BarkScheduleConfig {
	/** Minimum ms between bark *attempts* while ambient is allowed. */
	minIntervalMs: number;
	/** Maximum ms between attempts. */
	maxIntervalMs: number;
}

export const DEFAULT_BARK_SCHEDULE: BarkScheduleConfig = {
	minIntervalMs: 8_000,
	maxIntervalMs: 16_000
};

/**
 * Next delay until an attempt. Uses random in [0,1) → lerp min..max.
 * Tests pin exact values with a constant random.
 */
export function nextBarkDelayMs(
	config: BarkScheduleConfig = DEFAULT_BARK_SCHEDULE,
	random: () => number = Math.random
): number;

/**
 * True when ambient barks may fire for this phase.
 * MVP: only `idle`. See §4.
 */
export function barksAllowedForPhase(phase: string): boolean;
```

Speaker eligibility helper (pure; StudioScene supplies presence):

```ts
/**
 * Build eligible speakers from snapshot + who is actually spawned.
 * - Always include 'mum' if Mum sprite exists.
 * - Include staff speaker when role id is in hiredRoleIds AND sprite exists.
 * - Map hired id 'marketing-director' → speaker 'marketing-director'.
 * - Never include 'visitor' in MVP.
 */
export function eligibleBarkSpeakers(input: {
	hasMum: boolean;
	hiredRoleIds: readonly string[];
	presentStaffIds: readonly string[];
}): BarkSpeakerId[];
```

### 2.3 Schedule algorithm (StudioScene)

On each update while the scene is running:

1. If `!barksAllowedForPhase(snapshot.phase)` → hide active bubble, clear live region
   via bridge/callback, **do not** advance toward a new bark (freeze or reset the
   countdown — **prefer reset** so returning to idle waits a full interval).
2. Else accumulate / countdown `nextAttemptAt`.
3. On attempt: `eligible = eligibleBarkSpeakers(...)`; `pick = pickBark({ eligibleSpeakers: eligible, lastBarkId, random })`.
4. If `pick == null`, reschedule delay and continue.
5. If interact prompt is visible on that speaker, skip show and reschedule (short
   1.5 s retry).
6. Else show bubble + push live-region text; store `lastBarkId`; schedule
   `nextBarkDelayMs()`.
7. On bubble expiry → hide Phaser text; clear live region.

Default `random` in production: `Math.random`. Tests never call the scene timer with
wall clocks — unit-test picker/schedule only.

---

## 3. Bridge / overlay seams

### 3.1 Prefer minimal bridge churn

If Phaser can update a Svelte live region without a new event type (e.g.
`StudioFloor` passes `onBark?: (payload) => void` into `createPhaserGame` /
registry), prefer that. Only extend `StudioOutboundEvent` when necessary:

```ts
// Additive — only if callback injection is awkward
| { type: 'npc-bark'; speakerId: string; text: string; cueId?: string }
```

Inbound: **none** for MVP. Do not add `spawn-bark`.

### 3.2 Optional cue ids for 21c

When showing a bark with `cueId` and `snapshot.audioEnabled === true`, include
`cueId` on the outbound/callback payload. **MUST NOT** play audio in 21e.

### 3.3 Snapshot fields

Do **not** add bark-specific snapshot fields. Phase + hiredRoleIds are enough.

---

## 4. Phase pause table

| `GamePhase`     | Barks allowed? | Notes                    |
| --------------- | -------------- | ------------------------ |
| `idle`          | **yes**        | Ambient life             |
| `briefing`      | **no**         | Prompt UI / talk focus   |
| `generating`    | **no**         | Desk work + progress bar |
| `critiquing`    | **no**         | Critic beat              |
| `results`       | **no**         | Collect / deliver UI     |
| `failed`        | **no**         | Error UI                 |
| `levelComplete` | **no**         | Win modal                |

`barksAllowedForPhase` returns true **only** for `'idle'` in v1. Document that
follow-ups MAY allow quiet idle-like moments later; do not freestyle.

On transition out of `idle`: immediately hide any visible bubble and clear the live
region so lines cannot linger over BriefPanel / ResultsPanel.

---

## 5. Catalog extras (E2–E7) — not required

| #   | Feature            | Status for this spec                                        |
| --- | ------------------ | ----------------------------------------------------------- |
| E2  | Phone rings        | **MAY / follow-up** — separate slice; needs UI modal        |
| E3  | Noise complaint    | **MAY / follow-up** — idle-timer joke; flavour only         |
| E4  | Opening night      | **Out of scope for v1** — needs venue-unlock toast owner    |
| E5  | Series wall plaque | **Out of scope for v1** — prop + save decision (21b/15)     |
| E6  | Tutorial ghosts    | **Out of scope for v1** — needs save flag / contracts touch |
| E7  | Photo mode         | **Out of scope for v1** — ties D9; freeze NPCs              |

Implementers **MUST NOT** build E2–E7 in the 21e worktree unless the orchestrator
expands this file. Leave clean seams only (e.g. `cueId` already covers VO later).

---

## 6. Test tables

### 6.1 `barks.test.ts`

| Assertion                                | Expected               |
| ---------------------------------------- | ---------------------- |
| Every `BARK_POOL` entry `text.length`    | `≤ 42`                 |
| `new Set(BARK_POOL.map(b => b.id)).size` | `=== BARK_POOL.length` |
| `linesForSpeaker('mum').length`          | `≥ 8`                  |
| `barkSpeakerLabel('mum')`                | `'Mum'`                |
| `barkSpeakerLabel('marketing-director')` | `'Marketing Director'` |
| No pool speaker is `'print-shop'`        | pass                   |

### 6.2 `barkPicker.test.ts` — seeded / injected random

Use a tiny stub RNG:

```ts
function seq(values: number[]): () => number {
	let i = 0;
	return () => values[Math.min(i++, values.length - 1)]!;
}
```

| Call                                                                                                    | Expected                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `barksAllowedForPhase('idle')`                                                                          | `true`                                                                                                                                                                                                                                                                            |
| `barksAllowedForPhase('briefing')`                                                                      | `false`                                                                                                                                                                                                                                                                           |
| `barksAllowedForPhase('generating')`                                                                    | `false`                                                                                                                                                                                                                                                                           |
| `barksAllowedForPhase('critiquing')`                                                                    | `false`                                                                                                                                                                                                                                                                           |
| `barksAllowedForPhase('results')`                                                                       | `false`                                                                                                                                                                                                                                                                           |
| `barksAllowedForPhase('failed')`                                                                        | `false`                                                                                                                                                                                                                                                                           |
| `eligibleBarkSpeakers({ hasMum: true, hiredRoleIds: [], presentStaffIds: [] })`                         | `['mum']`                                                                                                                                                                                                                                                                         |
| `eligibleBarkSpeakers({ hasMum: true, hiredRoleIds: ['apprentice'], presentStaffIds: ['apprentice'] })` | includes `'mum'` and `'apprentice'`                                                                                                                                                                                                                                               |
| `eligibleBarkSpeakers({ hasMum: true, hiredRoleIds: ['apprentice'], presentStaffIds: [] })`             | `['mum']` only (sprite absent)                                                                                                                                                                                                                                                    |
| `pickBark({ eligibleSpeakers: ['mum'], random: seq([0]) })`                                             | first Mum line in `linesForSpeaker('mum')` (index 0)                                                                                                                                                                                                                              |
| `pickBark({ eligibleSpeakers: ['mum'], random: seq([0.99]) })`                                          | last Mum line (clamped index)                                                                                                                                                                                                                                                     |
| `pickBark({ eligibleSpeakers: [], random: () => 0 })`                                                   | `null`                                                                                                                                                                                                                                                                            |
| Avoid immediate repeat: pool ≥ 2, `lastBarkId` = first Mum id, `random` always picks index 0            | second draw yields a different id                                                                                                                                                                                                                                                 |
| `nextBarkDelayMs(DEFAULT_BARK_SCHEDULE, () => 0)`                                                       | `8000`                                                                                                                                                                                                                                                                            |
| `nextBarkDelayMs(DEFAULT_BARK_SCHEDULE, () => 1)`                                                       | treat as max — implement with `min + random() * (max - min)` so `random→1` may equal `16000` if using inclusive lerp; **pin the formula in code** and match the test to that formula. Prefer `min + random() * (max - min)` and test `random→0` → `8000`, `random→0.5` → `12000`. |

**Example bark picks (literal — author the pool so these ids exist):**

| RNG sequence (speaker then line) | Eligible                              | Pick id  | Text (exact)              |
| -------------------------------- | ------------------------------------- | -------- | ------------------------- |
| speaker `0`, line `0`            | `['mum']`                             | `mum-01` | `Don't forget lunch.`     |
| speaker `0`, line `0`            | `['mum','apprentice']` + `seq([0,0])` | `mum-01` | `Don't forget lunch.`     |
| speaker `0.6`, line `0`          | `['mum','apprentice']` (2 speakers)   | `app-01` | `Another common. Got it.` |

Speaker index formula (literal):

```ts
const si = Math.min(Math.floor(random() * speakers.length), speakers.length - 1);
```

Line index formula (literal):

```ts
const pool = linesForSpeaker(speaker);
const li = Math.min(Math.floor(random() * pool.length), pool.length - 1);
```

### 6.3 `BarkLiveRegion.svelte.test.ts`

| Scenario                                                    | Expected                                    |
| ----------------------------------------------------------- | ------------------------------------------- |
| Mount with `line={null}` / empty                            | live region present; no speaker text        |
| Props `speakerLabel="Mum"` `line="Tea first. Then genius."` | accessible text includes `Mum` and the line |
| Clear line after announce                                   | region empties (no stale text)              |

Assert with accessible role/text, not CSS class names (`best-practices.md` §3.2).

### 6.4 Scene behaviour (lightweight)

Prefer pure helpers over constructing `Phaser.Game`. If a small `barkPresenter` helper
exposes `shouldShowBark({ phase, promptVisible })`, unit-test:

| Input                                         | Expected |
| --------------------------------------------- | -------- |
| `{ phase: 'idle', promptVisible: false }`     | show OK  |
| `{ phase: 'idle', promptVisible: true }`      | skip     |
| `{ phase: 'briefing', promptVisible: false }` | skip     |

---

## 7. Files & wiring checklist

1. Author `BARK_POOL` + helpers in `src/lib/data/barks.ts`.
2. Implement `barkPicker.ts` with injected random + phase gate.
3. StudioScene: countdown, pick, attach Phaser `Text` (or BitmapText) above speaker;
   hide on phase change / prompt conflict.
4. Mount `BarkLiveRegion` from `StudioFloor`; feed text on each bark.
5. Update `src/lib/data/README.md` public-surface table.
6. Update `src/lib/studio/README.md` with phase pause table + “no LLM” invariant.
7. Handoff in `docs/agent-log.md`.

---

## 8. Definition of done

- [x] Mum shows ambient one-line bubbles during `idle` from `BARK_POOL` (no LLM).
- [x] When 21a staff sprites + `hiredRoleIds` are present, those speakers also bark;
      when absent, Mum-only still works.
- [x] Barks pause / clear for `briefing`, `generating`, `critiquing`, `results`,
      `failed`, and `levelComplete`.
- [x] At most one bubble at a time; schedule uses injected/seeded random in tests.
- [x] `BarkLiveRegion` announces `Speaker: line` via `aria-live="polite"`.
- [x] Unit tests cover pool invariants, picker tables, schedule delays, phase gate.
- [x] Component test covers live region.
- [x] Optional `cueId` may be forwarded; **no** audio decode/playback in this zone.
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for owned files.
- [x] Data + studio READMEs updated; `docs/agent-log.md` handoff appended.
- [x] No edits outside the ownership zone; no `contracts.ts` / economy changes.

---

## 9. Explicitly out of scope

- E2 phone rings, E3 noise complaint, E4 opening night, E5 plaques, E6 tutorial
  ghosts, E7 photo mode (see §5).
- Economy, payouts, skill XP, save keys, shop unlock tables.
- Audio beds, VO decode, settings sliders (21c) — cue ids only.
- LLM / remote flavour generation.
- Visitor barks (door clients) — reserved speaker id only.
- Changing Mum patrol / pathfinding (21f).
- New npm dependencies.
- Editing `src/lib/types/contracts.ts`.

---

## 10. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/21e-ambient-events.md`.
>
> **Worktree (orchestrator creates before you start):**
> `../adt-wt-studio-ambient` on branch `agent/studio-ambient`.
> Absolute path example:
> `C:\Users\JensenM\Documents\My Apps\adt-wt-studio-ambient`
>
> Read these files completely before writing any code:
>
> 1. `best-practices.md` — the binding rules for this repo
> 2. `docs/architecture.md` — how the system fits together
> 3. `src/lib/types/contracts.ts` — frozen types (do not edit)
> 4. `docs/tasks/21e-ambient-events.md` — your spec
> 5. `docs/tasks/21-living-studio.md` — §E context
> 6. `src/lib/studio/README.md` + `src/lib/studio/bridge.ts` + Mum flow in `StudioScene.ts`
> 7. `src/lib/data/README.md` — where flavour pools live
> 8. `docs/agent-log.md` — latest 21a handoff (staff targets / `hiredRoleIds`)
>
> **Depends on 21a:** staff floor presence + `hiredRoleIds`. If staff are missing, ship
> Mum-only barks. If `hiredRoleIds` is not on `StudioSnapshot` yet, stop and report —
> do not invent a competing field name.
>
> The spec lists exactly which files to create and which paths you own. Do not create
> or modify any file outside your ownership zone. Do not edit `package.json`,
> `vite.config.ts`, `tsconfig.json`, or `src/lib/types/**`. Do not run `npm install`.
> Do not run any state-changing git command — no commit, add, checkout, merge, or push.
>
> Implement E1 only (pools, picker, Phaser bubbles, live region, phase pause). Do not
> implement E2–E7. Then run all three of these and fix anything they report in your
> own files:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Finally, update `src/lib/data/README.md` and `src/lib/studio/README.md`, and append
> your handoff entry to `docs/agent-log.md` using the template in
> `best-practices.md` §6.3.
