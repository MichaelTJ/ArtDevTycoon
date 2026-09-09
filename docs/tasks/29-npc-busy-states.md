# Spec 29 — NPC busy states, walk-during-critique, attention marks

**Worktree:**
`git worktree add -b feat/npc-busy-states ../adt-wt-npc-busy main`
then junction `node_modules` per `best-practices.md` §2.2.

**This worktree already exists:**
`C:\Users\JensenM\Documents\My Apps\adt-wt-npc-busy` on `feat/npc-busy-states`
(branched from `main` at `53ea4de`). **Work only in that directory.**

**Depends on:** Specs 17–21f, 24/P27 commission channels, Spec 28 practice, EngineStore
`isBusy` (P19). Does **not** edit engine workers or `contracts.ts`.

**Priority:** Presentation + tiny store/page glue. Never block walking or practice on a
model; only block _starting a commission_.

---

## Mission

When a real art engine is loading (Janus restore, SD-Turbo, My PC connect — anything
that sets `EngineStore.isBusy`), Mum must not hand the player a commission. She (and
the right-hand commission desk) say she is busy and point the player at **Practice**.
A small spinner sits in the bottom-right of the studio shell.

After the player picks which image to critique, they must be able to **walk immediately**.
Talking to Mum (or the door visitor) during `critiquing` is flavour only — she is still
looking. When the critique is done, a `!` appears over her head. The same `!` appears
when she (or a later-venue channel) is ready to give a job.

Later venues get the same gates with channel-specific copy (letterbox / computer /
receptionist / door visitor).

Product constraints (`best-practices.md` §8):

1. Playable with `mock` (mock is never busy after init — no spinner, no busy Mum).
2. Never dead-end the player on a model — walking + Practice stay available.
3. Level 1 modifiers stay invisible.
4. Phaser never imports `GameStore` or engines. Gate Phaser on a boolean snapshot
   field, **not** an engine id. Architecture corollary: do not branch on which engine
   is active outside the engine-display UI; `isBusy` + `activeDisplayName` on the
   spinner are display, not game rules.

---

## Ownership zone

```
New:
  docs/tasks/29-npc-busy-states.md          ← this file (DoD ticks after impl)
  src/lib/data/npcBusyDialogue.ts
  src/lib/data/npcBusyDialogue.test.ts
  src/lib/studio/npcAttention.ts
  src/lib/studio/npcAttention.test.ts
  src/lib/components/EngineLoadSpinner.svelte
  src/lib/components/EngineLoadSpinner.svelte.test.ts

Edit:
  src/lib/studio/bridge.ts                  ← additive snapshot fields only
  src/lib/studio/bridge.test.ts             ← fixture defaults
  src/lib/studio/scenes/StudioScene.ts      ← desk-lock, talk during critique, ! mark
  src/lib/studio/README.md
  src/lib/data/README.md
  src/lib/components/StudioHudOverlay.svelte
  src/lib/components/StudioHudOverlay.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  src/lib/stores/gameState.svelte.ts        ← public rescheduleAutoInvite() only
  src/lib/stores/gameState.svelte.test.ts   ← that method only
  src/lib/stores/README.md                  ← one-line public-surface note
  src/routes/+page.svelte                   ← summon/talk/reception gates + spinner
  docs/tasks/README.md                      ← table row for spec 29
  docs/agent-log.md                         ← handoff
```

**MUST NOT** edit:

- `package.json`, lockfiles, vite/tsconfig/eslint/prettier, `.gitignore`
- `src/lib/types/contracts.ts`
- `src/lib/engines/**` (no worker / registry / manager changes)
- `src/lib/studio/rooms.ts` / venue layouts (user is editing venues on `main`)
- Shop unlock tables, scoring, save schema
- New npm dependencies

**Orchestrator-owned forever:** see `best-practices.md` §2.1.

---

## Shared bridge contract (additive)

```ts
// Additive StudioSnapshot fields (defaults keep old clients working)
modelLoading: boolean; // true when EngineStore.isBusy; Phaser MUST NOT read engine ids
```

