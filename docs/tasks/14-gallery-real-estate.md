# Spec 14 — Gallery Real Estate & Presentation

**Worktree:** `git worktree add -b agent/gallery-real-estate ../adt-wt-gallery-real-estate main`
**Depends on:** Spec 12 (progression persistence) merged. Independent of spec 13 (can be
built in parallel in a separate worktree) except for the shared `calculatePayout`
`multiplier` parameter — see §3, which both specs touch.

## Mission

Every commission the player ever completes currently lands in one unlimited
`galleryHistory` array, displayed as a horizontal strip of the most recent pieces
(`FridgeGallery.svelte`) with no capacity, no layout choice, and no effect on payout. This
spec turns the display itself into three independent, stackable purchases:

1. **Venue (capacity):** how many pieces can be _on display_ at once — the fridge (3) up
   through a mega-museum wing (effectively unlimited). Everything the player has ever made
   still exists in `galleryHistory` for the record; the venue only caps how many are shown
   on the wall at a time.
2. **Layout (curation):** a purchasable presentation style — cluttered corkboard up
   through a minimalist white cube — that multiplies payout.
3. **Atmosphere:** small, independently-purchasable flourishes (lighting, music, velvet
   ropes, ...) that each add a flat payout bonus, and stack with each other and with
   layout/venue.

All three roll up into one number, `presentationMultiplier`, that plugs into the
`calculatePayout` seam spec 13 already opened up.

## Ownership zone

```
New:
  src/lib/data/galleryVenues.ts
  src/lib/data/galleryVenues.test.ts
  src/lib/data/galleryLayouts.ts
  src/lib/data/galleryLayouts.test.ts
  src/lib/data/galleryAtmosphere.ts
  src/lib/data/galleryAtmosphere.test.ts
  src/lib/components/GalleryUpgradeShop.svelte
  src/lib/components/GalleryUpgradeShop.svelte.test.ts

Edit (small, targeted):
  src/lib/game/scoring.ts                    ← coordinate with spec 13, see §3
  src/lib/game/scoring.test.ts
  src/lib/stores/gameState.svelte.ts
  src/lib/stores/gameState.svelte.test.ts
  src/lib/components/FridgeGallery.svelte
  src/lib/components/FridgeGallery.svelte.test.ts
  src/lib/components/GameMenuBar.svelte
  src/lib/components/GameMenuBar.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  docs/tasks/README.md
```

Do not edit `src/lib/types/contracts.ts`. Do not rename `FridgeGallery.svelte` — Level 1
keeps its fridge identity; this spec generalises its _behaviour_ (capacity + a CSS layout
class) without touching its Level-1-specific copy or visuals. A full per-venue re-skin
(different background art per venue) is listed as a later feature in §7, not required here.

---

## 1. `src/lib/data/galleryVenues.ts` — capacity

```ts
export interface GalleryVenue {
	id: string;
	name: string;
	tagline: string;
	/** How many gallery entries are shown on display at once. */
	capacity: number;
	unlockCost: number;
	requiredReputation: number;
	icon: string;
}

export const GALLERY_VENUES: readonly GalleryVenue[] = [
	{
		id: 'fridge',
		name: 'The Fridge',
		tagline: 'Magnets and masking tape.',
		capacity: 3,
		unlockCost: 0,
		requiredReputation: 0,
		icon: '🧲'
	},
	{
		id: 'garage',
		name: 'Garage Wall',
		tagline: 'You cleared out the car.',
		capacity: 8,
		unlockCost: 400,
		requiredReputation: 4,
		icon: '🚪'
	},
	{
		id: 'storefront',
		name: 'Storefront Window',
		tagline: 'Foot traffic finally sees your work.',
		capacity: 16,
		unlockCost: 1000,
		requiredReputation: 8,
		icon: '🏪'
	},
	{
		id: 'gallery-hall',
		name: 'Downtown Gallery Hall',
		tagline: 'Real walls, real spotlights.',
		capacity: 32,
		unlockCost: 2500,
		requiredReputation: 14,
		icon: '🏛️'
	},
	{
		id: 'mega-museum',
		name: 'Mega-Museum Wing',
		tagline: 'Your name is on the building.',
		capacity: 9999,
		unlockCost: 6000,
		requiredReputation: 22,
		icon: '🏟️'
	}
] as const;

export const DEFAULT_VENUE_ID = GALLERY_VENUES[0].id;

export function getVenue(id: string): GalleryVenue {
	return GALLERY_VENUES.find((v) => v.id === id) ?? GALLERY_VENUES[0];
}

export function canUnlockVenue(
	venue: GalleryVenue,
	state: { cash: number; reputation: number }
): boolean {
	return state.cash >= venue.unlockCost && state.reputation >= venue.requiredReputation;
}
```

