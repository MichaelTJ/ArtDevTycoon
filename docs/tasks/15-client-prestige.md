# Spec 15 — Client Prestige & Demographics

**Worktree:** `git worktree add -b agent/client-prestige ../adt-wt-client-prestige main`
**Depends on:** Spec 12 (progression persistence) merged. Reads `reputation`, which spec 01
already accumulates every commission (`reputationGain` in `scoring.ts`) but which no
Level-1 system has ever gated anything on until now.

## Mission

Today every client is a flat, interchangeable name from a six-entry pool
(`LEVEL_1_BRIEFS`) — a cafe owner and a fantasy novelist behave identically. This spec
turns reputation into a key that unlocks three progressively stranger, higher-stakes kinds
of client on top of the existing walk-ins, plus a fourth mechanic that replaces the fixed
`brief.budget` payout entirely with a bidding war:

| Tier            | Unlocked at reputation | What's different                                                                                  |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `walk-in`       | Always                 | Today's behaviour, unchanged                                                                      |
| `corporate`     | 12                     | Three linked commissions that must share a consistent colour palette, paid as a series            |
| `billionaire`   | 30                     | Huge budgets, deliberately abstract/absurd briefs                                                 |
| `auction-house` | 50                     | No fixed budget — the finished piece is auctioned; payout depends entirely on the critic's scores |

## Ownership zone

```
New:
  src/lib/data/clientTiers.ts
  src/lib/data/clientTiers.test.ts
  src/lib/data/corporateBriefs.ts
  src/lib/data/billionaireBriefs.ts
  src/lib/data/auctionBriefs.ts
  src/lib/game/auction.ts
  src/lib/game/auction.test.ts
  src/lib/game/paletteSeries.ts
  src/lib/game/paletteSeries.test.ts
  src/lib/components/ClientTierBadge.svelte
  src/lib/components/ClientTierBadge.svelte.test.ts
  src/lib/components/AuctionResultPanel.svelte
  src/lib/components/AuctionResultPanel.svelte.test.ts

Edit (small, targeted — exact changes in §7):
  src/lib/types/contracts.ts          ← additive only, see §1
  src/lib/data/briefs.ts
  src/lib/data/briefs.test.ts
  src/lib/stores/gameState.svelte.ts
  src/lib/stores/gameState.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  docs/tasks/README.md
```

`contracts.ts` is touched by this spec only — coordinate with anyone else in flight on it,
and keep the edit exactly as additive as §1 describes. No other file in `src/lib/types/**`
changes.

---

## 1. Extending `contracts.ts` (additive only)

```ts
export const CLIENT_TIERS = ['walk-in', 'corporate', 'billionaire', 'auction-house'] as const;
export type ClientTier = (typeof CLIENT_TIERS)[number];

export const clientBriefSchema = z.object({
	id: z.string().min(1),
	clientName: z.string().min(1),
	avatarUrl: z.string().min(1),
	requestText: z.string().min(1),
	budget: z.number().int().positive(),
	preferredKeywords: z.array(z.string().min(1)).min(1),

	// --- added by spec 15, all optional/defaulted so the 6 existing Level 1 briefs and
	// every existing test that constructs a ClientBrief literal keep parsing unchanged ---
	tier: z.enum(CLIENT_TIERS).default('walk-in'),
	/** Links the 3 briefs of one corporate series together. Undefined outside `corporate`. */
	seriesId: z.string().optional(),
	/** 1-based position within its series, e.g. 1, 2, 3. Undefined outside `corporate`. */
	seriesPosition: z.number().int().positive().optional(),
	/** Colour words the corporate client expects across all 3 pieces in the series. */
	paletteConstraint: z.array(z.string().min(1)).optional()
});
```

Every existing `ClientBrief` object literal in the codebase (the 6 in `briefs.ts`, any test
fixtures) is missing these four fields and must keep compiling and parsing — that is what
`.default('walk-in')` and `.optional()` guarantee. Run the full existing test suite after
this edit before writing anything else; a single failure here means the schema change
was not as additive as intended.

---

## 2. `src/lib/data/clientTiers.ts` — gating metadata