`residentClientArmed`, `phase`, `commissionChannel`, `client` stay as today.

No new outbound event types. `talk-to-client` and `open-reception` still fire; Svelte
decides whether they start a job.

---

## 1. Dialogue pool — `src/lib/data/npcBusyDialogue.ts`

Static curated lines. **No LLM.** Soft cap 90 characters for the main text (HUD, not
bark 42-cap). Footnote is a separate string.

```ts
import { commissionChannelForVenue, type CommissionChannel } from '$lib/game/commissionChannel';

export type NpcBusyReason = 'model-loading' | 'critiquing';

/** Who is speaking / which idle channel the player poked. */
export type NpcBusyChannel = 'mum' | 'letterbox' | 'computer' | 'receptionist' | 'visitor';

export interface NpcBusyLine {
	/** Visible speaker, e.g. 'Mum'. */
	speaker: string;
	/** Main sentence. */
	text: string;
	/** Second line under the text; null when unused. */
	footnote: string | null;
}

export const MODEL_LOADING_FOOTNOTE = '(model loading)' as const;

/**
 * Map venue → idle busy channel.
 * Kitchen (`fridge`) is always Mum. Higher venues use P27 channels.
 * Unknown venue ids → 'visitor'.
 */
export function busyChannelForVenue(venueId: string): NpcBusyChannel;

/**
 * Line for HUD + (optional) Phaser bark.
 * `talkIndex` rotates critiquing pools (and is ignored when the pool has one line).
 * Default talkIndex = 0.
 */
export function npcBusyLine(input: {
	reason: NpcBusyReason;
	channel: NpcBusyChannel;
	talkIndex?: number;
}): NpcBusyLine;
```

### 1.1 `busyChannelForVenue` table (literal)

| `venueId`        | Result           |
| ---------------- | ---------------- |
| `'fridge'`       | `'mum'`          |
| `'garage'`       | `'letterbox'`    |
| `'storefront'`   | `'computer'`     |
| `'gallery-hall'` | `'receptionist'` |
| `'mega-museum'`  | `'receptionist'` |
| `'nope'`         | `'visitor'`      |

Implement via `commissionChannelForVenue` plus a `fridge` → Mum special case. Do not
duplicate the P27 switch except for the kitchen override.

### 1.2 `npcBusyLine` table (literal)

`talkIndex` uses `Math.abs(talkIndex) % pool.length`. Missing/`undefined` → `0`.

**`reason: 'model-loading'`** — footnote is always `MODEL_LOADING_FOOTNOTE`. One line each:

| channel        | speaker        | text (exact)                                                                   |
| -------------- | -------------- | ------------------------------------------------------------------------------ |
| `mum`          | `Mum`          | `Sorry hun, I'm just busy for a second. Maybe you want to practice for a bit.` |
| `letterbox`    | `Letterbox`    | `Hold on — the post's still warming up.`                                       |
| `computer`     | `Inbox`        | `Inbox is still connecting. Give it a second.`                                 |
| `receptionist` | `Receptionist` | `I'm on a call with the next client — one moment.`                             |
| `visitor`      | `Client`       | `Give me one second — I'm not ready yet.`                                      |

**`reason: 'critiquing'`** — footnote is always `null`. Rotate:

| channel                                               | talkIndex % n | speaker  | text (exact)                                                 |
| ----------------------------------------------------- | ------------- | -------- | ------------------------------------------------------------ |
| `mum`                                                 | 0             | `Mum`    | `Wow! Let me make sure I see all your beautiful work!`       |
| `mum`                                                 | 1             | `Mum`    | `I'm just taking it all in, I'll let you know when I'm done` |
| `visitor` / `letterbox` / `computer` / `receptionist` | 0             | `Client` | `Give me a minute — I want to really look at this.`          |
| same four                                             | 1             | `Client` | `Don't hover. I'll tell you when I've decided.`              |

