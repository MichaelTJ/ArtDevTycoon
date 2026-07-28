# Spec 04 — Integration: State Machine, Screen, End-to-End

**Worktree:** the main checkout (`Art Dev Tycoon`), on `main`.
**Depends on:** specs 01, 02 and 03 all merged. Verify before starting — `$lib/game`,
`$lib/components` and `/api/generate` must all exist. If any is missing, stop.

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

| File                                      | Contents                                     |
| ----------------------------------------- | -------------------------------------------- |
| `src/lib/stores/gameApi.ts`               | Typed `fetch` wrappers for the two endpoints |
| `src/lib/stores/gameApi.test.ts`          | Unit tests with injected `fetch`             |
| `src/lib/stores/gameState.svelte.ts`      | `GameStore` class and the shared instance    |
| `src/lib/stores/gameState.svelte.test.ts` | State machine tests                          |
| `src/routes/+page.svelte`                 | The game screen (replaces the placeholder)   |
| `src/routes/layout.css`                   | Global styles (edit the existing file)       |
| `e2e/game-loop.e2e.ts`                    | Playwright walkthrough of a full commission  |
| `src/lib/stores/README.md`                | Per `best-practices.md` §4                   |

---

## 1. `src/lib/stores/gameApi.ts`

Thin, typed wrappers. Every response is validated; every failure becomes a friendly
message rather than an exception the UI has to decode.

```ts
export class GameApiError extends Error {
	constructor(
		readonly code: ApiErrorCode,
		message: string
	) {
		super(message);
	}
}

export interface ApiDeps {
	fetchFn?: typeof fetch;
}

export async function requestGeneration(prompt: string, deps?: ApiDeps): Promise<Artwork>;

export async function requestEvaluation(
	input: { brief: ClientBrief; playerPrompt: string; imageUrl: string },
	deps?: ApiDeps
): Promise<Critique>;
```

Behaviour for both:

1. `POST` JSON to the endpoint using `deps?.fetchFn ?? fetch`.
2. If the response is not ok, try to parse the body with `apiErrorSchema`. On success
   throw `GameApiError` with that code and message; if the body is unparseable throw
   `GameApiError('internal', 'Something went wrong in the studio. Try again.')`.
3. On success validate with `generateResponseSchema` / `evaluateResponseSchema` and
   return the inner `artwork` / `critique`. A validation failure throws
   `GameApiError('internal', ...)`.
4. A network rejection throws `GameApiError('sidecar_unavailable', 'Could not reach the
studio. Check your connection and try again.')`.

**Tests** (injected fake `fetch`): a valid response returns a parsed `Artwork`; a `400`
carrying an `apiErrorSchema` body throws `GameApiError` with that exact code; a `500`
with an HTML body throws code `'internal'`; a rejecting `fetch` throws
`'sidecar_unavailable'`; a `200` with a malformed body throws rather than returning
undefined.

---

## 2. `src/lib/stores/gameState.svelte.ts`

The state machine. It must live in a `.svelte.ts` file — that suffix is what allows
runes outside a component.