```ts
export interface ClientTierInfo {
	id: ClientTier;
	name: string;
	tagline: string;
	requiredReputation: number;
	badgeColor: string; // Tailwind class fragment, e.g. 'bg-amber-100 text-amber-900'
	icon: string;
}

export const CLIENT_TIER_INFO: readonly ClientTierInfo[] = [
	{
		id: 'walk-in',
		name: 'Local Walk-in',
		tagline: 'Simple asks, small budgets.',
		requiredReputation: 0,
		badgeColor: 'bg-stone-100 text-stone-700',
		icon: '🚶'
	},
	{
		id: 'corporate',
		name: 'Corporate Buyer',
		tagline: 'On-brand, or not at all.',
		requiredReputation: 12,
		badgeColor: 'bg-blue-100 text-blue-900',
		icon: '💼'
	},
	{
		id: 'billionaire',
		name: 'Eccentric Billionaire',
		tagline: 'Money is no object. Neither is sense.',
		requiredReputation: 30,
		badgeColor: 'bg-purple-100 text-purple-900',
		icon: '🎩'
	},
	{
		id: 'auction-house',
		name: 'Auction House',
		tagline: 'No price tag. Just a gavel.',
		requiredReputation: 50,
		badgeColor: 'bg-rose-100 text-rose-900',
		icon: '🔨'
	}
] as const;

export function getClientTierInfo(tier: ClientTier): ClientTierInfo {
	return CLIENT_TIER_INFO.find((t) => t.id === tier) ?? CLIENT_TIER_INFO[0];
}

/** Every tier the player currently qualifies for, always including `walk-in`. */
export function unlockedClientTiers(reputation: number): ClientTier[] {
	return CLIENT_TIER_INFO.filter((t) => reputation >= t.requiredReputation).map((t) => t.id);
}
```

**Tests:** 4 tiers, strictly increasing `requiredReputation`; `unlockedClientTiers(0)` is
`['walk-in']`; `unlockedClientTiers(12)` includes `'corporate'` but not `'billionaire'`;
`unlockedClientTiers(50)` includes all four.

---

## 3. Content — three new brief pools

### `corporateBriefs.ts`

A **series** is 3 briefs sharing a `seriesId` and one `paletteConstraint` of 3 colour
words. Define at least 3 complete series (9 briefs total) so a long run doesn't repeat
immediately, following the exact object shape of `LEVEL_1_BRIEFS` in `briefs.ts` plus the
new fields:

```ts
{
  id: 'corp-1a', clientName: 'Meridian Bank', avatarUrl: '/avatars/corp-1.svg',
  requestText: 'We need lobby art: a skyline at dusk. Keep it navy and gold, like our logo.',
  budget: 280, preferredKeywords: ['skyline', 'dusk', 'city'],
  tier: 'corporate', seriesId: 'corp-1', seriesPosition: 1,
  paletteConstraint: ['navy', 'gold', 'cream']
}
```

Budgets in the 250-350 range per piece (roughly 2x a walk-in) reflect "consistent
corporate work," not "huge payday" — the billionaire tier is where the big numbers live.

### `billionaireBriefs.ts`

Budgets 800-2000. `requestText` and `preferredKeywords` are deliberately abstract —
reuse the flavour already validated as renderable content in
`data/modifier-explorer/sdturbo-webgpu/abstract-concept-*.png` (categories: dream logic,
infinite space, paradoxical imagery, the feeling of anxiety, visual representation of
time). At least 5 briefs, e.g.:

```ts
{
  id: 'bil-1', clientName: 'Reclusive Tech Founder', avatarUrl: '/avatars/bil-1.svg',
  requestText: 'Paint me the feeling of a Tuesday. You have complete creative freedom. Do not disappoint me.',
  budget: 1400, preferredKeywords: ['tuesday', 'feeling', 'ordinary'],
  tier: 'billionaire'
}
```

No new scoring mechanic is needed here — the existing fuzzy keyword matcher in
`scorePrompt` already handles loose, abstract keywords exactly like concrete ones. The
"difficulty" of a billionaire brief is entirely in how strange `preferredKeywords` are to
satisfy, which is content, not code.

