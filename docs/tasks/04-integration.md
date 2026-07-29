# Spec 04 — Integration: State Machine, Screen, End-to-End

**Worktree:** the main checkout (`Art Dev Tycoon`), on `main`.
**Depends on:** specs 01, 02 and 03 all merged. Verify before starting — `$lib/game`,
`$lib/components` and `$lib/engines` must all exist. If any is missing, stop.

You do **not** depend on specs 05 or 06. The game must be complete and shippable on the
mock engine alone; the real models slot in behind the interface you consume here.

## Ownership zone

```
src/lib/stores/**
src/routes/+page.svelte
src/routes/+layout.svelte
src/routes/layout.css
e2e/**
```

Read-only: everything else. You **wire together** what the other three agents built —
if a component needs a new prop or the API needs a new field, note it in your handoff
rather than editing their files.

## Mission

Turn three separate layers into a game. You own the state machine that drives the
whole loop, the screen that assembles the components, and the end-to-end test that
proves a player can actually finish a commission.

## Files to create

| File                                        | Contents                                    |
| ------------------------------------------- | ------------------------------------------- |
| `src/lib/stores/engineStore.svelte.ts`      | Reactive wrapper around `EngineManager`     |
| `src/lib/stores/engineStore.svelte.test.ts` | Engine store tests with a fake manager      |
| `src/lib/stores/gameState.svelte.ts`        | `GameStore` class and the shared instance   |
| `src/lib/stores/gameState.svelte.test.ts`   | State machine tests                         |
| `src/routes/+page.svelte`                   | The game screen (replaces the placeholder)  |
| `src/routes/layout.css`                     | Global styles (edit the existing file)      |
| `e2e/game-loop.e2e.ts`                      | Playwright walkthrough of a full commission |
| `src/lib/stores/README.md`                  | Per `best-practices.md` §4                  |

---

## 1. `src/lib/stores/engineStore.svelte.ts`

`EngineManager` from spec 02 is deliberately framework-free so it can be unit tested in
Node. This file is the thin reactive skin over it — it holds the runes, and nothing
else. Resist putting engine logic here; it belongs in the manager.

```ts
export class EngineStore {
	state = $state<EngineState>('idle');
	activeId = $state<EngineId>('mock');
	capability = $state<DeviceCapability | null>(null);
	options = $state<EngineOption[]>([]);
	/** Non-null only while a model is downloading or compiling. */
	loadProgress = $state<LoadProgress | null>(null);
	loadError = $state<string | null>(null);
	/** True once the player has seen the "running in Crayon Mode" notice. */
	noticeDismissed = $state(false);

	/** True when no engine beyond `mock` could ever run on this device. */
	realAiSupported = $derived(this.options.some((o) => o.id !== 'mock' && o.available));
	/** True while a commission is mid-flight and switching engines would unload one out from under it. */
	switchingLocked = $state(false);

	constructor(manager?: EngineManager);

	/**
	 * The `EngineManager` this store wraps. `GameStore` calls `generate`/`critique`
	 * directly on this — it is **not** a separate instance. If `GameStore` ever ends
	 * up talking to a different `EngineManager` than the one this store drives, engine
	 * selection in the UI will silently stop doing anything: the player picks Janus,
	 * it loads here, and commissions keep generating on whatever the other instance
	 * happens to be set to. There must only ever be one `EngineManager` in the app.
	 */
	get manager(): EngineManager;

	init(): Promise<void>;
	select(id: EngineId): Promise<void>;
	cancelLoad(): void;
	dismissNotice(): void;
	/** Called by GameStore when a commission starts/ends. See "Locking during a commission" below. */
	setSwitchingLocked(locked: boolean): void;
}

/**
 * The one and only `EngineManager` in the app lives inside this store. Both the engine
 * picker UI and `GameStore` (via `engines.manager`) share it.
 */
export const engines = new EngineStore();
```

`EngineStore.options` is built by mapping `manager.options` (each entry is an
`EngineDescriptor & { availability: EngineAvailability }` from spec 02) onto the shared
`EngineOption` type from the contract:

```ts
function toOption(entry: EngineDescriptor & { availability: EngineAvailability }): EngineOption {
	return {
		id: entry.id,
		displayName: entry.displayName,
		description: entry.description,
		available: entry.availability.available,
		unavailableReason: entry.availability.available ? undefined : entry.availability.reason,
		requiresDownload: entry.availability.available ? entry.availability.requiresDownload : false,
		approxDownloadMb: entry.requirements.approxDownloadMb
	};
}
```

