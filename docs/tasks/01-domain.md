# Spec 01 — Domain Layer

**Worktree:** `../adt-wt-domain` (branch `agent/domain`)
**Depends on:** nothing. Start immediately.

## Ownership zone

You may create and edit **only** these paths:

```
src/lib/game/**
src/lib/data/**
```

Everything else is read-only, including `src/lib/types/contracts.ts`, `package.json`
and every config file. Do not run `npm install`. Do not run state-changing git
commands.

## Mission

Build the pure rules engine of the game: turn the player's prompt into the real
generation prompt, score that prompt against the client's brief, and work out the
payout. This layer is deliberately dependency-free — no Svelte, no `fetch`, no Node
APIs, no randomness that isn't injected. Everything here is a pure function of its
arguments, which is what makes it exhaustively testable and what lets the mock AI
provider reuse it as a genuine scoring engine rather than a stub.

## Files to create

| File                                  | Contents                                                             |
| ------------------------------------- | -------------------------------------------------------------------- |
| `src/lib/game/text.ts`                | `normalize`, `stem`, `STOPWORDS` — shared text utilities             |
| `src/lib/game/text.test.ts`           | Unit tests                                                           |
| `src/lib/game/promptPipeline.ts`      | `sanitizePlayerPrompt`, `buildLevel1Prompt`                          |
| `src/lib/game/promptPipeline.test.ts` | Unit tests                                                           |
| `src/lib/game/scoring.ts`             | `scorePrompt`, `calculatePayout`, `toGalleryScore`, `reputationGain` |
| `src/lib/game/scoring.test.ts`        | Unit tests                                                           |
| `src/lib/game/levelRules.ts`          | `isLevelComplete`, `levelProgress`                                   |
| `src/lib/game/levelRules.test.ts`     | Unit tests                                                           |
| `src/lib/game/index.ts`               | Barrel re-exporting the public surface                               |
| `src/lib/data/briefs.ts`              | `LEVEL_1_BRIEFS`, `pickBrief`                                        |
| `src/lib/data/briefs.test.ts`         | Unit tests                                                           |
| `src/lib/game/README.md`              | Per `best-practices.md` §4                                           |
| `src/lib/data/README.md`              | Per `best-practices.md` §4                                           |

---

## 1. `src/lib/game/text.ts`

Implement exactly this. The stemmer is deliberately crude — it only has to be
_consistent_, because both sides of every comparison go through it.

```ts
/**
 * Words carrying no descriptive signal. Removed before measuring how imaginative a
 * prompt is, so "please draw me a cat" is not rewarded over "cat".
 */
export const STOPWORDS: ReadonlySet<string> = new Set([
	'a',
	'an',
	'the',
	'of',
	'on',
	'in',
	'at',
	'with',
	'and',
	'or',
	'to',
	'for',
	'is',
	'are',
	'it',
	'its',
	'this',
	'that',
	'my',
	'me',
	'i',
	'please',
	'draw',
	'paint',
	'make',
	'create',
	'need',
	'want',
	'some',
	'very',
	'really'
]);

/** Lowercase, strip punctuation, split into tokens. Never returns empty strings. */
export function normalize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((token) => token.length > 0);
}

/**
 * Strip one common English suffix so "glowing" and "glow" compare equal. Order
 * matters: longer suffixes are tried first. Tokens of 3 characters or fewer are left
 * alone, and a suffix is only removed if at least 3 characters would remain.
 */
export function stem(token: string): string {
	if (token.length <= 3) return token;
	for (const suffix of ['ing', 'ies', 'es', 'ed', 's']) {
		if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
			return token.slice(0, token.length - suffix.length);
		}
	}
	return token;
}
```

### Tests for `text.ts`

