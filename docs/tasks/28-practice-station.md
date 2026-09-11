# Spec 28 — Practice station

**Status:** Implemented.
**Worktree:** `git worktree add -b agent/practice-station ../adt-wt-practice-station main`
**Depends on:** Spec 27 (`grantPracticeDrawingMs`, `activeMediumSkillProgress`, medium
ranks). Specs 17 (desk interact), 25 (`SketchCanvas`).

## Mission

The commission desk is only usable while a client is mid-job. Players need a way to
**sit and draw** so medium skill (Spec 27) can rise without a brief on the go.

Practice is a second mode at the **same desk**: walk up, press E (or hit Practice on
the idle HUD), paint on `SketchCanvas` with the active medium brush, and gain medium
XP slowly **only while the pointer is actually drawing**. No client, no Janus, no
critique, no cash. Leave whenever.

Practice is **not** a new `GamePhase`. It is a session flag on `idle`. Reloads drop
the open canvas (same as an in-flight commission) but keep XP.

---

## Ownership zone

```
New:
  src/lib/components/PracticeDesk.svelte
  src/lib/components/PracticeDesk.svelte.test.ts
  docs/tasks/28-practice-station.md     ← DoD ticks after impl

Edit:
  src/lib/components/SketchCanvas.svelte
  src/lib/components/SketchCanvas.svelte.test.ts
  src/lib/components/StudioHudOverlay.svelte
  src/lib/components/StudioHudOverlay.svelte.test.ts
  src/lib/components/IdlePanel.svelte
  src/lib/components/IdlePanel.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  src/lib/stores/gameState.svelte.ts
  src/lib/stores/gameState.svelte.test.ts
  src/lib/stores/README.md
  src/lib/studio/interactPrompt.ts
  src/lib/studio/interactPrompt.test.ts
  src/lib/studio/scenes/StudioScene.ts   ← desk label only; see §5
  src/lib/studio/README.md
  src/routes/+page.svelte                ← interact-desk → enterPractice; wire overlay
  docs/tasks/README.md
  docs/agent-log.md
```

**MUST NOT** edit: `package.json`, lockfiles, `src/lib/types/contracts.ts`,
`best-practices.md`, `docs/architecture.md`, `src/lib/game/mediumSkill.ts` (already
shipped in 27), engine files, Spec 27 suffix tables.

Svelte 5 runes only. After each `.svelte` edit, use the Svelte MCP `svelte-autofixer`
until it reports no issues.

---

## Locked product rules

1. Practice **only** from `phase === 'idle'` with no summoned client, no artist
   assignment, and no major-project beat in flight (`activeBeatIndex != null` blocks).
2. Auto-invite is paused while `practiceOpen` is true. `enterPractice` clears the
   pending auto-invite timer; `exitPractice` reschedules it.
3. XP uses Spec 27 `grantPracticeDrawingMs`. **No XP for hovering, idle sitting, or
   holding the pointer still.** Spec 28 measures drawing.
4. Eraser strokes do **not** grant XP (you are lifting paint, not practising the medium).
5. Medium picker in practice **is** unlocked (same briefing picker). Changing medium
   calls `setActiveMediumTier` so brush feel and XP target stay aligned. Locked
   mediums stay disabled with the existing cash/rep tease.
6. The hidden prompt suffix is **never** shown. Rank name + XP bar are shown.
7. `prefers-reduced-motion`: no extra celebration animation required; if you add a
   rank-up pulse, wrap it.
8. Loading/error: practice does not hit the network. Canvas init failure → an
   accessible message “Canvas unavailable” and a Done button still works.

---

## 1. SketchCanvas — drawing time callback

Add an optional prop. Do not change brush feel.

```ts
/**
 * Fired while the brush (not eraser) is drawing, about once per animation frame
 * worth of pointermove, with the ms since the previous tick of this stroke.
 * Parent converts this to XP. Never fire when disabled or when tool === 'eraser'.
 */
onpracticetick?: (deltaMs: number) => void;
```

Implementation (literal algorithm):

- On brush `pointerdown`: record `strokeLastTs = performance.now()` (injectable:
  `nowMs?: () => number` prop defaulting to `() => performance.now()` so tests fake
  it). Do **not** grant XP on down alone.
- On brush `pointermove` while `drawing`:
  ```
  const ts = nowMs();
  const dt = ts - strokeLastTs;
  strokeLastTs = ts;
  const dist = Math.hypot(x - lastX, y - lastY);
  ```
  If `dist >= 2` **and** `dt > 0` **and** `dt <= 250` (ignore tab-thaw spikes), call
  `onpracticetick(dt)`.
- On `pointerup` / `pointercancel`: clear `strokeLastTs`.
- Eraser: never call `onpracticetick`.

**Tests (`SketchCanvas.svelte.test.ts`):**