### Locking during a commission

`GameStore.createArt()` calls `engines.setSwitchingLocked(true)` when it starts and
`false` in a `finally` when it ends (success or failure). While `switchingLocked` is
true, `+page.svelte` must disable the engine menu entirely — not just the confirm
button, the entry point itself — so the player cannot open `EnginePicker` and trigger
`select()` while a generation or critique is in flight. `EngineManager.select()`
unloads the active engine before loading the next one; doing that mid-inference would
pull the worker out from under an in-flight promise with no defined recovery. This is
cheap to prevent and expensive to debug, so prevent it.

- `init()` calls `manager.init()` and copies the results into the runes. It must never
  throw: a device that cannot report its capabilities still gets to play.
- `select(id)` sets `state` to `'loading'`, calls `manager.select(id, onProgress)`
  writing each `LoadProgress` into `loadProgress`, and on success sets `state` to
  `'ready'` and clears the progress. On failure it records `loadError`, sets `state` to
  `'error'`, and leaves the manager's fallback to `mock` in place — the player keeps
  playing regardless.
- `cancelLoad()` aborts an in-flight download and returns to `mock`.

**Tests** with an injected fake manager: `init()` populates `options` and leaves
`activeId` as `'mock'`; `select` writes progress updates into `loadProgress` in order;
a failing `select` sets `loadError` and `state` to `'error'` without throwing;
`realAiSupported` is false when only `mock` is available.

---

## 2. `src/lib/stores/gameState.svelte.ts`

The state machine. It must live in a `.svelte.ts` file — that suffix is what allows
runes outside a component.

```ts
export interface GameStoreDeps {
	/**
	 * Defaults to `engines.manager` — the same `EngineManager` instance the engine
	 * picker UI drives. Injected as a fake in tests. **Never** default this to
	 * `new EngineManager()`; that would create a second manager the player's engine
	 * choice has no effect on. Import `engines` from `./engineStore.svelte`.
	 */
	engine?: Pick<EngineManager, 'generate' | 'critique'>;
	/** Called when a commission starts and ends. Defaults to `engines.setSwitchingLocked`. */
	setSwitchingLocked?: (locked: boolean) => void;
	/** Injected for deterministic tests. */
	random?: () => number;
	/** Injected for deterministic tests. */
	now?: () => number;
}

export class GameStore {
	phase = $state<GamePhase>('idle');
	cash = $state(LEVEL_1.startingCash);
	reputation = $state(0);
	commissionsCompleted = $state(0);
	currentClient = $state<ClientBrief | null>(null);
	currentArtwork = $state<Artwork | null>(null);
	currentCritique = $state<Critique | null>(null);
	errorMessage = $state<string | null>(null);
	galleryHistory = $state<GalleryEntry[]>([]);
	/** The textarea contents. Survives a failed generation on purpose. */
	draftPrompt = $state('');
	/** 0-1 while painting, or null when the engine reports no progress. */
	generationProgress = $state<number | null>(null);

	progress = $derived(
		levelProgress({ cash: this.cash, commissionsCompleted: this.commissionsCompleted })
	);

	constructor(deps?: GameStoreDeps);

	inviteClient(): void;
	createArt(): Promise<void>;
	collectCash(): void;
	retry(): void;
	dismissError(): void;
	reset(): void;
}

/** The single instance the screen binds to. */
export const game = new GameStore();
```

Note the Svelte constraint: you cannot `export let` a reassigned `$state` variable from
a module. A class instance sidesteps this, which is why the store is a class.

`export const game = new GameStore();` is constructed with no arguments, so its
constructor must resolve the defaults itself:

```ts
import { engines } from './engineStore.svelte';

// inside the constructor:
this.#engine = deps?.engine ?? engines.manager;
this.#setSwitchingLocked = deps?.setSwitchingLocked ?? engines.setSwitchingLocked.bind(engines);
```

`engineStore.svelte.ts` must therefore be evaluated (and `engines` constructed) before
`gameState.svelte.ts` reads `engines.manager` — a plain top-level `import` guarantees
this in both directions, and there is no cycle since `engineStore.svelte.ts` never
imports from `gameState.svelte.ts`.

### State machine