### `auctionBriefs.ts`

Auction-house briefs have no meaningful fixed budget — `budget` is still required by the
frozen schema (`z.number().int().positive()`) so set it to a **reserve price** the auction
formula uses as its floor (see §4), not a payout cap. `preferredKeywords` stay generic
("skill", "detail", "composition") since there's no specific subject to serve — the client
just wants your best work:

```ts
{
  id: 'auc-1', clientName: "Hargrove's Auction House", avatarUrl: '/avatars/auc-1.svg',
  requestText: 'Bring us your finest current piece. We will let the room decide what it is worth.',
  budget: 200, // reserve price, not a payout cap — see auction.ts
  preferredKeywords: ['detail', 'skill', 'composition'],
  tier: 'auction-house'
}
```

3-4 briefs is enough variety (the auction mechanic itself, not the brief text, is what
varies each time).

---

## 4. `src/lib/game/auction.ts` — the bidding mechanic

Pure, injectable-random function — same discipline as `pickBrief`'s `random` parameter.

```ts
export interface AuctionResult {
	bidderCount: number;
	bids: number[];
	winningBid: number;
}

/**
 * `qualityScore` is the mean of accuracy and creativity (0-10, i.e. `toGalleryScore`'s
 * input scale before its rounding). More bidders show up, and each bids higher, as
 * quality rises — but every bid keeps a random +/-30% wobble so the same score never
 * pays exactly the same twice.
 */
export function resolveAuction(
	qualityScore: number,
	reservePrice: number,
	random: () => number = Math.random
): AuctionResult {
	const bidderCount = 3 + Math.floor(qualityScore / 2); // 3 bidders at score 0, 8 at score 10
	const bids: number[] = [];
	for (let i = 0; i < bidderCount; i++) {
		const base = reservePrice * (0.5 + (qualityScore / 10) * 1.5); // 0.5x-2.0x reserve, by quality
		const wobble = 0.8 + random() * 0.6; // 0.8x-1.4x
		bids.push(Math.round(base * wobble));
	}
	const winningBid = Math.max(reservePrice, ...bids);
	return { bidderCount, bids, winningBid };
}
```

**Worked examples (`auction.test.ts`, `random` stubbed to return a fixed sequence):**

| qualityScore | reservePrice | random() sequence          | bidderCount | bids                                         | winningBid               |
| ------------ | ------------ | -------------------------- | ----------- | -------------------------------------------- | ------------------------ |
| 0            | 200          | `[0, 0, 0]`                | 3           | `[80, 80, 80]`                               | 200 (reserve floor wins) |
| 10           | 200          | `[0, 0, 0, 0, 0, 0, 0, 0]` | 8           | eight `320`s (200 × 2.0 × 0.8)               | 320                      |
| 10           | 200          | `[1, 0, 0, 0, 0, 0, 0, 0]` | 8           | first is `560` (200 × 2.0 × 1.4), rest `320` | 560                      |
| 5            | 400          | `[0.5]*3`                  | 5           | 400 × 1.25 × 1.1 = `550` each                | 550                      |

Also test: `bidderCount` is `Math.min`-free (does not clamp above 8 for scores >10 — not
reachable since scores are 0-10, but assert the formula directly rather than special-casing
it); `winningBid` is never below `reservePrice` even with an all-zero `random`.