Unlike medium tiers (spec 13), venues are **strictly ordered upgrades, not a switchable
loadout** — a player never wants to downgrade capacity, so there is only ever one
"current" venue: the highest-index one they've unlocked. Model this as a single
`unlockedVenueId` string (already in `saveDataSchema` from spec 12), not an array.

**Tests:** 5 venues; capacity/cost/reputation strictly increasing; `getVenue('nope')`
falls back to `fridge`; `canUnlockVenue` boundary cases (same pattern as spec 13 §1).

---

## 2. `src/lib/data/galleryLayouts.ts` — curation

```ts
export interface GalleryLayout {
	id: string;
	name: string;
	tagline: string;
	unlockCost: number;
	/** Multiplies payout. 1.0 = no change. */
	curationMultiplier: number;
	/** CSS class applied to the gallery grid — see §5. */
	gridClassName: string;
	icon: string;
}

export const GALLERY_LAYOUTS: readonly GalleryLayout[] = [
	{
		id: 'cluttered',
		name: 'Cluttered Corkboard',
		tagline: 'Everything, everywhere, tilted.',
		unlockCost: 0,
		curationMultiplier: 1.0,
		gridClassName: 'layout-cluttered',
		icon: '📌'
	},
	{
		id: 'tidy-rows',
		name: 'Tidy Rows',
		tagline: 'At least it is straight now.',
		unlockCost: 300,
		curationMultiplier: 1.05,
		gridClassName: 'layout-rows',
		icon: '📏'
	},
	{
		id: 'salon-hang',
		name: 'Salon Hang',
		tagline: 'Floor-to-ceiling, gallery-style.',
		unlockCost: 800,
		curationMultiplier: 1.1,
		gridClassName: 'layout-salon',
		icon: '🖼️'
	},
	{
		id: 'grid-gallery',
		name: 'Perfect Grid',
		tagline: 'Even spacing, even lighting.',
		unlockCost: 2000,
		curationMultiplier: 1.2,
		gridClassName: 'layout-grid',
		icon: '▦'
	},
	{
		id: 'minimalist',
		name: 'Minimalist White Cube',
		tagline: 'One piece at a time, reverently lit.',
		unlockCost: 4500,
		curationMultiplier: 1.35,
		gridClassName: 'layout-minimalist',
		icon: '⬜'
	}
] as const;

export const DEFAULT_LAYOUT_ID = GALLERY_LAYOUTS[0].id;

export function getLayout(id: string): GalleryLayout {
	/* same fallback pattern as getVenue */
}
export function canUnlockLayout(layout: GalleryLayout, cash: number): boolean {
	return cash >= layout.unlockCost;
}
```

Layouts have **no reputation gate** (they're a pure cash sink for players who want a nicer
wall before their reputation catches up) but, like medium tiers, are a switchable set —
once unlocked, a player can flip between any owned layout for free (`unlockedLayoutIds`
array + `activeLayoutId`, both already in `saveDataSchema`).

**Tests:** 5 layouts; cost and multiplier strictly increasing; fallback and boundary cases
mirroring §1.

---

## 3. `src/lib/data/galleryAtmosphere.ts` — stacking flourishes

```ts
export interface AtmosphereItem {
	id: string;
	name: string;
	tagline: string;
	cost: number;
	/** Flat additive bonus, e.g. 0.05 = +5%. Sums with every other owned item. */
	payoutBonus: number;
	icon: string;
}

export const ATMOSPHERE_ITEMS: readonly AtmosphereItem[] = [
	{
		id: 'gallery-lighting',
		name: 'Gallery Lighting',
		tagline: 'No more overhead fluorescents.',
		cost: 350,
		payoutBonus: 0.05,
		icon: '💡'
	},
	{
		id: 'ambient-music',
		name: 'Ambient Background Music',
		tagline: 'Something in a minor key.',
		cost: 500,
		payoutBonus: 0.05,
		icon: '🎵'
	},
	{
		id: 'velvet-ropes',
		name: 'Velvet Ropes',
		tagline: 'Nothing says "valuable" like a rope.',
		cost: 900,
		payoutBonus: 0.08,
		icon: '➰'
	},
	{
		id: 'climate-control',
		name: 'Climate Control',
		tagline: 'The paint stops sweating.',
		cost: 1200,
		payoutBonus: 0.07,
		icon: '🌡️'
	},
	{
		id: 'wine-reception',
		name: 'Opening Night Wine Reception',
		tagline: 'Everyone is more generous after a glass.',
		cost: 2000,
		payoutBonus: 0.1,
		icon: '🍷'
	}
] as const;

export function getAtmosphereItem(id: string): AtmosphereItem | undefined {
	return ATMOSPHERE_ITEMS.find((a) => a.id === id);
}

/** Sums `payoutBonus` for every id the player owns; unknown ids are ignored, not thrown on. */
export function totalAtmosphereBonus(ownedIds: readonly string[]): number {
	return ownedIds.reduce((sum, id) => sum + (getAtmosphereItem(id)?.payoutBonus ?? 0), 0);
}
```