| From       | Method                  | To                                      | Effects                                                                                |
| ---------- | ----------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| `idle`     | `inviteClient()`        | `briefing`                              | Pick a brief excluding those already completed; clear `draftPrompt` and `errorMessage` |
| `briefing` | `createArt()`           | `generating` → `critiquing` → `results` | Generate, then critique                                                                |
| `briefing` | `createArt()` (failure) | `failed`                                | Set `errorMessage`; **keep** `draftPrompt`                                             |
| `results`  | `collectCash()`         | `idle` or `levelComplete`               | Apply payout, push gallery entry                                                       |
| `failed`   | `retry()`               | `briefing`                              | Clear `errorMessage`, keep the prompt so the player can edit and resubmit              |
| `failed`   | `dismissError()`        | `briefing`                              | Same, without implying a resubmit                                                      |
| any        | `reset()`               | `idle`                                  | Restore the initial state entirely                                                     |

Every method must **guard on the current phase** and return without effect if called
from the wrong one. A double-click on Collect Cash must not pay twice — this is the
single most likely bug in the whole game, so test it explicitly.

### `inviteClient()`

Call
`pickBrief({ excludeIds: this.galleryHistory.map((e) => e.briefId), random: this.#random })`.
Set `currentClient`, clear `currentArtwork`, `currentCritique`, `errorMessage` and
`draftPrompt`, and move to `briefing`.

Use `briefId`, not `clientName` — two briefs matching on display name would silently
break the exclusion, and `GalleryEntry.briefId` exists specifically so this never has to
happen.

### `createArt()`

1. Guard: phase is `briefing`, `currentClient` is non-null, `draftPrompt.trim()` is
   non-empty. Otherwise return.
2. `phase = 'generating'`, `errorMessage = null`, `generationProgress = null`.
3. `this.#setSwitchingLocked(true)` — the engine menu must not be usable while this
   method is in flight. Pair this with step 9's `finally`.
4. `const playerPrompt = this.draftPrompt.trim()`.
5. Build the real prompt with `buildLevel1Prompt(playerPrompt)` from `$lib/game`.
   **This is where the hidden modifiers are applied**, and it is the only place they
   may be. Never store or display the result.
6. `const artwork = await engine.generate({ playerPrompt, prompt: <the built prompt> })`.
   Pass both fields — the engine echoes `playerPrompt` back into `Artwork.playerPrompt`
   verbatim and never sees it merged with the modifiers. Do **not** overwrite
   `artwork.playerPrompt` afterward; if the returned value doesn't already equal
   `playerPrompt`, that is a bug in the engine, not something to paper over here.
7. `phase = 'critiquing'`.
8. `const draft = await engine.critique({ brief: this.currentClient, playerPrompt, artwork })`
9. Derive the rest in the domain layer — the engine never decides money:
   `creativityScore` from `scorePrompt(this.currentClient, playerPrompt)`,
   `finalPayout` from `calculatePayout(this.currentClient, draft.accuracyScore,
creativityScore)`. Assemble a full `Critique` and validate it with
   `critiqueSchema.parse`.
10. Set both, `phase = 'results'`.
11. `catch`: set `errorMessage` from the `EngineError` message when it is one, else a
    generic line; `phase = 'failed'`. Do not clear `draftPrompt`.
12. `finally`: `this.#setSwitchingLocked(false)`.

Note that steps 6 and 8 can each take tens of seconds on a real engine. Guard against a
second `createArt()` while one is already running — the phase guard in step 1 covers
this, but test it explicitly.

### `collectCash()`

1. Guard: phase is `results` and both `currentArtwork` and `currentCritique` are
   non-null. Otherwise return.
2. `cash += currentCritique.finalPayout`
3. `reputation += reputationGain(accuracyScore, creativityScore)`
4. `commissionsCompleted += 1`
5. Prepend a `GalleryEntry` to `galleryHistory` (newest first):

```ts
{
	id: currentArtwork.id,
	imageUrl: currentArtwork.imageUrl,
	title: currentCritique.title,
	payout: currentCritique.finalPayout,
	score: toGalleryScore(critique.accuracyScore, critique.creativityScore),
	clientName: currentClient.clientName,
	briefId: currentClient.id,
	completedAt: this.#now()
}
```

6. Clear `currentArtwork`, `currentCritique`, `currentClient`.
7. `phase = isLevelComplete({ cash, commissionsCompleted }) ? 'levelComplete' : 'idle'`.

### Tests for the store