Unlike `calculatePayout`, **`resolveAuction`'s result is not clamped to `brief.budget`** —
that is the entire point of the mechanic ("its stats determine how high the bidding war
goes"). `GameStore` must call `resolveAuction` instead of `calculatePayout` when
`currentClient.tier === 'auction-house'`, never both.

---

## 5. `src/lib/game/paletteSeries.ts` — corporate consistency scoring

```ts
export interface SeriesCheckResult {
	/** How many of the 3 palette words this single prompt used. */
	paletteWordsUsed: number;
	/** True once >= 2 of 3 words are present — the bar for "on brand" on this piece. */
	onBrand: boolean;
}

/** Fuzzy-matches palette words against a prompt using the same stemming as `scorePrompt`. */
export function checkPaletteUsage(prompt: string, paletteConstraint: string[]): SeriesCheckResult;

/**
 * Called once the 3rd piece in a series is collected. `onBrandFlags` has exactly 3
 * entries, one per piece in series order. Returns the flat bonus paid on top of the
 * 3rd piece's own `calculatePayout` result — 0 if the series wasn't kept consistent.
 */
export function seriesCompletionBonus(onBrandFlags: boolean[]): number {
	const allOnBrand = onBrandFlags.length === 3 && onBrandFlags.every(Boolean);
	return allOnBrand ? 300 : 0;
}
```

Implement `checkPaletteUsage` by reusing `normalize`/`stem` from `$lib/game/text` (already
used by `scorePrompt`) — do not write a second tokenizer. A prompt is "on brand" for one
piece when at least 2 of the 3 `paletteConstraint` words fuzzy-match, using the exact same
matching rule `scorePrompt` already uses for brief keywords (see `keywordMatches` in
`scoring.ts` — import and reuse it rather than re-implementing).

**Tests:**

| prompt                            | paletteConstraint           | paletteWordsUsed | onBrand |
| --------------------------------- | --------------------------- | ---------------- | ------- |
| "a navy and gold skyline"         | `['navy', 'gold', 'cream']` | 2                | true    |
| "a navy skyline"                  | `['navy', 'gold', 'cream']` | 1                | false   |
| "a navy, gold, and cream skyline" | `['navy', 'gold', 'cream']` | 3                | true    |

| onBrandFlags          | bonus |
| --------------------- | ----- |
| `[true, true, true]`  | 300   |
| `[true, false, true]` | 0     |
| `[]`                  | 0     |

---

## 6. Content-pool wiring — `briefs.ts`

Extend `pickBrief` to filter by which tiers the player has unlocked, and to keep corporate
series intact (never hand out piece 2 of a series before piece 1 has been completed):

```ts
export function pickBrief(options?: {
	excludeIds?: readonly string[];
	unlockedTiers?: readonly ClientTier[]; // defaults to ['walk-in'] — existing callers unaffected
	completedSeriesIds?: readonly string[]; // series ids where all prior positions are done
	random?: () => number;
}): ClientBrief;
```

Pool-building rule: start from `LEVEL_1_BRIEFS` plus every brief from `corporateBriefs.ts`
/ `billionaireBriefs.ts` / `auctionBriefs.ts` whose `tier` is in `unlockedTiers`. For
corporate briefs specifically, a brief at `seriesPosition > 1` is only eligible once its
predecessor (`seriesPosition - 1` in the same `seriesId`) is in `excludeIds` (already
completed) — this keeps a series playing out in order 1 → 2 → 3 instead of arriving
scrambled. Reset-when-empty behaviour (already in `pickBrief`) stays unchanged.

**New tests in `briefs.test.ts`:** `pickBrief({ unlockedTiers: ['walk-in'] })` never
returns a `corporate`/`billionaire`/`auction-house` brief; `pickBrief({ unlockedTiers:
['walk-in', 'corporate'] })` never returns `corp-1b` (`seriesPosition: 2`) unless `corp-1a`
is in `excludeIds`; with `corp-1a` excluded, `corp-1b` becomes eligible.

---

## 7. `GameStore` wiring (`src/lib/stores/gameState.svelte.ts`)

1. `inviteClient()`: pass `unlockedTiers: unlockedClientTiers(this.reputation)` and
   `completedSeriesIds` (derive from `galleryHistory`'s brief ids matched against known
   series — a small helper in `paletteSeries.ts` or inline) into `pickBrief`.
2. `createArt()` / the payout step inside it: branch once, right where
   `calculatePayout` is currently called:
   - `currentClient.tier === 'auction-house'` → call
     `resolveAuction(toGalleryScore(draft.accuracyScore, creativityScore), currentClient.budget, this.#random)`
     and use `winningBid` as `finalPayout` (still run it through
     `critiqueSchema.parse`, which only constrains `finalPayout` to `min(0)` — no upper
     bound, so an uncapped auction result parses fine).
   - `currentClient.tier === 'corporate'` → `calculatePayout(...)` as normal for this
     piece, then, only if `currentClient.seriesPosition === 3`, look up the other two
     completed pieces in `galleryHistory` by `seriesId`, run `checkPaletteUsage` on all
     three original prompts (this requires each `GalleryEntry` to retain enough
     information to re-check — see note below), and add `seriesCompletionBonus(...)` to
     `finalPayout`.
   - otherwise → unchanged.
3. **Series re-check needs the player's prompt after the fact.** `GalleryEntry` does not
   store `playerPrompt` today. Rather than editing the frozen `galleryEntrySchema`, check
   `onBrand` **at collection time** for each series piece (when `playerPrompt` is still in
   scope inside `createArt`/`collectCash`) and keep a small parallel in-memory/persisted
   map `seriesOnBrandFlags: Record<seriesId, boolean[]>` on `GameStore` (persisted via
   spec 12 — this is a 5th save field this spec adds additively to `saveDataSchema`,
   `z.record(z.string(), z.array(z.boolean())).default({})`). Compute and store the flag
   the moment each series piece is collected; read it back (already complete) when the
   3rd piece resolves.
4. `reset()`: clear `seriesOnBrandFlags`.

**Tests:** `inviteClient()` with `reputation: 0` never surfaces a non-walk-in client
across 50 seeded draws; with `reputation: 60` all four tiers appear across enough draws;
collecting an auction-house commission sets `finalPayout` to the injected
`resolveAuction`'s `winningBid` (inject a fake `resolveAuction` via `GameStoreDeps`, same
pattern as `random`/`now`); collecting the 3rd on-brand piece of a corporate series adds
exactly 300 to that piece's payout; collecting the 3rd off-brand piece adds 0.

