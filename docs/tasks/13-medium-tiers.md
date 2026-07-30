# Spec 13 — Medium & Material Tiers ("The Artist's Toolkit")

**Worktree:** `git worktree add -b agent/medium-tiers ../adt-wt-medium-tiers main`
**Depends on:** Spec 12 (progression persistence) merged.

## Mission

Right now every commission is rendered in the same hidden crayon style forever —
`LEVEL_1.promptModifiers` is a single fixed string, and the joke is that the player's
prompt always comes back looking amateur no matter how it's worded. This spec turns that
fixed string into a **purchasable ladder**: crayons and construction paper → pencil &
sketchbook → ink & charcoal → watercolour → acrylic & digital tablet → oil on canvas. The
player permanently unlocks tiers with cash and reputation, and can switch their active
tier freely between anything they've already unlocked (nostalgia crayon jobs stay
possible — nothing is consumed).

This does **not** change the 1-10 score scale (`critiqueDraftSchema.accuracyScore` is a
frozen contract type and out of reach here). A better medium doesn't make the critic mark
easier — it makes the _finished picture_ read as more skilled (a richer, more specific
prompt suffix — Janus produces markedly better images from thorough prompts, per
`docs/architecture.md` §4) and it pays better, via a payout multiplier. This mirrors how
tycoon games usually gate quality: the ceiling on skill is a currency sink, not a stat
that inflates forever.

## Ownership zone

```
New:
  src/lib/data/mediumTiers.ts
  src/lib/data/mediumTiers.test.ts
  src/lib/components/ToolkitShop.svelte
  src/lib/components/ToolkitShop.svelte.test.ts

Edit (small, targeted):
  src/lib/game/promptPipeline.ts
  src/lib/game/promptPipeline.test.ts
  src/lib/game/scoring.ts
  src/lib/game/scoring.test.ts
  src/lib/game/save.ts                       ← already has the fields (spec 12); no schema change needed here
  src/lib/stores/gameState.svelte.ts
  src/lib/stores/gameState.svelte.test.ts
  src/lib/components/GameMenuBar.svelte
  src/lib/components/GameMenuBar.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  docs/tasks/README.md
```

Do not edit `src/lib/types/contracts.ts`. `MediumTier` is internal domain data, not a
cross-layer trust-boundary type — follow the precedent of `EnvironmentConfig` in
`src/lib/data/environments.ts`, which is exactly this shape of thing (a plain exported
interface + a `Record`/array of data next to it) and also lives outside `contracts.ts`.

---

## 1. `src/lib/data/mediumTiers.ts`