Unlike venues and layouts, atmosphere items are **not mutually exclusive and not
ordered** — a player can own any subset, in any order, and each one they own always
contributes. `ownedAtmosphereIds` (already in `saveDataSchema`) is a plain set of ids with
no "active" concept.

**Tests:** 5 items; `totalAtmosphereBonus([])` is `0`; `totalAtmosphereBonus(['gallery-lighting', 'velvet-ropes'])` is `0.13`; unknown id in the array contributes `0` and does not throw.

---

## 4. Composing the final multiplier — `scoring.ts`

Spec 13 added a `multiplier` parameter to `calculatePayout`. This spec does not change
that function's signature again — it changes what `GameStore` passes in. Define the
composition once, in `GameStore`, as the single place all four progression specs (13, 14,
and later 16) contribute to the same number:

```ts
// gameState.svelte.ts
presentationMultiplier = $derived(
	this.activeMediumTier.payoutMultiplier * // spec 13
		getLayout(this.activeLayoutId).curationMultiplier * // this spec
		(1 + totalAtmosphereBonus(this.ownedAtmosphereIds)) // this spec
);
```

and `createArt()`'s `calculatePayout(...)` call passes `this.presentationMultiplier`
instead of `this.activeMediumTier.payoutMultiplier` directly. If spec 13 has not been
implemented yet in your worktree, stub `activeMediumTier.payoutMultiplier` at `1` — do not
block on spec 13 to finish this spec; document in your handoff which order the two merged
in and confirm the multiplier composes correctly once both are on `main`.

**New `scoring.test.ts` cases** (multiplier is already a parameter from spec 13 — these
just add layout/atmosphere-flavoured numbers, e.g. `multiplier: 1.2 * 1.13 = 1.356`):

| accuracy | creativity | budget | multiplier | expected payout               |
| -------- | ---------- | ------ | ---------- | ----------------------------- |
| 10       | 10         | 100    | 1.356      | round(100 × 1 × 1.356) = 136  |
| 8        | 8          | 150    | 1.05       | round(150 × 0.8 × 1.05) = 126 |

---

## 5. `GameStore` wiring

1. New state: `unlockedVenueId = $state('fridge')`, `unlockedLayoutIds = $state<string[]>(['cluttered'])`, `activeLayoutId = $state('cluttered')`, `ownedAtmosphereIds = $state<string[]>([])`. Hydrate from the save; include in `#persist()`.
2. `venue = $derived(getVenue(this.unlockedVenueId))`.
3. `displayedGalleryEntries = $derived([...this.galleryHistory].sort((a, b) => b.completedAt - a.completedAt).slice(0, this.venue.capacity))` — this is what `FridgeGallery` renders; `galleryHistory` itself (full, uncapped history) stays exactly as it is today for `OperationsPanel`'s table view.
4. New methods, each following the exact shape of spec 13's `unlockMediumTier` (validate → deduct cash → append/set → persist → return boolean): `unlockVenue(id)`, `unlockLayout(id)`, `setActiveLayout(id)` (no-op unless owned), `buyAtmosphereItem(id)` (no-op if already owned or unaffordable; deducts `cost`, appends to `ownedAtmosphereIds`).
5. `reset()`: reset all four new fields to their defaults.

**Tests:** mirror spec 13 §4's list, one block per new method (afford/deny/idempotent/persist-called), plus: `displayedGalleryEntries` returns only the 3 most recent entries when `venue` is `fridge` and 5 entries exist; returns all 5 once `unlockVenue('garage')` (capacity 8) succeeds.

---

## 6. UI

### `FridgeGallery.svelte`

Add two props, both optional so every existing call site (and its test file) compiles
unchanged:

```ts
interface Props {
	entries: GalleryEntry[];
	label?: string;
	emptyMessage?: string;
	/** New. CSS class from the active `GalleryLayout.gridClassName`. Defaults to today's look. */
	layoutClassName?: string;
	onselect: (entry: GalleryEntry) => void;
}
```

Apply `layoutClassName` to the `<ul>` alongside the existing `flex gap-4 overflow-x-auto`
classes. Add four small CSS rules (scoped `<style>` block, Tailwind `@apply` is fine) for
`layout-rows`/`layout-salon`/`layout-grid`/`layout-minimalist` — a switch from the
existing horizontal scroll strip to, at minimum, a wrapping CSS grid with tightening gap
and reduced tilt as layouts improve (the existing `rotate({((i % 5) - 2) * 3}deg)` inline
style should shrink toward `0deg` for `layout-grid` and `layout-minimalist` — pass a
`tiltEnabled` boolean derived from `layoutClassName !== 'layout-cluttered' && layoutClassName !== 'layout-rows'`
rather than inventing a second prop). Update the caller (wherever `FridgeGallery` is
mounted, currently the kitchen scene) to pass `game.venue.capacity`-capped entries
(`game.displayedGalleryEntries`) and `getLayout(game.activeLayoutId).gridClassName`.

### `GalleryUpgradeShop.svelte`

Same prop-driven, event-out discipline as `ToolkitShop.svelte` (spec 13). Three tabs —
**Venue**, **Layout**, **Atmosphere** — each rendering its own card list:

| Prop                                                                      | Type                     |
| ------------------------------------------------------------------------- | ------------------------ |
| `venues` / `layouts` / `atmosphereItems`                                  | the three data arrays    |
| `unlockedVenueId`                                                         | `string`                 |
| `unlockedLayoutIds` / `activeLayoutId`                                    | `string[]` / `string`    |
| `ownedAtmosphereIds`                                                      | `string[]`               |
| `cash` / `reputation`                                                     | `number`                 |
| `onunlockvenue` / `onunlocklayout` / `onselectlayout` / `onbuyatmosphere` | callbacks taking an `id` |
| `onclose`                                                                 | `() => void`             |

Venue cards are strictly linear (only the next un-owned venue is purchasable; earlier ones
show "Owned", later ones show "Locked" without a buy button — no skipping tiers). Layout
cards behave like `ToolkitShop`'s tiers (Active/Owned/Locked). Atmosphere cards are simple
toggles: "Owned" badge or a "Buy" button, no active/inactive concept.

Wire into `GameMenuBar.svelte` next to the toolkit button from spec 13, e.g. **"🏛️ Gallery
Upgrades"**.

**Tests (`GalleryUpgradeShop.svelte.test.ts`):** one case per tab covering the
afford/locked/owned states and that each callback fires with the right id; accessible
tab semantics (`role="tab"`/`aria-selected` or equivalent).

---

## 7. Definition of done

- [ ] `galleryHistory` remains the full, uncapped lifetime record; nothing is ever deleted
      from it when a venue's capacity is smaller than the history length.
- [ ] `displayedGalleryEntries` never exceeds the active venue's `capacity`.
- [ ] Venue upgrades are strictly linear (no buying venue 3 before venue 1 and 2).
- [ ] Layout switching between owned layouts is free and instant, mirroring spec 13's
      medium-tier switching.
- [ ] Atmosphere items stack additively and are independent of venue/layout.
- [ ] `presentationMultiplier` composes medium × layout × (1 + atmosphere) and is the only
      multiplier `calculatePayout` receives from `createArt()`.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green.
- [ ] `src/lib/components/README.md` documents `GalleryUpgradeShop`.
- [ ] Handoff entry in `docs/agent-log.md`, noting merge order relative to spec 13 if it
      hasn't landed yet.

## 8. Explicitly out of scope

- Full per-venue visual re-skins (a literal fridge sprite vs. a literal museum wing
  background) — this spec is capacity + multiplier + one shared grid-layout treatment, not
  five bespoke room illustrations.
- Player-chosen curation (manually picking _which_ pieces are on display rather than
  highest-capacity-most-recent) — spec 16's Curator role automates a smarter selection
  (highest score, not most recent); manual drag-and-drop curation is a further future idea,
  not required by either spec.
- Any interaction between venue tier and which client tiers are available (spec 15) — a
  reasonable future gate ("auction houses only visit a gallery-hall or better") but must
  not be implemented until spec 15 exists.