Because these use runes, the file **must** be named `gameState.svelte.test.ts`. Build a
fake engine returning canned `Artwork` and `CritiqueDraft` values, and inject
`random: () => 0` and `now: () => 1_000` for determinism.

Cover:

- Initial state: `phase` is `'idle'`, `cash` is `100`, `galleryHistory` is empty.
- `inviteClient()` moves to `briefing` and sets `currentClient` to `c1` with
  `random: () => 0`.
- `createArt()` with an empty `draftPrompt` does nothing and stays in `briefing`.
- A happy path run ends in `results` with both `currentArtwork` and `currentCritique`
  populated.
- **The engine receives the modified prompt, not the raw one, in the `prompt` field,
  while `playerPrompt` stays clean.** Assert the fake engine's recorded `prompt`
  argument contains `LEVEL_1.promptModifiers` and its recorded `playerPrompt` argument
  does not; separately assert `currentArtwork.playerPrompt` equals the raw text. This
  is the game's central conceit; test it directly on both sides of the call.
- A rejecting engine ends in `failed`, sets `errorMessage`, and **preserves**
  `draftPrompt`.
- Calling `createArt()` while already in `generating` does nothing.
- **`createArt()` locks and unlocks engine switching around the call**, in both the
  success and failure paths — assert the injected `setSwitchingLocked` fake is called
  with `true` then `false`, with `false` occurring even when the engine rejects.
- `retry()` from `failed` returns to `briefing` with the prompt intact.
- `collectCash()` adds exactly `finalPayout` to `cash` and appends one gallery entry
  whose `briefId` equals `currentClient.id`.
- **Calling `collectCash()` twice pays only once** and leaves one gallery entry.
- Reaching 5 commissions and $500 sets `phase` to `'levelComplete'`.
- `inviteClient()` never repeats a **`briefId`** already in `galleryHistory` until all
  six are used — construct a `galleryHistory` fixture with `briefId` values (not just
  `clientName`) to prove the exclusion reads the right field.
- `reset()` restores every field to its initial value.

---

## 3. `src/routes/+page.svelte`

Assemble the screen. Import components from `$lib/components` and the store instance
from `$lib/stores/gameState.svelte`.

```
┌─────────────────────────────────────────────┐
│ [engine menu btn]              HudBar       │
├─────────────────────────────────────────────┤
│ CapabilityNotice (once, if no real AI)      │
├─────────────────────────────────────────────┤
│                                             │
│   Center panel — switches on game.phase:    │
│     idle          → IdlePanel               │
│     briefing      → ClientCard              │
│                     + PromptComposer        │
│     generating    → ClientCard              │
│                     + GeneratingPanel       │
│     critiquing    → ClientCard              │
│                     + GeneratingPanel       │
│                       (stageLabel="Critiquing") │
│     results       → ResultsPanel            │
│     failed        → ClientCard + ErrorPanel │
│                     + PromptComposer        │
│     levelComplete → LevelCompleteOverlay    │
│                                             │
├─────────────────────────────────────────────┤
│ PortfolioStrip                              │
└─────────────────────────────────────────────┘

  EnginePicker + ModelDownloadGate render as an overlay
  on top of everything, opened from the engine menu.
```

**The engine menu button is not part of `HudBar`.** Spec 03's `HudBar` is frozen with no
prop or slot for it. Render a plain button directly in `+page.svelte`, positioned
alongside `HudBar` in the same header row (a wrapping `<header>` around both is fine).
Do not modify `HudBar.svelte` to accommodate it.

Requirements:

- Bind the composer with `bind:value={game.draftPrompt}`.
- Wire `onsubmit={() => game.createArt()}`, `oncollect={() => game.collectCash()}`,
  `oninvite={() => game.inviteClient()}`, `onretry={() => game.retry()}`,
  `oncontinue={() => game.reset()}`.
- Use `{#if}` / `{:else if}` on `game.phase`. Every phase must render something —
  there is no fall-through blank state.
- Call `engines.init()` in an `$effect` on mount. It is safe to call before the player
  does anything and must not block the first paint.
- Show `CapabilityNotice` when `!engines.realAiSupported && !engines.noticeDismissed`.
- The engine menu opens `EnginePicker`. Choosing an engine that needs a download opens
  `ModelDownloadGate` in its `prompt` state; confirming calls `engines.select(id)` and
  moves the gate to `loading`, driven by `engines.loadProgress`.