| Call                                  | Expected                             |
| ------------------------------------- | ------------------------------------ |
| `normalize('A cozy, coffee-cup!')`    | `['a','cozy','coffee','cup']`        |
| `normalize('   ')`                    | `[]`                                 |
| `normalize('Cat 42 wearing a CROWN')` | `['cat','42','wearing','a','crown']` |
| `stem('glowing')`                     | `'glow'`                             |
| `stem('cups')`                        | `'cup'`                              |
| `stem('cat')`                         | `'cat'`                              |
| `stem('runes')`                       | `'run'`                              |
| `stem('cracked')`                     | `'crack'`                            |
| `stem('coffee')`                      | `'coffee'`                           |
| `stem('table')`                       | `'table'`                            |
| `stem('is')`                          | `'is'`                               |

---

## 2. `src/lib/game/promptPipeline.ts`

```ts
import { LEVEL_1 } from '$lib/types/contracts';

/** Longest prompt we accept. Matches `generateRequestSchema` in the contract. */
export const MAX_PROMPT_LENGTH = 500;

/**
 * Clean up raw player input: drop control characters, collapse runs of whitespace,
 * trim, and cap the length. Returns `''` for input that is entirely whitespace.
 */
export function sanitizePlayerPrompt(raw: string): string;

/**
 * Append the hidden Level 1 quality modifiers to the player's prompt.
 *
 * The player never sees the result — the whole joke of Level 1 is that their grand
 * ambitions come back rendered in crayon. Throws on empty input so a blank prompt can
 * never reach the image model.
 *
 * @throws {Error} if the sanitised input is empty
 */
export function buildLevel1Prompt(playerInput: string): string;
```

**`sanitizePlayerPrompt` algorithm, in order:**

1. Remove characters matching `/[\u0000-\u001F\u007F]/g`.
2. Replace `/\s+/g` with a single space.
3. `.trim()`.
4. `.slice(0, MAX_PROMPT_LENGTH)`, then `.trim()` again so a mid-word cut cannot leave
   a trailing space.

**`buildLevel1Prompt` algorithm:**

1. `const clean = sanitizePlayerPrompt(playerInput)`
2. If `clean === ''`, `throw new Error('Prompt cannot be empty.')`
3. Return `` `${clean}, ${LEVEL_1.promptModifiers}` ``

### Tests for `promptPipeline.ts`

| Call                                       | Expected                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `sanitizePlayerPrompt('  a   cat  ')`      | `'a cat'`                                                                                           |
| `sanitizePlayerPrompt('a\tcat\nsleeping')` | `'a cat sleeping'`                                                                                  |
| `sanitizePlayerPrompt('   ')`              | `''`                                                                                                |
| `sanitizePlayerPrompt('x'.repeat(600))`    | length is exactly `500`                                                                             |
| `buildLevel1Prompt('a dragon')`            | `'a dragon, flat color, simple line art, crayon texture, amateur style, low detail, basic shading'` |
| `buildLevel1Prompt('   ')`                 | throws `Error`                                                                                      |
| `buildLevel1Prompt('')`                    | throws `Error`                                                                                      |

Also assert that `buildLevel1Prompt('a dragon')` ends with `LEVEL_1.promptModifiers`,
so the test keeps passing if the modifier string is retuned.

---

## 3. `src/lib/game/scoring.ts`

This is the heart of the game. Implement the formulas **exactly** — the test tables
below contain hand-computed values and will fail on any deviation.

```ts
import type { ClientBrief } from '$lib/types/contracts';

export interface ScoreBreakdown {
	/** Brief keywords the prompt satisfied, in the brief's original order. */
	matchedKeywords: string[];
	/** Brief keywords the prompt missed, in the brief's original order. */
	missedKeywords: string[];
	/** How well the prompt served the brief, 1-10. */
	accuracyScore: number;
	/** How detailed and imaginative the prompt was, 1-10. */
	creativityScore: number;
}

export function scorePrompt(brief: ClientBrief, playerPrompt: string): ScoreBreakdown;

export function calculatePayout(
	brief: ClientBrief,
	accuracyScore: number,
	creativityScore: number
): number;

export function toGalleryScore(accuracyScore: number, creativityScore: number): number;

export function reputationGain(accuracyScore: number, creativityScore: number): number;
```