```ts
export interface MediumTier {
	id: string;
	name: string;
	/** One line shown under the name in the shop. */
	tagline: string;
	/** One-time cash cost to unlock. Tier 0 is free and always unlocked. */
	unlockCost: number;
	/** Player's `reputation` must be at least this to unlock. */
	requiredReputation: number;
	/**
	 * Appended to the player's prompt exactly like `LEVEL_1.promptModifiers` is today —
	 * see `buildPrompt` in promptPipeline.ts. Never shown to the player.
	 */
	promptModifierSuffix: string;
	/** Multiplies the payout computed by `calculatePayout`. 1.0 = no change. */
	payoutMultiplier: number;
	/** Emoji shown in the shop and the active-tier HUD badge. No new icon assets. */
	icon: string;
}

/**
 * Ordered from worst to best. Index order matters: `getNextMediumTier` and the shop's
 * "up next" preview both walk this array in order. `promptModifierSuffix` values below
 * are drawn straight from the skill-tier vocabulary already validated in
 * `data/modifier-explorer/manifest.json` (categories `skill-amateur` through
 * `skill-master`), so they are known to produce a visible quality gradient with the
 * in-browser engines, not just invented copy.
 */
export const MEDIUM_TIERS: readonly MediumTier[] = [
	{
		id: 'crayon',
		name: 'Crayons & Construction Paper',
		tagline: 'Where every artist starts. Free, messy, and a little bit magic.',
		unlockCost: 0,
		requiredReputation: 0,
		promptModifierSuffix:
			'flat color, simple line art, crayon texture, amateur style, low detail, basic shading',
		payoutMultiplier: 1.0,
		icon: '🖍️'
	},
	{
		id: 'pencil',
		name: 'Pencil & Sketchbook',
		tagline: 'Graphite over crayon wax. Clients notice the extra care.',
		unlockCost: 250,
		requiredReputation: 3,
		promptModifierSuffix:
			'rough pencil sketch, sketchbook page, basic shading, uneven lines, student artwork',
		payoutMultiplier: 1.15,
		icon: '✏️'
	},
	{
		id: 'ink',
		name: 'Ink & Charcoal',
		tagline: 'Bold outlines and real shadow. Your first taste of drama.',
		unlockCost: 600,
		requiredReputation: 6,
		promptModifierSuffix: 'ink wash, charcoal shading, crisp outlines, student portfolio piece',
		payoutMultiplier: 1.3,
		icon: '🖋️'
	},
	{
		id: 'watercolor',
		name: 'Watercolour Set',
		tagline: 'Soft blends and happy accidents.',
		unlockCost: 1200,
		requiredReputation: 10,
		promptModifierSuffix: 'watercolor wash, soft pastels, gouache, delicate blending',
		payoutMultiplier: 1.5,
		icon: '🎨'
	},
	{
		id: 'acrylic',
		name: 'Acrylic & Digital Tablet',
		tagline: 'Clean, professional, saleable at real galleries.',
		unlockCost: 2500,
		requiredReputation: 16,
		promptModifierSuffix:
			'digital illustration, vector art, cel shading, professional finish, crisp outlines',
		payoutMultiplier: 1.75,
		icon: '🖥️'
	},
	{
		id: 'oil',
		name: 'Oil on Canvas',
		tagline: 'The masters\u2019 medium. Every commission now reads as a masterpiece.',
		unlockCost: 5000,
		requiredReputation: 24,
		promptModifierSuffix:
			'oil painting on canvas, impasto, masterpiece, intricate detail, hyperrealistic, trending on artstation',
		payoutMultiplier: 2.2,
		icon: '🖼️'
	}
] as const;

export const DEFAULT_MEDIUM_TIER_ID = MEDIUM_TIERS[0].id;

export function getMediumTier(id: string): MediumTier {
	const tier = MEDIUM_TIERS.find((t) => t.id === id);
	return tier ?? MEDIUM_TIERS[0];
}

/** `null` when `id` is already the last tier. */
export function getNextMediumTier(id: string): MediumTier | null {
	const index = MEDIUM_TIERS.findIndex((t) => t.id === id);
	if (index === -1 || index === MEDIUM_TIERS.length - 1) return null;
	return MEDIUM_TIERS[index + 1];
}

export function canUnlockMediumTier(
	tier: MediumTier,
	state: { cash: number; reputation: number }
): boolean {
	return state.cash >= tier.unlockCost && state.reputation >= tier.requiredReputation;
}
```

**Tests (`mediumTiers.test.ts`):**

| Case                                                        | Expected                                             |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `MEDIUM_TIERS[0].id`                                        | `'crayon'`, `unlockCost: 0`, `requiredReputation: 0` |
| `MEDIUM_TIERS` payout multipliers                           | Strictly increasing across the array                 |
| `MEDIUM_TIERS` unlock costs and reputations                 | Strictly increasing across the array                 |
| `getMediumTier('nope')`                                     | Falls back to `MEDIUM_TIERS[0]`                      |
| `getNextMediumTier('oil')`                                  | `null`                                               |
| `getNextMediumTier('crayon')`                               | `MEDIUM_TIERS[1]` (`'pencil'`)                       |
| `canUnlockMediumTier(pencil, { cash: 250, reputation: 3 })` | `true` (boundary is inclusive)                       |
| `canUnlockMediumTier(pencil, { cash: 249, reputation: 3 })` | `false`                                              |
| `canUnlockMediumTier(pencil, { cash: 250, reputation: 2 })` | `false`                                              |

---

## 2. `promptPipeline.ts`

Replace the hardcoded `LEVEL_1.promptModifiers` reference with a `MediumTier` parameter,
keeping `buildLevel1Prompt` as a thin backward-compatible wrapper so nothing else in the
codebase breaks:

```ts
import { DEFAULT_MEDIUM_TIER_ID, getMediumTier, type MediumTier } from '$lib/data/mediumTiers';

/**
 * Append the active medium's hidden quality modifiers to the player's prompt. The player
 * never sees the result — see `MediumTier.promptModifierSuffix`.
 *
 * @throws {Error} if the sanitised input is empty
 */
export function buildPrompt(playerInput: string, tier: MediumTier): string {
	const clean = sanitizePlayerPrompt(playerInput);
	if (clean === '') {
		throw new Error('Prompt cannot be empty.');
	}
	return `${clean}, ${tier.promptModifierSuffix}`;
}

/** @deprecated Use `buildPrompt(playerInput, tier)`. Kept for existing callers/tests. */
export function buildLevel1Prompt(playerInput: string): string {
	return buildPrompt(playerInput, getMediumTier(DEFAULT_MEDIUM_TIER_ID));
}
```

`DEFAULT_MEDIUM_TIER_ID` resolves to the `'crayon'` tier, whose `promptModifierSuffix` is
byte-for-byte `LEVEL_1.promptModifiers` — this is why `buildLevel1Prompt` must keep
producing identical output to today. Add a test asserting
`buildLevel1Prompt('x') === buildPrompt('x', getMediumTier('crayon'))`.

---

## 3. `scoring.ts` — payout multiplier

```ts
export function calculatePayout(
	brief: ClientBrief,
	accuracyScore: number,
	creativityScore: number,
	multiplier = 1
): number {
	const quality = (accuracyScore * 0.7 + creativityScore * 0.3) / 10;
	return clamp(
		Math.round(brief.budget * quality * multiplier),
		0,
		Math.round(brief.budget * multiplier)
	);
}
```

`multiplier` defaults to `1` so every existing call site and test keeps working
unchanged. This is the single seam specs 14 and 16 will also multiply into — see their
specs for how the final multiplier is composed; this spec only needs to pass
`activeMediumTier.payoutMultiplier`.

**New test cases to add to `scoring.test.ts`:**

| accuracy | creativity | budget | multiplier | expected payout              |
| -------- | ---------- | ------ | ---------- | ---------------------------- |
| 10       | 10         | 100    | 1.0        | 100                          |
| 10       | 10         | 100    | 1.5        | 150                          |
| 6        | 4          | 100    | 1.5        | round(100 × 0.54 × 1.5) = 81 |
| 1        | 1          | 100    | 2.2        | round(100 × 0.1 × 2.2) = 22  |

(0.54 = 6×0.7 + 4×0.3, all divided by 10 → 0.54.)

---

## 4. `GameStore` wiring (`src/lib/stores/gameState.svelte.ts`)

1. New state: `unlockedMediumTierIds = $state<string[]>(['crayon'])`,
   `activeMediumTierId = $state('crayon')`. Hydrate both from the save (spec 12 already
   defined these fields in `saveDataSchema`); include them in every call to `#persist()`.
2. `activeMediumTier = $derived(getMediumTier(this.activeMediumTierId))`.
3. New method:
   ```ts
   unlockMediumTier(id: string): boolean {
     const tier = getMediumTier(id);
     if (this.unlockedMediumTierIds.includes(id)) return false;
     if (!canUnlockMediumTier(tier, { cash: this.cash, reputation: this.reputation })) {
       return false;
     }
     this.cash -= tier.unlockCost;
     this.unlockedMediumTierIds = [...this.unlockedMediumTierIds, id];
     this.activeMediumTierId = id; // newly unlocked tier becomes active immediately
     this.#persist();
     return true;
   }
   ```
4. New method `setActiveMediumTier(id: string): void` — no-ops unless `id` is in
   `unlockedMediumTierIds`; otherwise sets `activeMediumTierId` and persists. This is what
   lets a player switch back to crayon for fun after unlocking oil.
5. `createArt()`: replace `buildLevel1Prompt(playerPrompt)` with
   `buildPrompt(playerPrompt, this.activeMediumTier)`, and replace the
   `calculatePayout(client, draft.accuracyScore, creativityScore)` call with
   `calculatePayout(client, draft.accuracyScore, creativityScore, this.activeMediumTier.payoutMultiplier)`.