---

## 8. UI

### `ClientTierBadge.svelte`

Tiny presentational badge — icon + tier name in `badgeColor` classes from
`getClientTierInfo`. One prop: `tier: ClientTier`. Rendered next to the client's name
wherever `currentClient` is shown during `briefing`/`generating`/`critiquing`/`results`
(existing workspace/brief UI — small, targeted addition, not a new screen).

### `AuctionResultPanel.svelte`

Shown instead of (or layered over) the normal payout readout in the `results` phase when
`currentCritique` resolved via an auction. Props:

| Prop          | Type         |
| ------------- | ------------ |
| `bidderCount` | `number`     |
| `bids`        | `number[]`   |
| `winningBid`  | `number`     |
| `oncollect`   | `() => void` |

Content: a short "the gavel comes down" framing line, a list of the bids (can reveal all
at once — no animation required for this spec, though a staggered reveal is a fine later
polish item), the winning bid highlighted, and a "Collect Cash" button firing `oncollect`
(same semantics as the existing results-phase collect action).

**Tests:** renders all bids; highlights `winningBid`; `oncollect` fires once.

---

## 9. Definition of done

- [ ] All 6 existing `LEVEL_1_BRIEFS` still parse against `clientBriefSchema` with no
      changes to their object literals (`tier` defaults to `'walk-in'`).
- [ ] A player at reputation 0 never sees a corporate/billionaire/auction-house client.
- [ ] Corporate series always arrive in order (1, then 2, then 3), never scrambled.
- [ ] A consistent 3-piece corporate series pays a 300 bonus on the 3rd piece; an
      inconsistent one pays 0 extra.
- [ ] Auction-house payouts are uncapped by `brief.budget` and driven entirely by
      `resolveAuction`.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green.
- [ ] `src/lib/components/README.md` documents `ClientTierBadge` and `AuctionResultPanel`.
- [ ] Handoff entry in `docs/agent-log.md`.

## 10. Explicitly out of scope

- Gating client tiers on anything other than reputation (e.g. requiring a specific gallery
  venue or medium tier from specs 13/14) — a reasonable future cross-system gate, not
  required here.
- More than one active corporate series at a time — `pickBrief` may still surface a
  walk-in or billionaire brief while a series is in progress; only series-internal
  ordering (1→2→3) is enforced.
- A dedicated "Auction House" room/scene — the auction only changes the results-phase
  payout UI, not the workspace.
- Negotiation, counter-offers, or the player setting their own reserve price.