### 3.1 Keyword matching

```
promptTokens = normalize(playerPrompt)
promptStems  = new Set(promptTokens.map(stem))     // stopwords are NOT removed here

A keyword matches when EVERY token of that keyword matches. For keyword token `kt`:
  ks = stem(kt)
  matches if   promptStems.has(ks)
            OR (ks.length >= 4 AND some stem in promptStems contains ks as a substring)
```

The substring rule is what makes `sword` match `longsword` and `gold` match `golden`.
The 4-character floor stops short keywords from matching almost anything. A keyword
may contain a space (none currently do); tokenise it with `normalize` and require all
of its tokens to match.

### 3.2 Accuracy

```
ratio    = matchedKeywords.length / brief.preferredKeywords.length
accuracy = clamp(Math.round(1 + ratio * 9), 1, 10)
```

| matched / total | accuracy |
| --------------- | -------- |
| 0 / 4           | 1        |
| 1 / 4           | 3        |
| 2 / 4           | 6        |
| 3 / 4           | 8        |
| 4 / 4           | 10       |

### 3.3 Creativity

```
meaningful = promptTokens.filter(t => !STOPWORDS.has(t)).map(stem)
unique     = new Set(meaningful).size
creativity = clamp(Math.round(1 + ((unique - 3) / 17) * 9), 1, 10)
```

Three meaningful words scores 1; twenty scores the maximum 10.

| unique | creativity |
| ------ | ---------- |
| 0      | 1          |
| 1      | 1          |
| 3      | 1          |
| 5      | 2          |
| 10     | 5          |
| 13     | 6          |
| 20     | 10         |
| 30     | 10         |

### 3.4 Payout

```
quality = (accuracyScore * 0.7 + creativityScore * 0.3) / 10
payout  = clamp(Math.round(brief.budget * quality), 0, brief.budget)
```

Accuracy is weighted more heavily than creativity because the client is paying for
their brief to be served, not for the artist to express themselves. The floor of 1 on
both scores means a payout is never zero — even a bad job earns about a tenth of
budget, so the player is never hard-stuck.

### 3.5 Gallery score and reputation

```
toGalleryScore(a, c) = Math.round(((a + c) / 2) * 10) / 10      // one decimal place

reputationGain(a, c):
  avg = (a + c) / 2
  avg >= 8  -> 3
  avg >= 6  -> 2
  avg >= 4  -> 1
  otherwise -> 0
```

### 3.6 Test table for `scoring.ts`

Use these exact briefs (they are `c1` and `c2` from `src/lib/data/briefs.ts`):

- **c1** — budget `100`, keywords `['coffee', 'cup', 'cozy', 'table']`
- **c2** — budget `150`, keywords `['sword', 'glowing', 'magic', 'stone']`

| #   | Brief | Prompt                                                                                                   | accuracy | creativity | payout | galleryScore | reputationGain |
| --- | ----- | -------------------------------------------------------------------------------------------------------- | -------- | ---------- | ------ | ------------ | -------------- |
| 1   | c1    | `a cozy coffee cup on a wooden table`                                                                    | 10       | 2          | 76     | 6            | 2              |
| 2   | c1    | `dragon`                                                                                                 | 1        | 1          | 10     | 1            | 0              |
| 3   | c2    | `an ancient glowing magical longsword embedded deep within a cracked granite stone, mystical blue runes` | 10       | 6          | 132    | 8            | 3              |
| 4   | c1    | `` (empty string)                                                                                        | 1        | 1          | 10     | 1            | 0              |