6. `reset()`: reset both new fields to their tier-0 defaults alongside the existing resets.

**Tests to add:**

- Fresh store: `unlockedMediumTierIds` is `['crayon']`, `activeMediumTierId` is `'crayon'`.
- `unlockMediumTier('pencil')` with `cash: 300, reputation: 5` → returns `true`, `cash`
  drops by 250, `activeMediumTierId` becomes `'pencil'`, `#persist` (injected fake) called.
- `unlockMediumTier('pencil')` with `cash: 100` → returns `false`, no state change.
- `unlockMediumTier('crayon')` (already unlocked) → returns `false`.
- `setActiveMediumTier('oil')` when not unlocked → no-op, `activeMediumTierId` unchanged.
- `createArt()` with `activeMediumTierId: 'oil'` calls the injected engine's `generate`
  with a `prompt` ending in the oil tier's `promptModifierSuffix`.

---

## 5. `ToolkitShop.svelte`

Presentational component, same discipline as `EnginePicker.svelte` — props in, events out,
no direct store access.

| Prop              | Type                   | Notes                                  |
| ----------------- | ---------------------- | -------------------------------------- |
| `tiers`           | `MediumTier[]`         | Pass `MEDIUM_TIERS` from the caller    |
| `unlockedTierIds` | `string[]`             |                                        |
| `activeTierId`    | `string`               |                                        |
| `cash`            | `number`               | For affordability styling              |
| `reputation`      | `number`               | For eligibility styling                |
| `onunlock`        | `(id: string) => void` |                                        |
| `onselect`        | `(id: string) => void` | Only called for already-unlocked tiers |
| `onclose`         | `() => void`           |                                        |

Render each tier as a card in ladder order: icon, name, tagline, and one of three states —
**Active** (current tier, highlighted, no button), **Owned** (unlocked, not active — "Switch
to this medium" button calling `onselect`), or **Locked** (shows unlock cost and required
reputation; "Unlock" button calling `onunlock`, disabled with a reason string — "Need $X
more" or "Need Y more reputation" — when the player can't yet afford it).

Wire into `GameMenuBar.svelte`: add a button (e.g. next to the existing engine picker
trigger) labelled with the active tier's icon + name (mirrors the existing "Art engine ·
Crayon Mode" label pattern already in the menu bar) that opens `ToolkitShop` as an overlay,
matching how `EnginePicker`/`ComfyUISetup` overlays are triggered from `+page.svelte`
today. Wire `onunlock`/`onselect` straight to `game.unlockMediumTier` /
`game.setActiveMediumTier`.

**Tests (`ToolkitShop.svelte.test.ts`):** renders all six tiers; active tier shows no
button; owned-but-inactive tier's button fires `onselect` with the right id; locked tier's
button is disabled when unaffordable and fires `onunlock` when affordable; accessible
labels/roles present (mirror the existing `EnginePicker.svelte.test.ts` conventions).

---

## 6. Definition of done

- [ ] `MEDIUM_TIERS` has exactly 6 tiers, strictly increasing cost/reputation/multiplier.
- [ ] `buildLevel1Prompt` output is byte-identical to before this spec (regression test).
- [ ] A fresh save starts on the crayon tier with identical Level 1 behaviour to before
      this spec — this spec must not change anything for a player who never opens the
      shop.
- [ ] Unlocking a tier is permanent (persists via spec 12), deducts cash exactly once, and
      cannot be re-bought.
- [ ] Switching between two already-unlocked tiers is free and instant.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green.
- [ ] `src/lib/components/README.md` documents `ToolkitShop`.
- [ ] Handoff entry in `docs/agent-log.md`.

## 7. Explicitly out of scope

- Changing the 1-10 score scale or `critiqueDraftSchema` — scores stay exactly as they are.
- Per-medium visual reskinning of the workspace/scene (a crayon box on the desk becoming
  an easel, etc.) — cosmetic follow-up, not required here. The shop UI itself is enough
  surface area for the player to feel the progression.
- Any interaction with client tiers (spec 15) — e.g. "billionaires only accept oil" is a
  reasonable future idea but must not be implemented until spec 15 exists to define client
  tiers at all.
- Consuming/downgrading tiers involuntarily. Once unlocked, always available.