Critiquing on letterbox/computer/receptionist uses the **visitor** two-line pool (the
person looking at the art is the door client, not the inbox). Tests may call
`npcBusyLine({ reason: 'critiquing', channel: 'letterbox', talkIndex: 0 })` and still
expect the visitor line + speaker `'Client'`.

Authoring invariants (`npcBusyDialogue.test.ts`):

- Every `text.length <= 90`.
- Every model-loading footnote === `'(model loading)'`.
- Every critiquing footnote === `null`.
- No line mentions hidden modifiers, API keys, or engine ids (`janus`, `WebGPU`, etc.).

### 1.3 Critiquing HUD channel

While `phase === 'critiquing'`, the desk speaker is:

- `'mum'` when `currentClient.clientName === 'Mum'`
- `'visitor'` otherwise

Do **not** use `busyChannelForVenue` for critiquing copy (garage Mum-less jobs are
visitors even though the idle channel is letterbox).

---

## 2. Attention helper — `src/lib/studio/npcAttention.ts`

Pure. Phaser and tests import this; Svelte does not need it.

```ts
import type { GamePhase } from '$lib/types/contracts';

export type NpcAttention = 'none' | 'ready-commission' | 'critique-ready';

/**
 * Desk-lock: player snapped to desk, walk/interact disabled.
 * ONLY `generating` — not `critiquing`.
 */
export function playerDeskLocked(phase: GamePhase | string): boolean;

/**
 * `!` over the commission NPC / channel sprite.
 * - results → critique-ready (always, even if modelLoading — load cannot start mid-critique
 *   because the engine menu is locked; still pin the results row with modelLoading true)
 * - idle + readyForCommission + !modelLoading → ready-commission
 * - else none
 */
export function npcAttention(input: {
	phase: GamePhase | string;
	modelLoading: boolean;
	readyForCommission: boolean;
}): NpcAttention;

/**
 * Hide the `!` while the E verb is showing on that same NPC so they do not stack.
 */
export function showAttentionMark(attention: NpcAttention, promptOnNpc: boolean): boolean;
```

### 2.1 Test table (literal)

| Call                                                                                 | Expected             |
| ------------------------------------------------------------------------------------ | -------------------- |
| `playerDeskLocked('generating')`                                                     | `true`               |
| `playerDeskLocked('critiquing')`                                                     | `false`              |
| `playerDeskLocked('idle')`                                                           | `false`              |
| `playerDeskLocked('briefing')`                                                       | `false`              |
| `playerDeskLocked('results')`                                                        | `false`              |
| `npcAttention({ phase:'idle', modelLoading:true, readyForCommission:true })`         | `'none'`             |
| `npcAttention({ phase:'idle', modelLoading:false, readyForCommission:true })`        | `'ready-commission'` |
| `npcAttention({ phase:'idle', modelLoading:false, readyForCommission:false })`       | `'none'`             |
| `npcAttention({ phase:'critiquing', modelLoading:false, readyForCommission:false })` | `'none'`             |
| `npcAttention({ phase:'results', modelLoading:false, readyForCommission:false })`    | `'critique-ready'`   |
| `npcAttention({ phase:'results', modelLoading:true, readyForCommission:false })`     | `'critique-ready'`   |
| `showAttentionMark('ready-commission', false)`                                       | `true`               |
| `showAttentionMark('ready-commission', true)`                                        | `false`              |
| `showAttentionMark('none', false)`                                                   | `false`              |

---

## 3. GameStore — `rescheduleAutoInvite()`

Public wrapper around `#scheduleAutoInvite`. Needed because `+page` no-ops `summonClient`
while `engines.isBusy`; the one-shot auto-invite timer has already fired and would never
retry.

```ts
/** Re-run the idle auto-invite timer. No-op when phase !== 'idle' or practice is open. */
rescheduleAutoInvite(): void;
```

Implementation: `this.#scheduleAutoInvite();`

Unit test: construct a `GameStore` with a fake `autoInviteAction` + fake `now`, call
`rescheduleAutoInvite` while idle, assert the action runs after the delay (reuse the
existing auto-invite timer test style in `gameState.svelte.test.ts`). If no delay-based
test exists, a smoke test that calling it while `phase === 'idle'` does not throw and
does not change `phase` is enough — plus calling it during `briefing` does not invite.