- **Disable the engine menu button whenever `engines.switchingLocked` is true** (i.e.
  while `game.phase` is `'generating'` or `'critiquing'`). Give it a visibly disabled
  state and, ideally, a tooltip/title explaining why — switching engines mid-commission
  is unsupported, not just discouraged.
- **The game must be fully playable before, during and after any of this.** The engine
  UI is optional surface layered on a working game, never a gate in front of it. A
  player who ignores the engine menu entirely gets a complete Level 1 on the mock
  engine.
- Give the page a `<svelte:head>` title of `Art Gallery Tycoon — Garage Studio`.
- Mobile first: single column by default, a comfortable max width of around 1024 px
  above 768 px. Test at 360 px wide.
- `+page.svelte` holds **no game logic**. It reads state and calls store methods, and
  that is all. Any `if` deciding game rules belongs in the store or the domain layer.

### `src/routes/layout.css`

Extend the existing file. Add the Tailwind import if not present, plus base styles: a
warm `bg-stone-100` body, a legible default font stack, and a global
`@media (prefers-reduced-motion: reduce)` block that neutralises animations as a
belt-and-braces backstop to the per-component handling.

---

## 4. `e2e/game-loop.e2e.ts`

Playwright picks up `**/*.e2e.{ts,js}` and runs `npm run build && npm run preview` on
port 4173 first. The mock engine is always the default and nothing auto-downloads, so
the whole test runs deterministically with no models and no network.

```ts
import { expect, test } from '@playwright/test';

test('a player can complete a full commission', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('Garage Studio')).toBeVisible();
	await expect(page.getByText('$100')).toBeVisible();

	await page.getByRole('button', { name: 'Wait for a Client' }).click();

	const prompt = page.getByLabel('Your prompt');
	await expect(prompt).toBeVisible();
	await prompt.fill('a cozy coffee cup on a wooden table');

	await page.getByRole('button', { name: 'Create Art' }).click();

	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible({ timeout: 15_000 });

	await page.getByRole('button', { name: 'Collect Cash' }).click();

	// Cash has grown and the piece is now hanging in the portfolio.
	await expect(page.getByText('1 / 5 commissions')).toBeVisible();
	await expect(page.getByRole('listitem')).toHaveCount(1);
});
```

Add four more tests:

- **Empty prompt is rejected.** After inviting a client, **Create Art** is disabled
  until text is entered.
- **The hidden modifiers never leak.** After completing a commission, assert that
  `page.getByText('crayon texture')` has count `0`. This is the guard on the game's
  central conceit, and it is worth an explicit test.
- **Nothing downloads on its own.** Load the page, wait for it to settle, and assert
  that no request URL matches `/huggingface\.co|\.onnx$/`. Route interception
  (`page.route`) makes this cheap. An accidental gigabyte download on first paint is
  the worst bug this project could ship, so it gets a permanent regression test.
- **The engine menu is disabled while a commission is in flight.** On the mock engine
  this window is narrow, so slow it down for this one test only by injecting a fake
  engine dependency (or, if that isn't reachable from the page, submit and immediately
  assert the button carries a `disabled` attribute during the `generating` phase before
  awaiting the result). Assert it becomes enabled again once `results` (or `failed`) is
  reached.

Also run the happy path once at a 360×740 viewport to confirm the mobile layout is
usable, since that is the primary target.

Run with `npm run test:e2e`.

---

## Definition of done

- [ ] All files in the table exist.
- [ ] Every store test listed above passes, including the double-collect guard.
- [ ] `+page.svelte` contains no game rules — only phase dispatch and store calls.
- [ ] Every phase renders a visible state.
- [ ] The engine receives the modified prompt and the player never sees it.
- [ ] `Artwork.playerPrompt` and `GalleryEntry.briefId` are populated correctly end to
      end — a completed run's gallery entry traces back to the right brief, and a
      second run never repeats a `briefId` from the first.
- [ ] The engine menu cannot be opened while `game.phase` is `'generating'` or
      `'critiquing'`.
- [ ] Nothing downloads without an explicit click.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` all green.
- [ ] `npm run test:e2e` passes every e2e test, including the mobile viewport run.
- [ ] `npm run dev` gives a playable Level 1 end to end with no models downloaded.
- [ ] `src/lib/stores/README.md` written, documenting the state machine.
- [ ] Handoff entry appended to `docs/agent-log.md`.