```ts
export interface GameStoreDeps {
	fetchFn?: typeof fetch;
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

### State machine

| From       | Method                  | To                        | Effects                                                                                |
| ---------- | ----------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `idle`     | `inviteClient()`        | `briefing`                | Pick a brief excluding those already completed; clear `draftPrompt` and `errorMessage` |
| `briefing` | `createArt()`           | `generating` → `results`  | Generate, then evaluate                                                                |
| `briefing` | `createArt()` (failure) | `failed`                  | Set `errorMessage`; **keep** `draftPrompt`                                             |
| `results`  | `collectCash()`         | `idle` or `levelComplete` | Apply payout, push gallery entry                                                       |
| `failed`   | `retry()`               | `briefing`                | Clear `errorMessage`, keep the prompt so the player can edit and resubmit              |
| `failed`   | `dismissError()`        | `briefing`                | Same, without implying a resubmit                                                      |
| any        | `reset()`               | `idle`                    | Restore the initial state entirely                                                     |

Every method must **guard on the current phase** and return without effect if called
from the wrong one. A double-click on Collect Cash must not pay twice — this is the
single most likely bug in the whole game, so test it explicitly.

### `inviteClient()`

Call `pickBrief({ excludeIds: <ids already in galleryHistory>, random: this.#random })`.
Set `currentClient`, clear `currentArtwork`, `currentCritique`, `errorMessage` and
`draftPrompt`, and move to `briefing`.

### `createArt()`

1. Guard: phase is `briefing`, `currentClient` is non-null, `draftPrompt.trim()` is
   non-empty. Otherwise return.
2. `phase = 'generating'`, `errorMessage = null`.
3. `const artwork = await requestGeneration(this.draftPrompt.trim(), { fetchFn })`
4. `const critique = await requestEvaluation({ brief: this.currentClient, playerPrompt: this.draftPrompt.trim(), imageUrl: artwork.imageUrl }, { fetchFn })`
5. Set both, `phase = 'results'`.
6. `catch`: set `errorMessage` to `error.message` when it is a `GameApiError`, else a
   generic line; `phase = 'failed'`. Do not clear `draftPrompt`.

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
	completedAt: this.#now()
}
```

6. Clear `currentArtwork`, `currentCritique`, `currentClient`.
7. `phase = isLevelComplete({ cash, commissionsCompleted }) ? 'levelComplete' : 'idle'`.

### Tests for the store

Because these use runes, the file **must** be named `gameState.svelte.test.ts`. Build a
fake `fetch` that returns canned `Artwork` and `Critique` payloads, and inject
`random: () => 0` and `now: () => 1_000` for determinism.

Cover:

- Initial state: `phase` is `'idle'`, `cash` is `100`, `galleryHistory` is empty.
- `inviteClient()` moves to `briefing` and sets `currentClient` to `c1` with
  `random: () => 0`.
- `createArt()` with an empty `draftPrompt` does nothing and stays in `briefing`.
- A happy path run ends in `results` with both `currentArtwork` and `currentCritique`
  populated.
- A rejecting `fetch` ends in `failed`, sets `errorMessage`, and **preserves**
  `draftPrompt`.
- `retry()` from `failed` returns to `briefing` with the prompt intact.
- `collectCash()` adds exactly `finalPayout` to `cash` and appends one gallery entry.
- **Calling `collectCash()` twice pays only once** and leaves one gallery entry.
- Reaching 5 commissions and $500 sets `phase` to `'levelComplete'`.
- `inviteClient()` never repeats a client already in `galleryHistory` until all six are
  used.
- `reset()` restores every field to its initial value.

---

## 3. `src/routes/+page.svelte`

Assemble the screen. Import components from `$lib/components` and the store instance
from `$lib/stores/gameState.svelte`.

```
┌─────────────────────────────────────────────┐
│ HudBar                                      │
├─────────────────────────────────────────────┤
│                                             │
│   Center panel — switches on game.phase:    │
│     idle          → IdlePanel               │
│     briefing      → ClientCard              │
│                     + PromptComposer        │
│     generating    → ClientCard              │
│                     + GeneratingPanel       │
│     results       → ResultsPanel            │
│     failed        → ClientCard + ErrorPanel │
│                     + PromptComposer        │
│     levelComplete → LevelCompleteOverlay    │
│                                             │
├─────────────────────────────────────────────┤
│ PortfolioStrip                              │
└─────────────────────────────────────────────┘
```

Requirements:

- Bind the composer with `bind:value={game.draftPrompt}`.
- Wire `onsubmit={() => game.createArt()}`, `oncollect={() => game.collectCash()}`,
  `oninvite={() => game.inviteClient()}`, `onretry={() => game.retry()}`,
  `oncontinue={() => game.reset()}`.
- Use `{#if}` / `{:else if}` on `game.phase`. Every phase must render something —
  there is no fall-through blank state.
- Give the page a `<svelte:head>` title of `Art Gallery Tycoon — Garage Studio`.
- Keep the layout responsive: single column under 768 px, comfortable max width of
  around 1024 px above it.
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
port 4173 first. `AI_PROVIDER` is unset in that environment, so the deterministic mock
provider serves the whole test — no models, no network.

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

Add two more tests:

- **Empty prompt is rejected.** After inviting a client, **Create Art** is disabled
  until text is entered.
- **The hidden modifiers never leak.** After completing a commission, assert that
  `page.getByText('crayon texture')` has count `0`. This is the guard on the game's
  central conceit, and it is worth an explicit test.

Run with `npm run test:e2e`.

---

## Definition of done

- [ ] All files in the table exist.
- [ ] Every store test listed above passes, including the double-collect guard.
- [ ] `+page.svelte` contains no game rules — only phase dispatch and store calls.
- [ ] Every phase renders a visible state.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` all green.
- [ ] `npm run test:e2e` passes all three e2e tests.
- [ ] `npm run dev` gives a playable Level 1 end to end with no models installed.
- [ ] `src/lib/stores/README.md` written, documenting the state machine.
- [ ] Handoff entry appended to `docs/agent-log.md`.