**MUST NOT** otherwise change invite / payout / save behaviour.

---

## 4. `+page.svelte` wiring

`modelLoading` is `engines.isBusy`.

### 4.1 `syncStudio`

Pass `modelLoading: engines.isBusy` on every snapshot. Include `engines.isBusy` in the
`$effect` that already re-syncs on phase/client/venue.

### 4.2 `summonClient`

```
if (engines.isBusy) {
  game.rescheduleAutoInvite();
  return;
}
```

before the existing `phase !== 'idle' \|\| clientSummoned` guard (or immediately after
the idle check, still **before** `clientSummoned = true`). Must not send `summon-client`.
Must not set `clientSummoned`.

### 4.3 `talkToClient`

Order of checks:

1. If `game.phase === 'critiquing'` → increment `npcTalkIndex` (see §4.6). Return.
   Do **not** invite, dismiss, or collect.
2. If `game.phase !== 'idle'` → return (unchanged).
3. If `engines.isBusy` → increment `npcTalkIndex`. Return. Do **not** `inviteClient()`.
4. Else existing invite + possible `spawn-visitor`.

### 4.4 `openReceptionDesk`

If `engines.isBusy` → increment `npcTalkIndex`, return, do not open the board.
Existing `commissionBoardAvailable` / `phase === 'idle'` guards stay.

### 4.5 Spinner

Mount `EngineLoadSpinner` on **both** studio-floor and CSS-kitchen branches of the
page, fixed to the bottom-right of the viewport (or the studio shell — visual
bottom-right of the game view). Show when `engines.isBusy`.

```svelte
<EngineLoadSpinner
	visible={engines.isBusy}
	label={`Loading ${engines.activeDisplayName}…`}
	reducedMotion={reducedVfx}
/>
```

`reducedVfx` is already on the page from `prefers-reduced-motion`.

### 4.6 HUD props

Pass into `StudioHudOverlay` (both mounts):

- `modelLoading={engines.isBusy}`
- `busyLine` — `$derived.by`:
  - if `engines.isBusy` && `game.phase === 'idle'` → `npcBusyLine({ reason:'model-loading', channel: busyChannelForVenue(game.unlockedVenueId), talkIndex: npcTalkIndex })`
  - else if `game.phase === 'critiquing'` → `npcBusyLine({ reason:'critiquing', channel: game.currentClient?.clientName === 'Mum' ? 'mum' : 'visitor', talkIndex: npcTalkIndex })`
  - else `null`

`npcTalkIndex` is `$state(0)`, incremented on busy/critique talk (and busy reception
interact). Reset to `0` when `game.phase` leaves `critiquing` or `engines.isBusy`
becomes false (so the next wait starts on line 0). Reset in the existing phase
`$effect` is fine.

Practice stays available on idle even while `modelLoading` (do not set `clientSummoned`
during load, so the Practice button remains).

---

## 5. `StudioHudOverlay`

New optional props (defaults keep existing tests green):

```ts
modelLoading?: boolean; // default false
busyLine?: { speaker: string; text: string; footnote: string | null } | null; // default null
```

Idle + `floorInteract` + `busyLine`:

- Replace the current idle card copy with `busyLine.text`.
- If `busyLine.footnote`, render it underneath in smaller stone text.
- Accessible: the footnote is in the document (not `aria-hidden`).
- **Practice button stays** (`modelLoading` must not hide it).
- When `busyLine` is set, do **not** show “Someone wants to talk…” even if
  `clientSummoned` is true.

Critiquing + `busyLine`:

- Render the speaker/text (and footnote if any) **above** the existing artwork +
  `GeneratingPanel` stall. Do not remove the stall panel.

Component tests (accessible text, not CSS class names):