| Action                                              | Expected                                                    |
| --------------------------------------------------- | ----------------------------------------------------------- |
| Brush down + move ≥2px with fake now advancing 50ms | `onpracticetick` called with 50 (or the summed dt of moves) |
| Slow sub-2px move / coalesced move under 2s         | still ticks                                                 |
| Tab-thaw spike above 2s                             | no tick                                                     |
| Eraser down + move                                  | callback **not** called                                     |
| `disabled={true}`                                   | no ticks                                                    |
| Existing export / ink palette / medium tests        | still pass                                                  |

Use accessible roles already in the component; do not assert on CSS classes.

---

## 2. GameStore practice flag

```ts
practiceOpen = $state(false);

enterPractice(): boolean {
  if (this.phase !== 'idle') return false;
  if (this.artistAssignment) return false;
  if (this.majorProjectProgress?.activeBeatIndex != null) return false;
  if (this.practiceOpen) return false;
  this.practiceOpen = true;
  this.#clearAutoInvite();
  return true;
}

exitPractice(): void {
  if (!this.practiceOpen) return;
  this.practiceOpen = false;
  if (this.phase === 'idle') this.#scheduleAutoInvite();
}
```

`inviteClient` / `acceptBoardBrief` / `#applySlotSave` / `reset` / `declineClient`
**MUST** call `exitPractice()` (or set the flag false) so a client cannot appear
underneath an open canvas.

`#scheduleAutoInvite`: if `this.practiceOpen` return immediately (do not arm a timer).

`grantPracticeDrawingMs` already exists from Spec 27. Practice UI is the caller.
**Guard:** no-op unless `practiceOpen` is true, so a leaked canvas tick cannot farm XP
after Done. Add this guard in Spec 28 (edit the method). Test: `practiceOpen false` +
`grantPracticeDrawingMs(10_000)` → XP unchanged.

**Tests:**

| Call                                          | Expected                                                                                                                                                                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| idle `enterPractice()`                        | `true`, `practiceOpen === true`                                                                                                                                                                                                                       |
| `enterPractice()` while briefing              | `false`                                                                                                                                                                                                                                               |
| `enterPractice()` with `artistAssignment` set | `false`                                                                                                                                                                                                                                               |
| `exitPractice()`                              | flag false; auto-invite armed (spy or: after exit, advancing fake now eventually invites — if too heavy, assert `#scheduleAutoInvite` via “invite happens after tickInterval when Marketing hired” **or** simply that a second `enterPractice` works) |
| `inviteClient()` while practising             | `practiceOpen === false`                                                                                                                                                                                                                              |
| `grantPracticeDrawingMs(3000)` while open     | +1 XP on active medium (Spec 27 rate)                                                                                                                                                                                                                 |
| same call while closed                        | 0 XP                                                                                                                                                                                                                                                  |

Session-only: do **not** add `practiceOpen` to `saveDataSchema`.

---

## 3. `PracticeDesk.svelte`

Presentational. Props in, events out. No store import.

| Prop                    | Type                        | Notes               |
| ----------------------- | --------------------------- | ------------------- |
| `mediumTierId`          | `string`                    | Active brush        |
| `unlockedMediumTierIds` | `string[]`                  |                     |
| `cash`                  | `number`                    | Picker lock reasons |
| `reputation`            | `number`                    |                     |
| `skill`                 | `MediumSkillProgress`       | Active medium bar   |
| `onselectmedium`        | `(id: string) => void`      |                     |
| `onpracticetick`        | `(deltaMs: number) => void` | forwarded to canvas |
| `ondone`                | `() => void`                |                     |

Layout (accessible):

- `role="region"` `aria-label="Practice desk"`
- Title **Practice**
- One line: `{medium name} · {rankLabel} · {xpIntoLevel}/{xpForNext} XP` (or `Max
level` when `xpForNext === 0`)
- `ProgressMeter` for the fill
- Medium picker — **copy the briefing picker snippet from `StudioHudOverlay`** (same
  buttons, same lock reasons). Do not invent a third picker. Extracting a shared
  snippet/component is allowed if both overlay and PracticeDesk import it; if you
  extract, put `MediumPicker.svelte` in `src/lib/components/` (in-zone) and switch
  overlay briefing/practice to use it. That extraction is optional; duplicating the
  snippet is also allowed.
- `SketchCanvas` with `mediumTierId` and `onpracticetick`
- Helper text: `Draw to train this medium. No client, no payout.`
- Button **Done** (`aria-label="Finish practising"`) → `ondone`