Worked check for row 1, so you can verify your implementation as you go:
all four keywords match, so accuracy is `round(1 + 1 * 9) = 10`. After stopword removal
the meaningful stems are `cozy, coffee, cup, wooden, table`, so `unique = 5` and
creativity is `round(1 + (2/17)*9) = round(2.059) = 2`. Quality is
`(10*0.7 + 2*0.3)/10 = 0.76`, so payout is `round(100 * 0.76) = 76`.

Also assert these behaviours:

- `matchedKeywords` and `missedKeywords` together always equal
  `brief.preferredKeywords`, in the original order.
- `scorePrompt(c2, 'a sword')` matches only `'sword'`.
- `scorePrompt(c3, 'a fluffy cat with a golden crown')` matches `'gold'` via the
  substring rule (c3's keywords are `['cat','fluffy','crown','gold']`).
- `calculatePayout` never exceeds `brief.budget`, including when passed out-of-range
  scores like `(brief, 99, 99)`.
- Every function is a pure function: calling it twice with the same arguments returns
  the same result, and it does not mutate the brief.

---

## 4. `src/lib/game/levelRules.ts`

```ts
import { LEVEL_1 } from '$lib/types/contracts';

/** Both conditions must hold: five commissions AND $500 banked. */
export function isLevelComplete(state: { cash: number; commissionsCompleted: number }): boolean;

/** Fractions in the range 0-1, for the HUD progress bars. */
export function levelProgress(state: { cash: number; commissionsCompleted: number }): {
	commissions: number;
	cash: number;
	/** The lower of the two, i.e. how close the player is to the actual win. */
	overall: number;
};
```

Each fraction is `clamp(value / target, 0, 1)`. `overall` is `Math.min(commissions, cash)`.

### Tests

| Input                                    | `isLevelComplete` | `commissions` | `cash` | `overall` |
| ---------------------------------------- | ----------------- | ------------- | ------ | --------- |
| `{ cash: 100, commissionsCompleted: 0 }` | `false`           | 0             | 0.2    | 0         |
| `{ cash: 500, commissionsCompleted: 4 }` | `false`           | 0.8           | 1      | 0.8       |
| `{ cash: 499, commissionsCompleted: 5 }` | `false`           | 1             | 0.998  | 0.998     |
| `{ cash: 500, commissionsCompleted: 5 }` | `true`            | 1             | 1      | 1         |
| `{ cash: 900, commissionsCompleted: 9 }` | `true`            | 1             | 1      | 1         |

---

## 5. `src/lib/data/briefs.ts`

Six briefs, so a five-commission run has variety without repeats. Use these exactly —
the scoring tests above depend on `c1`, `c2` and `c3`.

```ts
export const LEVEL_1_BRIEFS: readonly ClientBrief[] = [
	{
		id: 'c1',
		clientName: 'Local Cafe Owner',
		avatarUrl: '/avatars/c1.svg',
		requestText:
			'I need a painting of a cozy coffee cup sitting on a wooden table. Something warm for the back wall.',
		budget: 100,
		preferredKeywords: ['coffee', 'cup', 'cozy', 'table']
	},
	{
		id: 'c2',
		clientName: 'Fantasy Novelist',
		avatarUrl: '/avatars/c2.svg',
		requestText:
			'Draw me a glowing magical sword stuck in a stone. It is for the cover of my next book.',
		budget: 150,
		preferredKeywords: ['sword', 'glowing', 'magic', 'stone']
	},
	{
		id: 'c3',
		clientName: 'Cat Enthusiast',
		avatarUrl: '/avatars/c3.svg',
		requestText: 'A majestic fluffy cat wearing a tiny golden crown. Make him look regal.',
		budget: 120,
		preferredKeywords: ['cat', 'fluffy', 'crown', 'gold']
	},
	{
		id: 'c4',
		clientName: 'Retired Sailor',
		avatarUrl: '/avatars/c4.svg',
		requestText:
			'A little wooden sailboat on rough ocean waves at sunset. Reminds me of the old days.',
		budget: 130,
		preferredKeywords: ['sailboat', 'ocean', 'waves', 'sunset']
	},
	{
		id: 'c5',
		clientName: 'Indie Band Manager',
		avatarUrl: '/avatars/c5.svg',
		requestText: 'We need album art: a lonely astronaut floating above a neon city. Moody, please.',
		budget: 170,
		preferredKeywords: ['astronaut', 'floating', 'neon', 'city']
	},
	{
		id: 'c6',
		clientName: 'Botanical Gardener',
		avatarUrl: '/avatars/c6.svg',
		requestText: 'Could you paint a greenhouse full of blooming tropical flowers in morning light?',
		budget: 110,
		preferredKeywords: ['greenhouse', 'flowers', 'tropical', 'light']
	}
];
```

Validate the array once at module load with `clientBriefSchema` from the contract, so a
typo in this data fails fast and loudly rather than producing a broken commission at
runtime:

```ts
import { clientBriefSchema } from '$lib/types/contracts';
import { z } from 'zod';

// Throws at import time if any brief is malformed.
z.array(clientBriefSchema).parse(LEVEL_1_BRIEFS);
```

### `pickBrief`

```ts
/**
 * Choose the next client. `random` is injected so tests and replays are deterministic;
 * production passes nothing and gets `Math.random`.
 *
 * When every brief has already been used the pool resets rather than returning null,
 * so a long run never runs out of clients.
 */
export function pickBrief(options?: {
	excludeIds?: readonly string[];
	random?: () => number;
}): ClientBrief;
```

Algorithm:

1. `const random = options?.random ?? Math.random`
2. `let pool = LEVEL_1_BRIEFS.filter(b => !(options?.excludeIds ?? []).includes(b.id))`
3. `if (pool.length === 0) pool = [...LEVEL_1_BRIEFS]`
4. `const index = Math.min(Math.floor(random() * pool.length), pool.length - 1)`
5. Return `pool[index]`

Step 4's `Math.min` guards the edge case where an injected `random` returns exactly
`1`, which would otherwise index off the end of the array.

### Tests for `briefs.ts`

- `LEVEL_1_BRIEFS` has length 6, and every `id` is unique.
- Every brief parses against `clientBriefSchema`.
- `pickBrief({ random: () => 0 })` returns `c1`.
- `pickBrief({ random: () => 0.99 })` returns `c6`.
- `pickBrief({ random: () => 1 })` returns `c6` and does not throw.
- `pickBrief({ excludeIds: ['c1'], random: () => 0 })` returns `c2`.
- `pickBrief({ excludeIds: ['c1','c2','c3','c4','c5','c6'], random: () => 0 })` returns
  `c1` — the pool reset.
- Calling `pickBrief` does not mutate `LEVEL_1_BRIEFS`.

---

## 6. `src/lib/game/index.ts`

Re-export the public surface so other layers import from one place:

```ts
export { sanitizePlayerPrompt, buildLevel1Prompt, MAX_PROMPT_LENGTH } from './promptPipeline';
export { scorePrompt, calculatePayout, toGalleryScore, reputationGain } from './scoring';
export type { ScoreBreakdown } from './scoring';
export { isLevelComplete, levelProgress } from './levelRules';
export { normalize, stem, STOPWORDS } from './text';
```

---

## Definition of done

- [ ] Every file in the table exists, with TSDoc on every exported symbol.
- [ ] Every row of every test table above is an assertion that passes.
- [ ] No imports from `svelte`, `$app/*`, `node:*`, or anything that touches I/O.
- [ ] No `Math.random`, `Date.now`, or any other ambient nondeterminism outside the
      injectable `random` default in `pickBrief`.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` all green.
- [ ] `src/lib/game/README.md` and `src/lib/data/README.md` written.
- [ ] Handoff entry appended to `docs/agent-log.md`.