| Scenario                                     | Expected                                        |
| -------------------------------------------- | ----------------------------------------------- |
| idle, `busyLine` Mum loading                 | text includes `Sorry hun` and `(model loading)` |
| idle, `busyLine` set                         | Practice button still present                   |
| critiquing + artwork + `busyLine` Mum line 0 | text includes `beautiful work`                  |
| idle, no busyLine, `clientSummoned`          | still “Someone wants to talk” (regression)      |

---

## 6. `EngineLoadSpinner.svelte`

Presentational. Props:

```ts
visible: boolean;
label: string;          // e.g. 'Loading Janus Pro…'
reducedMotion?: boolean; // default false
```

When `visible` is false, render nothing (no status role).

When true:

- `role="status"` with `aria-live="polite"` and `aria-label={label}`.
- A decorative spinner (`aria-hidden="true"`). CSS rotate animation.
- Wrap the animation so `@media (prefers-reduced-motion: reduce)` **and**
  `reducedMotion === true` show a static disc (no rotation).
- Position: `fixed` (or `absolute` inside a `relative` studio shell), bottom-right,
  with padding so it does not cover the Phaser touch pad. `pointer-events: none`.
- Visible label: the `label` string in small text under/beside the spinner so
  sighted players know it is a model load (not a frozen tab).

Component tests:

| Scenario                                      | Expected                                 |
| --------------------------------------------- | ---------------------------------------- |
| `visible={false}`                             | no `status`                              |
| `visible={true}` `label="Loading Janus Pro…"` | status name includes `Loading Janus Pro` |

Export from `index.ts`. Document in `components/README.md`.

Use Svelte 5 runes (`$props`, `$derived` if needed). No `export let`. Validate with
the Svelte MCP `svelte-autofixer` (or `npx @sveltejs/mcp svelte-autofixer`) until clean.

---

## 7. Phaser `StudioScene`

### 7.1 Desk lock

Replace

```
this.#working = phase === 'generating' || phase === 'critiquing';
```

with

```
this.#working = playerDeskLocked(phase);
```

Work bar + desk dust **MAY** still run during `critiquing` (`shouldEmitWorkParticles`
stays as spec 21d). Only the **player snap / walk disable / interact disable** uses
`playerDeskLocked`.

`#tryInteract` currently runs `if (!this.#working && this.#consumeInteract())`.
During `critiquing` that becomes true — interact works. Good.

### 7.2 Talk targets

`#mumIsCommissionTarget`: also `true` when `snap.modelLoading && snap.phase === 'idle'`
and Mum exists (so E on Mum works during load even if not armed).

`#nearestTarget` during `phase === 'critiquing'`: if `#commissionNpc()` in range,
return `{ kind: 'talk' }` (not deliver). Deliver stays `results` only.

During `modelLoading && idle`, reception channels stay interactable (existing idle
branch) so letterbox/computer/receptionist still emit `open-reception` — Svelte no-ops.

### 7.3 Attention `!`

Phaser `Text` `"!"` (gold/amber fill, dark stroke, font size ~12–14), depth above
sprites, parented in world space above:

1. Mum when she is the commission / loading talk target
2. Else arrived door visitor
3. Else receptionist sprite when `receptionistVisible`
4. Else letterbox/computer anchor (`receptionistAnchor`) when channel is those and
   `readyForCommission`

`readyForCommission` in the scene:

```
const snap = this.#snapshot;
const ready =
  Boolean(snap?.residentClientArmed) ||
  Boolean(this.#client && this.#clientArrived);
```

Do **not** show a perpetual `!` on an idle receptionist with no visitor. Ready means
someone/something is waiting to start a job (armed Mum or arrived visitor).

`attention = npcAttention({ phase, modelLoading: snap.modelLoading === true, readyForCommission: ready })`

`promptOnNpc`: reuse the existing bark helper idea — prompt visible AND target is
talk/deliver on that sprite (`#promptOnSpeaker` already exists for barks). Pass that
into `showAttentionMark`.

When `reducedVfx`, no bob tween; otherwise a tiny 2px bob is MAY (not required). Hard
show/hide is enough for DoD.

Hide the mark when attention is `'none'` or `showAttentionMark` is false.

### 7.4 Client flow README