**Tests:** renders rank text; Done fires `ondone`; medium button for an unlocked
inactive tier fires `onselectmedium`; locked tier is disabled; canvas is present
(`getByRole` / label already on SketchCanvas — if canvas has no name, add
`aria-label="Practice canvas"` on the canvas element in SketchCanvas when a new
optional `ariaLabel?: string` prop is passed; default keeps today's label).

---

## 4. `StudioHudOverlay` + `IdlePanel`

When `practiceOpen === true` (new prop, default `false`), the overlay **replaces**
the idle column with `<PracticeDesk … />`. Other phases ignore the flag.

Idle (not practising, `phase === 'idle'`):

- Floor mode (`floorInteract`): keep the walk/talk copy. Add a **Practice** button
  (`aria-label="Practice at the desk"`) that calls `onpractice?.()`. Hide it when
  `clientSummoned` is true.
- CSS kitchen fallback (`floorInteract === false`): `IdlePanel` gains an optional
  `onpractice?: () => void`. When provided, render a second button **Practice** next
  to invite.

New overlay props:

```ts
practiceOpen?: boolean;
skill?: MediumSkillProgress | null;
onpractice?: () => void;
onpracticetick?: (deltaMs: number) => void;
onexitpractice?: () => void;
```

Wire `onselectmedium` already used for briefing.

**Tests:** idle + Practice click fires `onpractice`; `practiceOpen` shows Practice
desk and hides invite copy; Done fires `onexitpractice`.

---

## 5. Desk interact (Phaser + `+page`)

`interact-desk` is already emitted and currently ignored by `+page`.

`+page.svelte` subscribe:

```ts
if (event.type === 'interact-desk') {
	if (game.phase === 'idle' && !clientSummoned) {
		game.enterPractice();
	}
	return;
}
```

`interactPrompt.ts` — extend input:

```ts
export interface InteractPromptInput {
	kind: InteractPromptKind;
	registryLabel?: string | null;
	clientName?: string | null;
	/** Spec 28. When kind==='desk' and true, show the practice verb. */
	deskIsPractice?: boolean;
}
```

```ts
case 'desk':
  return input.deskIsPractice ? 'Practice at desk' : 'Work at desk';
```

`StudioScene.ts` when building the desk prompt: pass
`deskIsPractice: this.#snapshot?.phase === 'idle'`. Keep `'Work at desk'` during
briefing / generating / results.

**Tests (`interactPrompt.test.ts`):** desk + `deskIsPractice: true` → `Practice at
desk`; default / false → `Work at desk`. Existing labels unchanged.

Do **not** retune interact priority (talk → deliver → desk → …).

---

## 6. Rank-up feedback (small)

When `grantPracticeDrawingMs` causes `mediumSkillProgress(...).level` to increase,
GameStore sets `lastMediumSkillRankUp = $state<{ mediumId: string; rankLabel: string } | null>(null)`.
`PracticeDesk` accepts optional `rankUpLabel?: string | null` and, when set, shows
`Rank up — {rankLabel}` as a live region (`aria-live="polite"`). Parent clears it
via `game.clearMediumSkillRankUp()` after ~2s **or** PracticeDesk can just display
whatever the parent passes; parent may clear on `exitPractice`.

This is the only extra state. No toast system rewrite.

**Test:** XP grant that crosses 30 on pencil while practising surfaces `Doodler` in
the live region (store test on the flag is enough; component test if you wire the
prop).

---

## 7. Definition of done

- [x] Idle desk E / Practice button opens the canvas without a client.
- [x] Drawing with the brush grants medium XP via `grantPracticeDrawingMs`; eraser
      and idle sitting do not.
- [x] Done / invite / skip / slot switch closes practice and resumes auto-invite.
- [x] Rank + XP bar visible; hidden suffix never shown.
- [x] Medium picker matches briefing behaviour.
- [x] `interactPrompt` idle desk verb is **Practice at desk**.
- [x] Unit + component tests for new behaviour; existing overlay/canvas tests green.
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for owned files.
- [x] READMEs + handoff in `docs/agent-log.md`.
- [x] No file outside the zone. No `any`, no `+server.ts`.

## 8. Out of scope

- Generating / critiquing the practice canvas (no Janus on practice).
- Saving practice doodles into the gallery.
- Artist NPCs walking to the desk to practise (their XP is Spec 27 time ticks).
- New Phaser furniture.

---

## Prompt for the implementing agent

> Implement the spec at `docs/tasks/28-practice-station.md`.
>
> Read these files completely before writing any code:
>
> 1. `best-practices.md`
> 2. `docs/architecture.md`
> 3. `src/lib/types/contracts.ts`
> 4. `docs/tasks/28-practice-station.md`
> 5. `docs/tasks/27-medium-skill.md` (seams you consume, do not re-implement)
> 6. `src/lib/game/mediumSkill.ts`, `src/lib/stores/gameState.svelte.ts`,
>    `src/lib/components/StudioHudOverlay.svelte`, `SketchCanvas.svelte`,
>    `src/routes/+page.svelte` (studioBridge.subscribe), `src/lib/studio/interactPrompt.ts`
>
> Own only the paths in the spec's ownership zone. Do not edit `package.json`,
> `src/lib/types/**`, `docs/architecture.md`, or Spec 27 suffix tables. Do not run
> `npm install`. Do not run state-changing git.
>
> Use Svelte 5 runes. After writing each `.svelte` file, run the Svelte MCP
> svelte-autofixer until it reports no issues.
>
> Then:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Append a handoff to `docs/agent-log.md` using `best-practices.md` §6.3.
