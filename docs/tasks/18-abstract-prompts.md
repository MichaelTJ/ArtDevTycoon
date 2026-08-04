# Spec 18 — Progressive Abstract Prompts (kitchen mum → mood briefs)

**Worktree:** `git worktree add -b agent/abstract-prompts ../adt-wt-abstract-prompts main`
**Depends on:** Specs 01–04 and 12–16 merged (playable loop + prestige tiers). Does **not**
depend on 05–11 or 17. Presentation (Phaser kitchen) is orthogonal — this spec owns the
**words clients say** and **how the critic scores them**.

## Mission

Today every Level 1 walk-in asks for a concrete subject ("cozy coffee cup", "fluffy cat
with a crown"). That is fine for the first commissions in Mum's kitchen, but it never
gets harder as a _prompting_ challenge. Spec 15's billionaire tier jumps straight to
"paint the feeling of a Tuesday" with the same keyword-overlap scorer — so parroting
`tuesday feeling ordinary` still "works", and there is no mid-game ramp.

This spec makes the walk-in ladder teach prompting:

1. **Round 1 kitchen** — Mum asks for simple, paint-me-a-thing briefs ("Paint me a cat").
2. **As commissions accumulate** — requests get progressively more abstract
   ("I miss the old days"), so the player must invent a concrete scene.
3. **Abstract critique** — accuracy no longer rewards echoing the vague request words.
   It scores whether the player committed to a _valid interpretation cluster_ (e.g.
   faded family photo / childhood summer / Sunday dinner) and filled that cluster out.

The comedy of Level 1 crayon modifiers stays untouched. Only the brief text and the
scoring target change.

---

## Ownership zone

```
New:
  src/lib/data/kitchenBriefs.ts
  src/lib/data/kitchenBriefs.test.ts
  src/lib/game/abstractCritique.ts
  src/lib/game/abstractCritique.test.ts
  src/lib/components/AbstractBriefHint.svelte
  src/lib/components/AbstractBriefHint.svelte.test.ts

Edit — Wave D1 domain agent (`agent/abstract-prompts`):
  src/lib/data/briefs.ts
  src/lib/data/briefs.test.ts
  src/lib/data/README.md
  src/lib/game/scoring.ts
  src/lib/game/scoring.test.ts
  src/lib/game/index.ts
  src/lib/game/README.md
  docs/agent-log.md                       ← domain handoff

Edit — Wave D2 wire agent (`agent/abstract-prompts-wire`):
  src/lib/engines/critiqueProtocol.ts
  src/lib/engines/critiqueProtocol.test.ts
  src/lib/engines/mock/mockEngine.ts
  src/lib/engines/mock/mockEngine.test.ts
  src/lib/engines/janus/janusEngine.ts    ← use critiqueTargetsForBrief only (§6)
  src/lib/engines/remote/remoteEngine.ts  ← use critiqueTargetsForBrief only (§6)
  src/lib/engines/README.md
  src/lib/stores/gameState.svelte.ts      ← pass commissionsCompleted into pickBrief (§7)
  src/lib/stores/gameState.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  src/lib/components/StudioHudOverlay.svelte   ← mount AbstractBriefHint when briefing (§8)
  OR src/routes/+page.svelte                   ← if StudioHudOverlay is not where brief UI lives
  docs/architecture.md                    ← §1 paragraph only (§9)
  docs/agent-log.md                       ← wire handoff
```

**Contracts:** the orchestrator lands §1 on `main` before Wave D starts. Task agents
**MUST NOT** edit `src/lib/types/contracts.ts`. Do not edit `package.json`, lockfiles,
or other orchestrator-owned config.

Do **not** rewrite corporate / billionaire / auction pools. Those keep working. Optionally
tag billionaire briefs with `abstractness: 2` and clusters in a follow-up; **out of scope
here** unless a billionaire brief's existing `preferredKeywords` tests break — then leave
billionaire literals unchanged (`abstractness` defaults to `0` and they keep keyword scoring).

---

## 1. Extending `contracts.ts` (additive only)

```ts
/** How figurative a walk-in request is. 0 = paint-the-thing, 2 = pure mood/memory. */
export const ABSTRACTNESS_LEVELS = [0, 1, 2] as const;
export type AbstractnessLevel = (typeof ABSTRACTNESS_LEVELS)[number];

export const interpretationClusterSchema = z.object({
	/** Stable id for tests and critic copy, e.g. 'nostalgia-photo'. */
	id: z.string().min(1),
	/** Short critic-facing label, e.g. 'a faded family photograph'. */
	label: z.string().min(1),
	/** Concrete visual concepts that count as committing to this interpretation. */
	keywords: z.array(z.string().min(1)).min(2).max(6)
});

export type InterpretationCluster = z.infer<typeof interpretationClusterSchema>;

export const clientBriefSchema = z.object({
	id: z.string().min(1),
	clientName: z.string().min(1),
	avatarUrl: z.string().min(1),
	requestText: z.string().min(1),
	budget: z.number().int().positive(),
	preferredKeywords: z.array(z.string().min(1)).min(1),

	tier: z.enum(CLIENT_TIERS).default('walk-in'),
	seriesId: z.string().optional(),
	seriesPosition: z.number().int().positive().optional(),
	paletteConstraint: z.array(z.string().min(1)).optional(),

	// --- added by spec 18, all optional/defaulted so every existing brief literal
	// (Level 1, corporate, billionaire, auction) keeps parsing unchanged ---
	/**
	 * 0 (default) = concrete subject; score via preferredKeywords as today.
	 * 1 = evocative / memory ("something warm from when you were little").
	 * 2 = pure mood ("I miss the old days") — player must invent the scene.
	 */
	abstractness: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
	/**
	 * Valid concrete readings of an abstract brief. Required in content for
	 * abstractness >= 1 (enforced by kitchenBriefs tests, not by Zod — so prestige
	 * pools without clusters stay valid).
	 */
	interpretationClusters: z.array(interpretationClusterSchema).optional()
});
```

`ClientBrief` remains `z.input<typeof clientBriefSchema>` so existing literals omit the
new fields. After this edit, run the **existing** unit suite once before writing new
files — any failure means the schema change was not additive enough.

---

## 2. Content — `src/lib/data/kitchenBriefs.ts`

Replace the narrative role of the six generic Level 1 walk-ins with a **kitchen mum
ladder**. Export:

```ts
export const KITCHEN_BRIEFS: readonly ClientBrief[]; // parsed via clientBriefSchema
```

`LEVEL_1_BRIEFS` in `briefs.ts` **becomes** `KITCHEN_BRIEFS` (re-export under the old
name for compatibility):

```ts
// briefs.ts
import { KITCHEN_BRIEFS } from './kitchenBriefs';
export const LEVEL_1_BRIEFS = KITCHEN_BRIEFS;
```

Keep ids `c1`…`c6` **plus** new ids `c7`… as needed — tests and gallery history already
reference `c1`–`c6` in places; **do not renumber** the first six ids. Rewrite their
`requestText` / keywords / clusters to match the ladder below. Prestige pools stay on
their own ids.

### 2.1 Band rules

| `abstractness` | When eligible                                                            | Voice                                  | Scoring path                        |
| -------------- | ------------------------------------------------------------------------ | -------------------------------------- | ----------------------------------- |
| `0`            | Always (and **forced** for first invite at `commissionsCompleted === 0`) | Mum, concrete "paint me a …"           | `preferredKeywords` only (today)    |
| `1`            | `reputation >= 8` **or** `commissionsCompleted >= 12`                    | Evocative / soft memory, still a hint  | Best `interpretationClusters` match |
| `2`            | `reputation >= 16` **or** `commissionsCompleted >= 20`                   | Pure mood / longing — no subject named | Best `interpretationClusters` match |

### 2.2 Required briefs (exact content)

Implement **at least** these twelve (six rewritten `c1`–`c6`, six new). Budgets stay in
the walk-in 90–170 band.

**Band 0 — concrete (Mum's kitchen)**

| id  | clientName | requestText (verbatim)                           | preferredKeywords         | abstractness |
| --- | ---------- | ------------------------------------------------ | ------------------------- | ------------ |
| c1  | Mum        | Paint me a cool cat.                             | `['cat', 'cool']`         | 0            |
| c2  | Mum        | Can you draw a nice cup of tea for the fridge?   | `['tea', 'cup']`          | 0            |
| c3  | Mum        | Paint me a beautiful flower. Something cheerful. | `['flower', 'beautiful']` | 0            |
| c7  | Mum        | Draw a cool little bird on the windowsill.       | `['bird', 'cool']`        | 0            |
| c13 | Mum        | Paint me a cool car for the garage wall.         | `['car', 'cool']`         | 0            |
| c14 | Mum        | Draw a beautiful fairy.                          | `['fairy', 'beautiful']`  | 0            |

Use `avatarUrl: '/avatars/c1.svg'` for Mum (reuse existing asset). `clientName` is exactly
`Mum` for band 0 so the kitchen read is obvious.

**Band 1 — evocative**

| id  | clientName     | requestText                                          | preferredKeywords (weak anchors — not the scoring path) | clusters (id / label / keywords)                                                                                                                               |
| --- | -------------- | ---------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| c4  | Neighbour June | Draw something lovely from when you were little.     | `['warm', 'little']`                                    | `childhood-summer`: childhood summer — `['childhood','summer','garden','bicycle']`; `kitchen-baking`: baking with mum — `['baking','cookies','flour','apron']` |
| c5  | Uncle Ray      | Paint a cozy rainy afternoon indoors.                | `['rain', 'afternoon']`                                 | `window-rain`: rain on the glass — `['rain','window','droplets','grey']`; `sofa-book`: curled up reading — `['sofa','book','blanket','lamp']`                  |
| c8  | Cousin Priya   | I want the feeling of coming home after a long trip. | `['home', 'trip']`                                      | `front-door`: key in the door — `['door','key','hallway','shoes']`; `kitchen-light`: kitchen light on — `['kitchen','light','kettle','table']`                 |

**Band 2 — pure mood**

| id  | clientName        | requestText                                               | preferredKeywords     | clusters                                                                                                                                                                                                                                                |
| --- | ----------------- | --------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| c6  | Mum               | I miss the old days.                                      | `['miss', 'old']`     | `nostalgia-photo`: faded family photograph — `['photograph','sepia','album','faded']`; `sunday-dinner`: Sunday dinner table — `['sunday','dinner','family','tablecloth']`; `vinyl-evening`: vinyl and lamplight — `['vinyl','record','lamp','evening']` |
| c9  | Quiet Regular     | It used to be simpler.                                    | `['simple', 'used']`  | `empty-swing`: empty playground swing — `['swing','playground','empty','dusk']`; `paper-letters`: handwritten letters — `['letter','handwriting','envelope','ink']`                                                                                     |
| c10 | Night-Shift Nurse | Paint whatever peace looks like.                          | `['peace', 'looks']`  | `still-lake`: still lake at dawn — `['lake','dawn','still','mist']`; `sleeping-cat`: sleeping cat in a sunbeam — `['cat','sunbeam','sleeping','cushion']`                                                                                               |
| c11 | Bookshop Owner    | Something that feels like a memory you can't quite place. | `['memory', 'place']` | `blurred-street`: rain-blurred street — `['street','blur','rain','neon']`; `attic-box`: attic memory box — `['attic','box','ribbon','dust']`                                                                                                            |
| c12 | Mum               | Just… something that feels like home.                     | `['home', 'feels']`   | `porch-light`: porch light left on — `['porch','light','night','welcome']`; `worn-armchair`: worn armchair — `['armchair','worn','knit','window']`                                                                                                      |

Every band ≥1 brief **MUST** have `interpretationClusters` with **at least 2** clusters,
each with **2–6** keywords. `tier` stays default/`walk-in`.

Avatar urls: reuse `/avatars/c1.svg` … `/avatars/c6.svg` in rotation — no new assets.

### 2.3 Tests (`kitchenBriefs.test.ts`)

- Every brief parses with `clientBriefSchema`.
- Exactly the band-0 ids above have `abstractness === 0` and omit clusters (or empty).
- Every brief with `abstractness >= 1` has `interpretationClusters!.length >= 2`.
- Mum appears on `c1`, `c2`, `c3`, `c6`, `c7`, `c12`, `c13`, `c14`.
- `c6.requestText` is exactly `I miss the old days.`

---

## 3. Abstract critique — `src/lib/game/abstractCritique.ts`

This is the **method** for scoring abstract requests. Pure functions, no Svelte, no I/O.

```ts
import type { ClientBrief, InterpretationCluster } from '$lib/types/contracts';
import { keywordMatches } from './scoring';
import { normalize, stem, STOPWORDS } from './text';

export interface ClusterMatch {
	cluster: InterpretationCluster;
	/** Keywords from the cluster that fuzzy-matched the prompt. */
	matchedKeywords: string[];
	/** Keywords from the cluster that did not match. */
	missedKeywords: string[];
	/** matched / cluster.keywords.length, 0..1 */
	ratio: number;
}

/**
 * True when the brief should use interpretation-cluster scoring instead of
 * preferredKeywords. Concrete briefs (0) and prestige briefs without clusters
 * stay on the legacy path.
 */
export function usesInterpretationScoring(brief: ClientBrief): boolean {
	const level = brief.abstractness ?? 0;
	const clusters = brief.interpretationClusters;
	return level >= 1 && Array.isArray(clusters) && clusters.length > 0;
}

/** Score every cluster; highest ratio wins. Ties → first in array order. */
export function selectBestCluster(brief: ClientBrief, playerPrompt: string): ClusterMatch | null;

/**
 * Keywords a vision critic should ask about for this brief+prompt pair.
 * - Concrete / no clusters → preferredKeywords (unchanged).
 * - Abstract with a best cluster → that cluster's keywords.
 * - Abstract with zero cluster overlap → empty array (caller scores accuracy 1).
 */
export function critiqueTargetsForBrief(brief: ClientBrief, playerPrompt: string): string[];

/**
 * True when the prompt only echoes words from the vague request (and stopwords)
 * without hitting any cluster keyword. Used to keep parrot prompts at accuracy 1.
 */
export function isAbstractParrot(brief: ClientBrief, playerPrompt: string): boolean;
```

### 3.1 Algorithms (implement exactly)

```ts
export function selectBestCluster(brief: ClientBrief, playerPrompt: string): ClusterMatch | null {
	const clusters = brief.interpretationClusters;
	if (!clusters || clusters.length === 0) return null;

	const promptStems = new Set(normalize(playerPrompt).map(stem));
	let best: ClusterMatch | null = null;

	for (const cluster of clusters) {
		const matchedKeywords: string[] = [];
		const missedKeywords: string[] = [];
		for (const keyword of cluster.keywords) {
			if (keywordMatches(keyword, promptStems)) matchedKeywords.push(keyword);
			else missedKeywords.push(keyword);
		}
		const ratio = matchedKeywords.length / cluster.keywords.length;
		const candidate: ClusterMatch = { cluster, matchedKeywords, missedKeywords, ratio };
		if (!best || candidate.ratio > best.ratio) best = candidate;
	}
	return best;
}

export function critiqueTargetsForBrief(brief: ClientBrief, playerPrompt: string): string[] {
	if (!usesInterpretationScoring(brief)) {
		return [...brief.preferredKeywords];
	}
	const best = selectBestCluster(brief, playerPrompt);
	if (!best || best.ratio === 0) return [];
	return [...best.cluster.keywords];
}

export function isAbstractParrot(brief: ClientBrief, playerPrompt: string): boolean {
	if (!usesInterpretationScoring(brief)) return false;
	const best = selectBestCluster(brief, playerPrompt);
	if (best && best.ratio > 0) return false;

	const promptTokens = normalize(playerPrompt).filter((t) => !STOPWORDS.has(t));
	if (promptTokens.length === 0) return true;

	const requestStems = new Set(normalize(brief.requestText).map(stem));
	// Also treat preferredKeywords as "request echo" stems
	for (const kw of brief.preferredKeywords) {
		for (const t of normalize(kw)) requestStems.add(stem(t));
	}

	return promptTokens.every((t) => requestStems.has(stem(t)));
}
```

### 3.2 Worked examples (`abstractCritique.test.ts`)

Use brief `c6` ("I miss the old days.") from kitchen content.

| playerPrompt                                      | best cluster id   | ratio | isAbstractParrot | critiqueTargets (sorted) |
| ------------------------------------------------- | ----------------- | ----- | ---------------- | ------------------------ |
| `I miss the old days`                             | any @ ratio 0     | 0     | true             | `[]`                     |
| `miss old`                                        | any @ ratio 0     | 0     | true             | `[]`                     |
| `a faded sepia photograph in a family album`      | `nostalgia-photo` | 0.75  | false            | photo cluster keywords   |
| `sunday dinner with family around the tablecloth` | `sunday-dinner`   | 1.0   | false            | sunday-dinner keywords   |
| `vinyl record playing under a warm lamp evening`  | `vinyl-evening`   | 1.0   | false            | vinyl-evening keywords   |
| `dragon spaceship laser`                          | any @ ratio 0     | 0     | false            | `[]`                     |

For a concrete brief (`c1`, "Paint me a cat."):

| playerPrompt   | usesInterpretationScoring | critiqueTargets |
| -------------- | ------------------------- | --------------- |
| `a fluffy cat` | false                     | `['cat']`       |

---

## 4. Wire into `scorePrompt` — `src/lib/game/scoring.ts`

Keep the public signature:

```ts
export function scorePrompt(brief: ClientBrief, playerPrompt: string): ScoreBreakdown;
```

Branch at the top:

```ts
export function scorePrompt(brief: ClientBrief, playerPrompt: string): ScoreBreakdown {
	if (usesInterpretationScoring(brief)) {
		return scoreAbstractPrompt(brief, playerPrompt);
	}
	// existing preferredKeywords path unchanged
	...
}

function scoreAbstractPrompt(brief: ClientBrief, playerPrompt: string): ScoreBreakdown {
	if (isAbstractParrot(brief, playerPrompt)) {
		return {
			matchedKeywords: [],
			missedKeywords: brief.interpretationClusters?.flatMap((c) => c.keywords) ?? [],
			accuracyScore: 1,
			creativityScore: creativityFromPrompt(playerPrompt) // extract existing unique-word math
		};
	}

	const best = selectBestCluster(brief, playerPrompt);
	if (!best || best.ratio === 0) {
		// Invented something, but not a recognised reading — low accuracy, creativity still counts
		return {
			matchedKeywords: [],
			missedKeywords: brief.interpretationClusters?.flatMap((c) => c.keywords) ?? [],
			accuracyScore: 2,
			creativityScore: creativityFromPrompt(playerPrompt)
		};
	}

	const accuracyScore = clamp(Math.round(1 + best.ratio * 9), 1, 10);
	return {
		matchedKeywords: best.matchedKeywords,
		missedKeywords: best.missedKeywords,
		accuracyScore,
		creativityScore: creativityFromPrompt(playerPrompt)
	};
}
```

Extract the existing unique-word creativity block into a private or exported
`creativityFromPrompt(playerPrompt: string): number` so both paths share one formula.
Do **not** change the creativity numbers for concrete briefs.

### 4.1 Payout weight for abstract briefs

Abstract briefs are harder to "aim" — reward committing to an interpretation by tilting
payout toward creativity **only when** `usesInterpretationScoring(brief)`:

```ts
export function calculatePayout(
	brief: ClientBrief,
	accuracyScore: number,
	creativityScore: number,
	multiplier = 1
): number {
	const accuracyWeight = usesInterpretationScoring(brief) ? 0.5 : 0.7;
	const creativityWeight = 1 - accuracyWeight;
	const quality = (accuracyScore * accuracyWeight + creativityScore * creativityWeight) / 10;
	return clamp(
		Math.round(brief.budget * quality * multiplier),
		0,
		Math.round(brief.budget * multiplier)
	);
}
```

### 4.2 Scoring test table additions

Keep every existing concrete `c1`/`c2`/`c3` case green (update fixtures if `c1` keywords
changed — `c1` is now just `['cat']`:

| brief | prompt                                            | accuracy | notes                          |
| ----- | ------------------------------------------------- | -------- | ------------------------------ |
| c1    | `cat`                                             | 10       | full match on single keyword   |
| c1    | `dog`                                             | 1        | miss                           |
| c6    | `I miss the old days`                             | 1        | parrot                         |
| c6    | `a faded sepia photograph in a family album`      | 8        | ratio 0.75 → `1+round(6.75)=8` |
| c6    | `sunday dinner with family around the tablecloth` | 10       | ratio 1.0                      |

`calculatePayout` for abstract: with accuracy 10, creativity 10, budget 130, multiplier 1,
weights 0.5/0.5 → quality 1.0 → payout `130`. With accuracy 1, creativity 10 → quality
0.55 → payout `72` (round 71.5→72). Put these exact numbers in `scoring.test.ts`.

---

## 5. Band gating — `pickBrief`

Extend options:

```ts
export function pickBrief(options?: {
	excludeIds?: readonly string[];
	unlockedTiers?: readonly ClientTier[];
	completedSeriesIds?: readonly string[];
	/**
	 * Lifetime commissions finished. Gates walk-in abstractness bands.
	 * Defaults to `0` so existing callers only see abstractness 0 kitchen briefs
	 * (plus whatever prestige tiers they unlocked).
	 */
	commissionsCompleted?: number;
	random?: () => number;
}): ClientBrief;
```

### 5.1 Eligibility helper (in `briefs.ts` or `kitchenBriefs.ts`)

```ts
/** Highest abstractness a walk-in may have at this progress. */
export function maxWalkInAbstractness(commissionsCompleted: number): AbstractnessLevel {
	if (commissionsCompleted >= 4) return 2;
	if (commissionsCompleted >= 2) return 1;
	return 0;
}

export function isBriefEligibleForProgress(
	brief: ClientBrief,
	commissionsCompleted: number
): boolean {
	const level = brief.abstractness ?? 0;
	if ((brief.tier ?? 'walk-in') !== 'walk-in') return true; // prestige unchanged
	return level <= maxWalkInAbstractness(commissionsCompleted);
}
```

### 5.2 First-client guarantee

When `commissionsCompleted === 0` and the unlocked tiers include `walk-in`, **force** the
picked brief to be a band-0 Mum brief from `{c1,c2,c3,c7}` (random among those not in
`excludeIds`; if all excluded, pick among all band-0 Mum briefs). This makes the opening
shot always "kitchen with Mum" and a paint-me-a-thing ask.

Pseudo:

```ts
if (commissionsCompleted === 0 && unlockedTiers.includes('walk-in')) {
	const openerIds = new Set(['c1', 'c2', 'c3', 'c7']);
	let openers = KITCHEN_BRIEFS.filter((b) => openerIds.has(b.id) && !excludeIds.includes(b.id));
	if (openers.length === 0) {
		openers = KITCHEN_BRIEFS.filter((b) => (b.abstractness ?? 0) === 0);
	}
	// pick with random from openers, return early
}
```

### 5.3 Pool filter

In `buildPool`, after tier/series filters, also drop walk-ins where
`!isBriefEligibleForProgress(brief, commissionsCompleted)`.

### 5.4 Tests

| commissionsCompleted | unlockedTiers               | assertion                                                                  |
| -------------------- | --------------------------- | -------------------------------------------------------------------------- |
| 0                    | `['walk-in']`               | 50 seeded draws → every id ∈ `{c1,c2,c3,c7}`                               |
| 1                    | `['walk-in']`               | never returns abstractness ≥ 1                                             |
| 2                    | `['walk-in']`               | across 80 draws, at least one abstractness 1 appears; never abstractness 2 |
| 4                    | `['walk-in']`               | across 80 draws, at least one abstractness 2 (incl. `c6`) appears          |
| 0                    | `['walk-in','billionaire']` | still never returns abstractness 2 walk-in; billionaire may appear         |

---

## 6. Engines — shared critique targets

### 6.1 `critiqueProtocol.ts`

Add a thin re-export/wrapper so engines do not import game scoring internals twice:

```ts
import { critiqueTargetsForBrief } from '$lib/game/abstractCritique';
// re-export for engine callers
export { critiqueTargetsForBrief };
```

Or simply have engines import from `$lib/game` / `$lib/game/abstractCritique`. Prefer
importing from `$lib/game` once re-exported in `game/index.ts`.

### 6.2 Mock / Janus / Remote

In each engine's `critique` method, **replace**:

```ts
const keywords = input.brief.preferredKeywords.slice(0, MAX_KEYWORD_QUESTIONS);
```

with:

```ts
const keywords = critiqueTargetsForBrief(input.brief, input.playerPrompt).slice(
	0,
	MAX_KEYWORD_QUESTIONS
);
```

When `keywords.length === 0` (abstract parrot / no cluster):

- **Mock:** `accuracyScore = 1` (or use `scorePrompt` as today — mock already calls
  `scorePrompt`, which handles abstract. Keep mock on `scorePrompt` for accuracy; only
  ensure review text mentions interpretation when clusters were used — see below).
- **Janus / Remote:** skip vision keyword questions; set `accuracyScore = 1`; still
  request a short review via `buildReviewPrompt`.

### 6.3 Mock review copy for abstract

When `usesInterpretationScoring(brief)` and `selectBestCluster` has `ratio > 0`, prefer a
review that names the cluster label:

```
{client} asked for a feeling — you answered with {label}. {band-closer}
```

Add 2–3 templates to `reviewTemplates.ts` **or** inline in `mockEngine.ts` a small
`ABSTRACT_REVIEW_TEMPLATES` map keyed by score band. Matched/missed placeholders may use
cluster keywords. Tests: for c6 + a nostalgia-photo prompt, `criticReview` contains
`photograph` or `faded` or the label substring `photograph` (case-insensitive).

### 6.4 Engine tests

- Update any mock test that assumed `c1.preferredKeywords` still has four coffee words.
- Add: abstract parrot prompt → accuracy 1.
- Add: abstract full cluster prompt → accuracy 10 (mock path via `scorePrompt`).
- Janus/remote unit tests that stub keyword questions: assert
  `critiqueTargetsForBrief` keywords are what get asked (inject/spy if the test already
  spies on question building — do not download models).

---

## 7. `GameStore` wiring

In `inviteClient()`:

```ts
this.currentClient = pickBrief({
	excludeIds: /* existing */,
	unlockedTiers: unlockedClientTiers(this.reputation),
	completedSeriesIds: /* existing */,
	commissionsCompleted: this.commissionsCompleted,
	random: this.#random
});
```

**Tests:** with a fresh store (`commissionsCompleted === 0`), `inviteClient` 20 times with
seeded random always yields Mum band-0 (`abstractness === 0`, id in opener set). After
forcing `commissionsCompleted = 4` and clearing history exclusions as needed, inviting
enough times eventually yields an `abstractness === 2` walk-in.

No save-schema changes — `commissionsCompleted` / `lifetimeCommissions` already persist
via spec 12.

---

## 8. UI — `AbstractBriefHint.svelte`

Presentational only. Shown during `briefing` when `brief.abstractness >= 1`.

| Prop           | Type                |
| -------------- | ------------------- |
| `abstractness` | `AbstractnessLevel` |

Copy (exact):

- `abstractness === 1`: `They didn't name a subject — pick a concrete scene that fits the feeling.`
- `abstractness === 2`: `This is a mood, not a shopping list. Invent something specific.`

No clusters leaked to the player (that would spoil the puzzle). Mount next to the brief
speech / prompt composer in whichever shell currently shows the client request
(`StudioHudOverlay.svelte` if that is where briefing UI lives after spec 17; otherwise
`+page.svelte`). One targeted mount, not a redesign.

**Tests:** renders the band-2 sentence when `abstractness={2}`; renders nothing visible
(or empty) when `abstractness={0}` — implement by `{#if abstractness >= 1}` so band 0
mounts to an empty fragment / null.

Export from `src/lib/components/index.ts` and document in the components README.

---

## 9. Architecture blurb

Append to `docs/architecture.md` §1 (after the existing Level 1 paragraph), exact text:

```markdown
Walk-in briefs escalate in abstractness as lifetime commissions rise (spec 18): Mum's
first asks are concrete ("Paint me a cat"), then evocative, then pure mood ("I miss the
old days"). Abstract briefs are scored by interpretation clusters — whether the player
committed to a valid concrete reading — not by echoing the vague request words. Vision
engines ask yes/no questions about the chosen cluster's keywords via
`critiqueTargetsForBrief`.
```

---

## 10. Definition of done

- [x] `clientBriefSchema` accepts all pre-existing brief literals unchanged (default
      `abstractness: 0`).
- [x] First invite at `commissionsCompleted === 0` is always a Mum band-0 kitchen ask.
- [x] Band 1 unlocks at 2 commissions; band 2 at 4 — verified by `pickBrief` tests.
- [x] `c6` request text is `I miss the old days.` and parrot prompts score accuracy 1.
- [x] A prompt that fills a c6 cluster (e.g. sunday dinner) scores accuracy 10.
- [x] Mock, Janus, and Remote critique paths use `critiqueTargetsForBrief` (no direct
      `preferredKeywords` slice for question building).
- [x] `AbstractBriefHint` shows only for abstractness ≥ 1.
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for owned files.
- [x] Directory READMEs + `docs/agent-log.md` handoff updated.

## 11. Explicitly out of scope

- Rewriting corporate / billionaire / auction brief copy to use clusters (billionaires
  already feel abstract in flavour text; cluster scoring can land in a later polish).
- New avatar art for Mum / relatives.
- Changing Level 1 crayon `promptModifiers` or generation quality.
- Phaser scene changes (Mum sprite, kitchen props) — spec 17 owns the floor.
- Player-facing display of interpretation clusters or preferred keywords.
- Difficulty settings / manual abstractness unlocks.

---

## 12. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/18-abstract-prompts.md`.
>
> Read these four files completely before writing any code:
>
> 1. `best-practices.md` — the binding rules for this repo
> 2. `docs/architecture.md` — how the system fits together
> 3. `src/lib/types/contracts.ts` — apply only the additive §1 fields
> 4. `docs/tasks/18-abstract-prompts.md` — your spec
>
> The spec lists exactly which files to create and which paths you own. Do not create
> or modify any file outside your ownership zone. Do not edit `package.json`,
> `vite.config.ts`, `tsconfig.json`, or anything in `src/lib/types/` except the exact
> additive `clientBriefSchema` fields in §1. Do not run `npm install`. Do not run any
> git command that changes state — no commit, add, checkout, merge, or push.
>
> Implement every file in the spec, including its tests. Then run all three of these
> and fix anything they report in your own files:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Finally, write/update the directory README sections the spec asks for and append your
> handoff entry to `docs/agent-log.md` using the template in `best-practices.md` §6.3.