Update `src/lib/studio/README.md`:

- Desk-lock is **generating only**. Critiquing: player may walk; E on the commission
  NPC is flavour talk (Svelte shows taking-it-in copy).
- `modelLoading` suppresses Phaser commission arming side effects (Svelte simply
  does not send `summon-client`). Mum is still a talk target while loading.
- `!` mark for ready-commission and critique-ready.

---

## 8. CSS kitchen fallback

When `STUDIO_FLOOR_ENABLED` is false, spinner + HUD `busyLine` still apply. No Phaser
`!`. Do not skip the spinner mount on the `GameScene` branch.

---

## 9. Definition of done

- [x] Model load (`engines.isBusy`): no `inviteClient`, no `summon-client`, no
      reception board; auto-invite retries via `rescheduleAutoInvite`.
- [x] Mum / desk show the spec-29 loading copy + `(model loading)`; Practice remains.
- [x] Bottom-right `EngineLoadSpinner` while busy; reduced-motion safe.
- [x] After submit choice, player walks during `critiquing`; desk snap only on
      `generating`.
- [x] E on Mum/visitor during critiquing rotates taking-it-in lines; does not collect.
- [x] `!` above NPC when ready for a commission (not while loading) and when
      `results`.
- [x] Later venues use the channel table in §1.
- [x] Unit tests for dialogue + attention tables; component tests for overlay + spinner.
- [x] `npm run check`, `npm run lint`, and
      `npm run test:unit -- --run` green for owned files.
- [x] READMEs + `docs/agent-log.md` handoff.
- [x] No edits outside the ownership zone; no `contracts.ts`; no venue `rooms.ts`.

---

## 10. Explicitly out of scope

- Editing kitchen/garage/museum tilemaps (`rooms.ts`) — user is doing that on `main`.
- LLM flavour, new spritesheets, VO.
- Blocking Practice, briefing walk, or results walk.
- Changing critique scoring, Mum 10/10 praise, or engine workers.
- New outbound bridge events.
- Branching on `activeId === 'janus-webgpu'` — use `isBusy` only.

---

## 11. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/29-npc-busy-states.md`.
>
> **Worktree (already created):**
> `C:\Users\JensenM\Documents\My Apps\adt-wt-npc-busy`
> Branch `feat/npc-busy-states`. **Every file read/write uses this absolute path.**
> Do not edit `C:\Users\JensenM\Documents\My Apps\Art Dev Tycoon` (that tree is dirty
> venue work on another branch).
>
> Read these files completely before writing any code:
>
> 1. `best-practices.md`
> 2. `docs/architecture.md`
> 3. `src/lib/types/contracts.ts` (do not edit)
> 4. `docs/tasks/29-npc-busy-states.md`
> 5. `src/lib/studio/README.md` + `bridge.ts` + `StudioScene.ts` desk-lock / `#nearestTarget`
> 6. `src/routes/+page.svelte` summon/talk/reception
> 7. `src/lib/components/StudioHudOverlay.svelte`
> 8. `docs/agent-log.md` (latest studio handoff only — tail)
>
> Ownership zone is listed in the spec. Do not edit `package.json`, `vite.config.ts`,
> `tsconfig.json`, `src/lib/types/**`, `src/lib/engines/**`, or `src/lib/studio/rooms.ts`.
> Do not run `npm install`. Do not run any state-changing git command — no commit, add,
> checkout, merge, or push.
>
> Svelte 5 runes only. For every `.svelte` file, run svelte-autofixer until clean.
>
> Then run:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run src/lib/data/npcBusyDialogue.test.ts src/lib/studio/npcAttention.test.ts src/lib/studio/bridge.test.ts src/lib/components/EngineLoadSpinner.svelte.test.ts src/lib/components/StudioHudOverlay.svelte.test.ts src/lib/stores/gameState.svelte.test.ts
> ```
>
> Fix failures in owned files. Inherited red outside the zone: record in handoff, do not fix.
>
> Finally update READMEs and append `docs/agent-log.md` using `best-practices.md` §6.3.
