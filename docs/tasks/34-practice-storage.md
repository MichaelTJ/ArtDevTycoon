# Spec 34 — Practice keep, storage, and wall sales

**Status:** Approved (kickoff). Recommended price + client-tier market scale added after Step 6.
**Worktree:** `git worktree add -b agent/practice-storage ../adt-wt-practice-storage main`
**Depends on:** Spec 28 (practice desk), Spec 14 (venue capacity + `displayedGalleryEntries`),
Spec 21b (interactable registry), Spec 27 (medium skill snapshot). Spec **33** (kitchen
fridge wall) is a neighbor draft on `rooms.ts` / `StudioScene` — do **not** run both
agents at once.

## Assumptions

- Worktree is cut from **committed** `main` (`164caf6` at kickoff). Uncommitted HUD /
  critique-toast files on the main checkout stay there and are **not** in this branch.
- Practice pieces are **player sketches**, not commissions. They never go through
  Janus, never increment `commissionsCompleted`, never grant Spec 20 craft XP or
  reputation, and never use `calculatePayout`.
- Finished commissions stay in `galleryHistory`. They are **not** for sale (already
  paid). Off-wall commissions appear in the storage panel as an archive; v1 does
  **not** add manual commission hang-back (spec 14 deferred curation).
- “Gallery NPCs buy it” is a **seeded idle sale tick** plus a named toast (`A
neighbour bought …`). No new Phaser browser sprites in v1 (kitchen cannot fit
  them; storefront crowds are spec 21 deferred).
- New persist fields live on `saveDataSchema` in `src/lib/game/save.ts` (same pattern
  as `hiredArtistSchema`). **`contracts.ts` is not edited.** Easels / FridgeGallery
  see practice pieces as synthetic `GalleryEntry` values (below).
- Spec 33’s three kitchen cabinets are `(1,2)`, `(0,2)`, `(0,3)`. This spec’s kitchen
  crate is `(5,4)` so the tiles do not collide if 33 lands later.
- Wall prices must **scale with the client ladder**, not stay at fridge-Mum dollars.
  Typical commissions: walk-in / Mum **$5–8**, corporate **~$300** (rep 12),
  billionaire **~$1,200–2,000** (rep 30), auction reserve **~$200** (rep 50). A
  full-effort practice piece recommends a fraction of that market (side income, not
  a replacement for taking jobs). Junk still recommends **$1** and barely sells.

## Mission

Players can keep a practice painting instead of throwing it away. Keep offers **add to
gallery** (priced, for sale to visitors) or **put in storage**. Each venue has its own
storage object (crate / boxes / stock / archive / vault), like the fridge vs easel
display. Pieces that fall off the wall land in that storage. Low-effort doodles cannot
be listed for real money.

## Ownership zone

New:

```
src/lib/game/practiceSale.ts
src/lib/game/practiceSale.test.ts
src/lib/data/studioStorage.ts
src/lib/data/studioStorage.test.ts
src/lib/components/StoragePanel.svelte
src/lib/components/StoragePanel.svelte.test.ts
src/lib/components/PracticeSaleToast.svelte
src/lib/components/PracticeSaleToast.svelte.test.ts
docs/tasks/34-practice-storage.md
```

Edit:

```
src/lib/game/save.ts
src/lib/game/save.test.ts
src/lib/game/sketchBlank.ts          ← add paintCoverage01 next to isSketchBlank
src/lib/game/sketchBlank.test.ts
src/lib/game/index.ts
src/lib/game/README.md
src/lib/stores/gameState.svelte.ts
src/lib/stores/gameState.svelte.test.ts
src/lib/stores/README.md
src/lib/components/PracticeDesk.svelte
src/lib/components/PracticeDesk.svelte.test.ts
src/lib/components/StudioHudOverlay.svelte
src/lib/components/StudioHudOverlay.svelte.test.ts
src/lib/components/FridgeGallery.svelte
src/lib/components/FridgeGallery.svelte.test.ts
src/lib/components/IdlePanel.svelte
src/lib/components/IdlePanel.svelte.test.ts
src/lib/components/GameMenuBar.svelte
src/lib/components/GameMenuBar.svelte.test.ts
src/lib/components/index.ts
src/lib/components/README.md
src/lib/studio/interactables.ts
src/lib/studio/interactables.test.ts
src/lib/studio/interactPrompt.ts     ← only if prop prompt needs a storage kind
src/lib/studio/interactPrompt.test.ts
src/lib/studio/rooms.ts              ← one storage furniture tag per venue
src/lib/studio/rooms.test.ts
src/lib/studio/bridge.ts             ← outbound open-storage
src/lib/studio/bridge.test.ts
src/lib/studio/scenes/StudioScene.ts ← prop branch: storage → emit open-storage
src/lib/studio/README.md
src/routes/+page.svelte              ← subscribe open-storage; wire keep/scrap/toast
docs/tasks/README.md
docs/agent-log.md
```

**MUST NOT** edit: `package.json`, lockfiles, vite/tsconfig/eslint/prettier/svelte/
playwright config, `.gitignore`, `src/lib/types/**`, `best-practices.md`,
`docs/architecture.md`, `src/routes/+layout.ts`, engine files, spec 27 suffix tables,
spec 33 kitchen cabinet tiles `(0,2)` / `(0,3)` / `(1,2)`, `docs/tasks/33-kitchen-fridges.md`.

Svelte 5 runes only. After each `.svelte` edit, use the Svelte MCP `svelte-autofixer`
until it reports no issues.

## Locked product rules

1. Practice **Scrap** discards the canvas and calls `exitPractice()`. No persist.
2. Practice **Keep** requires a non-blank sketch (`isSketchBlank` false **or**
   `paintCoverage01 >= 0.005`). Otherwise Keep is disabled; copy:
   `Draw something first.`
3. Keep then offers exactly two actions: **Add to gallery** and **Put in storage**.
4. **Add to gallery** is enabled only when `canListPracticeForSale` is true
   (`strokeMs >= 8_000` **and** `coverage01 >= 0.02`). Otherwise the button is
   disabled with copy:
   `Too little paint for a sale — draw more, or put it in storage.`
5. Add to gallery (and Hang from storage) shows a visible **Recommended price: $X**
   line, where `X = practiceFairValue(...)` using current venue + reputation. Prefill
   the asking-price input with `X`. Player may type another integer (min `1`, max
   `9999`). Helper: `Recommended $X. Visitors walk away if you ask much more.`
`aria-label="Asking price"` stays on the input. The recommended line is visible
   text, not tooltip-only.
6. Hung practice pieces occupy venue `capacity` slots **before** commissions.
   Overflow practice (oldest `createdAt` on the wall) moves to storage with
   `askingPrice: null`. Commissions that no longer fit `displayedGalleryEntries`
   show in the storage panel as archive rows (not for sale).
7. Visitors only buy **practice** pieces with `location === 'gallery'` and a non-null
   asking price. Sale ticks run only while the tab is alive, `phase === 'idle'`, and
   `practiceOpen === false`. **No offline catch-up.**
8. A sale pays `askingPrice` cash, removes the piece, grants **no** reputation and
   **no** commission count. Toast:
   `{buyerLabel} bought {title} for ${price}.`
9. Each venue has exactly one `interactableId: 'storage'` prop with a unique name and
   E-prompt (see §3). CSS kitchen (no floor) opens the same panel from GameMenuBar
   **Storage**.
10. `prefers-reduced-motion`: toast has no enter animation when reduced.

---

## 1. `paintCoverage01` (`sketchBlank.ts`)

```ts
/**
 * Fraction of pixels that are opaque and not near-white.
 * `threshold` matches isSketchBlank (default 250).
 */
export function paintCoverage01(data: SketchPixelBuffer, threshold = 250): number {
	const { data: pixels } = data;
	const pixelCount = Math.floor(pixels.length / 4);
	if (pixelCount <= 0) return 0;
	let painted = 0;
	for (let i = 0; i < pixels.length; i += 4) {
		const a = pixels[i + 3]!;
		if (a === 0) continue;
		const r = pixels[i]!;
		const g = pixels[i + 1]!;
		const b = pixels[i + 2]!;
		if (r < threshold || g < threshold || b < threshold) painted += 1;
	}
	return painted / pixelCount;
}
```

| Input                                        | Expected |
| -------------------------------------------- | -------- |
| 4 pixels, all `255,255,255,255`              | `0`      |
| 4 pixels, one `0,0,0,255`, three white       | `0.25`   |
| 4 pixels, one `0,0,0,0` (clear), three white | `0`      |
| empty `data: []`                             | `0`      |

Existing `isSketchBlank` tests stay green.

---

## 2. `practiceSale.ts` — fair value and buy chance

Pure. No Svelte, no `Date.now`. Callers inject `random` / `now`.

```ts
export const PRACTICE_FULL_EFFORT_MS = 90_000;
export const PRACTICE_MIN_LIST_STROKE_MS = 8_000;
export const PRACTICE_MIN_LIST_COVERAGE = 0.02;
export const PRACTICE_SALE_TICK_MS = 20_000;
export const PRACTICE_ASK_MIN = 1;
export const PRACTICE_ASK_MAX = 9999;

export const PRACTICE_SALE_BASE: Record<string, number> = {
	crayon: 8,
	pencil: 10,
	ink: 12,
	watercolor: 16,
	acrylic: 22,
	oil: 30
};

/** Who walks the floor. Fridge neighbours ≠ museum collectors. */
export const PRACTICE_VENUE_PRESTIGE: Record<string, number> = {
	fridge: 1,
	garage: 1.2,
	storefront: 2,
	'gallery-hall': 3.2,
	'mega-museum': 4
};

/**
 * Highest unlocked client tier, using Spec 15 reputation gates (12 / 30 / 50).
 * Walk-in = 1. Corporate ≈ Mum×4. Billionaire ≈ Mum×10. Auction-era collectors ×12.
 */
export function practiceClientMarket(reputation: number): number {
	if (reputation >= 50) return 12;
	if (reputation >= 30) return 10;
	if (reputation >= 12) return 4;
	return 1;
}

export function canListPracticeForSale(input: { strokeMs: number; coverage01: number }): boolean {
	return (
		input.strokeMs >= PRACTICE_MIN_LIST_STROKE_MS && input.coverage01 >= PRACTICE_MIN_LIST_COVERAGE
	);
}

export function practiceFairValue(input: {
	mediumTierId: string;
	strokeMs: number;
	coverage01: number;
	skillLevel: number;
	venueId: string;
	reputation: number;
}): number {
	const base = PRACTICE_SALE_BASE[input.mediumTierId] ?? 8;
	const effort01 = Math.min(1, Math.max(0, input.strokeMs / PRACTICE_FULL_EFFORT_MS));
	const coverage01 = Math.min(1, Math.max(0, input.coverage01));
	const rank01 = Math.min(1, Math.max(0, (input.skillLevel - 1) / 6));
	const prestige = PRACTICE_VENUE_PRESTIGE[input.venueId] ?? 1;
	const market = practiceClientMarket(input.reputation);
	const raw =
		base *
		(0.2 + 0.8 * effort01) *
		(0.15 + 0.85 * coverage01) *
		(0.55 + 0.45 * rank01) *
		prestige *
		market;
	return Math.max(1, Math.round(raw));
}

/** Probability a visitor buys this listing on one tick. */
export function practiceBuyChance(ask: number, fairValue: number): number {
	if (ask < 1 || fairValue < 1) return 0;
	const ratio = ask / fairValue;
	let chance = 0;
	if (ratio <= 0.5) chance = 0.5;
	else if (ratio <= 1) chance = 0.28;
	else if (ratio <= 1.25) chance = 0.12;
	else if (ratio <= 1.75) chance = 0.04;
	else if (ratio <= 2.5) chance = 0.01;
	else chance = 0;
	if (fairValue <= 2) chance *= 0.25;
	return chance;
}

export function clampAskingPrice(n: number): number {
	if (!Number.isFinite(n)) return PRACTICE_ASK_MIN;
	return Math.min(PRACTICE_ASK_MAX, Math.max(PRACTICE_ASK_MIN, Math.round(n)));
}
```

`practiceClientMarket` literals: `0 → 1`, `11 → 1`, `12 → 4`, `29 → 4`, `30 → 10`, `50 → 12`.

### Fair-value literals (`reputation` is current GameStore reputation)

| medium     | strokeMs | coverage01 | skillLevel | venueId     | reputation | expected |
| ---------- | -------- | ---------- | ---------- | ----------- | ---------- | -------- |
| crayon     | 0        | 0          | 1          | fridge      | 0          | 1        |
| crayon     | 8_000    | 0.02       | 1          | fridge      | 0          | 1        |
| crayon     | 90_000   | 0.40       | 1          | fridge      | 0          | 2        |
| oil        | 90_000   | 0.50       | 7          | fridge      | 0          | 17       |
| watercolor | 45_000   | 0.25       | 4          | storefront  | 0          | 5        |
| watercolor | 45_000   | 0.25       | 4          | storefront  | 12         | 22       |
| oil        | 90_000   | 0.50       | 7          | mega-museum | 0          | 69       |
| oil        | 90_000   | 0.50       | 7          | mega-museum | 30         | 690      |
| oil        | 90_000   | 0.50       | 7          | mega-museum | 50         | 828      |
| nope       | 90_000   | 1          | 7          | fridge      | 0          | 8        |

Worked (watercolor, rep 0):  
`16 × 0.6 × 0.3625 × 0.775 × 2 × 1 = 5.394 → 5`.  
Same at corporate (rep 12): `× 4 = 21.576 → 22` (vs ~$300 corporate jobs).  
Master oil / mega / billionaire (rep 30): `30 × 0.575 × 4 × 10 = 690` (vs ~$1,600 jobs).  
Early fridge crayon 90s: `$2` (vs Mum **$5**). Junk always `$1`.

Recommended price **is** this number. Buy chance uses current venue + **current** reputation at tick time.

### Buy-chance literals

| ask | fairValue | expected |
| --- | --------- | -------- |
| 22  | 22        | 0.28     |
| 10  | 22        | 0.5      |
| 80  | 22        | 0        |
| 1   | 1         | 0.07     |
| 20  | 1         | 0        |
| 0   | 22        | 0        |
| 690 | 690       | 0.28     |

`10/22 ≤ 0.5` → `0.5`. `1/1 ≤ 1` then `fairValue <= 2` → `0.28 × 0.25 = 0.07`.

### `tickPracticeSales`

```ts
export interface PracticeArtwork {
	id: string;
	imageUrl: string;
	title: string;
	mediumTierId: string;
	strokeMs: number;
	coverage01: number;
	skillLevel: number;
	askingPrice: number | null;
	location: 'gallery' | 'storage';
	createdAt: number;
}

export function tickPracticeSales(input: {
	artworks: readonly PracticeArtwork[];
	venueId: string;
	reputation: number;
	random: () => number; // [0, 1)
}): { soldId: string | null } {
	const listed = input.artworks.filter((p) => p.location === 'gallery' && p.askingPrice != null);
	if (listed.length === 0) return { soldId: null };
	const rPick = input.random();
	const index = Math.min(listed.length - 1, Math.floor(rPick * listed.length));
	const piece = listed[index]!;
	const fair = practiceFairValue({
		mediumTierId: piece.mediumTierId,
		strokeMs: piece.strokeMs,
		coverage01: piece.coverage01,
		skillLevel: piece.skillLevel,
		venueId: input.venueId,
		reputation: input.reputation
	});
	const chance = practiceBuyChance(piece.askingPrice!, fair);
	if (input.random() >= chance) return { soldId: null };
	return { soldId: piece.id };
}
```

| Setup                                             | `random` sequence | Expected                    |
| ------------------------------------------------- | ----------------- | --------------------------- |
| no listed                                         | (none)            | `soldId: null`              |
| one listed, chance 0 (ask 80, fair 22)            | `0`, `0`          | `null`                      |
| one listed, chance 0.28, `random` `0` then `0.27` | `0`, `0.27`       | that id                     |
| one listed, `random` `0` then `0.28`              | `0`, `0.28`       | `null` (`>= chance`)        |
| two listed, `random` `0.6` then `0`               | `0.6`, `0`        | second id if its chance > 0 |

`canListPracticeForSale({ strokeMs: 7999, coverage01: 0.5 })` → `false`.  
`canListPracticeForSale({ strokeMs: 8000, coverage01: 0.019 })` → `false`.  
`canListPracticeForSale({ strokeMs: 8000, coverage01: 0.02 })` → `true`.

Buyer label (same module):

```ts
export function practiceBuyerLabel(venueId: string): string {
	if (venueId === 'mega-museum') return 'A collector';
	if (venueId === 'gallery-hall') return 'A visitor';
	if (venueId === 'storefront') return 'A passer-by';
	return 'A neighbour';
}
```

| venueId      | expected    |
| ------------ | ----------- |
| fridge       | A neighbour |
| garage       | A neighbour |
| storefront   | A passer-by |
| gallery-hall | A visitor   |
| mega-museum  | A collector |
| nope         | A neighbour |

### Synthetic gallery entry

```ts
export function practiceAsGalleryEntry(piece: PracticeArtwork): GalleryEntry {
	return {
		id: piece.id,
		imageUrl: piece.imageUrl,
		title: piece.title,
		payout: piece.askingPrice ?? 0,
		score: 1,
		clientName: 'Practice',
		briefId: `practice:${piece.id}`,
		completedAt: piece.createdAt
	};
}
```

`inviteClient` exclude-ids stay on `galleryHistory` only — never practice `briefId`s.

---

## 3. Per-venue storage object (`studioStorage.ts`)

```ts
export interface VenueStorageDef {
	venueId: string;
	/** Panel title / region label. */
	name: string;
	tagline: string;
	/** E-prompt without the `E — ` prefix. */
	promptLabel: string;
	/** furniture.png frame, or indoor sheet frame when `sheet` is set. */
	frame: number;
	sheet?: 'home-indoor';
	tx: number;
	ty: number;
}

export const VENUE_STORAGE: readonly VenueStorageDef[] = [
	{
		venueId: 'fridge',
		name: "Mum's rainy-day box",
		tagline: 'Shoebox under the sink. Magnets were full.',
		promptLabel: 'Open crate',
		frame: 1, // furniture.png barrel
		tx: 5,
		ty: 4
	},
	{
		venueId: 'garage',
		name: 'Cardboard archive',
		tagline: 'Taped shut. Probably important.',
		promptLabel: 'Open boxes',
		frame: 2, // chest
		tx: 10,
		ty: 8
	},
	{
		venueId: 'storefront',
		name: 'Back-room stock',
		tagline: 'Not in the window. Not forgotten.',
		promptLabel: 'Open stock',
		frame: 2,
		tx: 1,
		ty: 10
	},
	{
		venueId: 'gallery-hall',
		name: 'Archive closet',
		tagline: 'Climate is a strong word.',
		promptLabel: 'Open archive',
		frame: 364, // INDOOR.cabinet
		sheet: 'home-indoor',
		tx: 3,
		ty: 12
	},
	{
		venueId: 'mega-museum',
		name: 'Conservation vault',
		tagline: 'Off display. Still yours.',
		promptLabel: 'Open vault',
		frame: 364,
		sheet: 'home-indoor',
		tx: 25,
		ty: 14
	}
] as const;

export function storageForVenue(venueId: string): VenueStorageDef {
	return VENUE_STORAGE.find((s) => s.venueId === venueId) ?? VENUE_STORAGE[0];
}
```

`rooms.ts`: append one furniture entry per room with `interactableId: 'storage'`,
`solid: true`, matching `tx/ty/frame/sheet`. Call `solidAt` on that tile when the
room uses the collision grid (kitchen already does this for the fridge).

Do **not** place storage on spec 33 cabinet tiles or Mum patrol tiles
`(4,2) (4,4) (1,4) (3,2) (2,3)`.

`rooms.test.ts`:

| Assertion                                        | Expected             |
| ------------------------------------------------ | -------------------- |
| kitchen furniture `interactableId === 'storage'` | `{ tx: 5, ty: 4 }`   |
| garage storage                                   | `{ tx: 10, ty: 8 }`  |
| storefront storage                               | `{ tx: 1, ty: 10 }`  |
| gallery storage                                  | `{ tx: 3, ty: 12 }`  |
| mega storage                                     | `{ tx: 25, ty: 14 }` |
| each venue has exactly one `'storage'` tag       | true                 |

`interactables.ts`:

- Extend `InteractableId` with `'storage'`.
- `STORAGE` def: `promptLabel` is a fallback `'Open storage'`; the scene uses
  `storageForVenue(snapshot.activeVenueId).promptLabel`.
- `defForInteractable` **MUST** switch on id (`fridge` / `toolkit-shelf` / `storage`).
  Today non-fridge falls through to toolkit — that bug must not swallow storage.
- `interactPromptText` adds `{ kind: 'storage'; label: string }` → `E — ${label}`.

| Input                                      | Expected         |
| ------------------------------------------ | ---------------- |
| `{ kind: 'storage', label: 'Open crate' }` | `E — Open crate` |
| `{ kind: 'storage', label: 'Open vault' }` | `E — Open vault` |

Bridge: add `{ type: 'open-storage' }` to `StudioOutboundEvent`.

`StudioScene` `#tryInteract` prop branch:

```
if (target.id === 'storage') {
  this.#bridge.emit({ type: 'open-storage' });
  return;
}
```

Prompt uses `storageForVenue(this.#snapshot?.activeVenueId ?? 'fridge').promptLabel`.
Interact priority unchanged (talk → deliver → desk → easel → look → prop).

---

## 4. Save schema

In `save.ts`, next to `hiredArtistSchema`:

```ts
export const practiceArtworkSchema = z.object({
	id: z.string().min(1),
	imageUrl: z.string().min(1),
	title: z.string().min(1),
	mediumTierId: z.string().min(1),
	strokeMs: z.number().nonnegative(),
	coverage01: z.number().min(0).max(1),
	skillLevel: z.number().int().min(1).max(7),
	askingPrice: z.number().int().min(1).nullable(),
	location: z.enum(['gallery', 'storage']),
	createdAt: z.number().int().nonnegative()
});

export type PracticeArtworkSave = z.infer<typeof practiceArtworkSchema>;
```

On `saveDataSchema`:

```ts
practiceArtworks: z.array(practiceArtworkSchema).default([]);
```

Old saves without the key parse as `[]`. `createDefaultSave` stays a parse of the
minimal blob (Zod fills the default). Persist + slot switch round-trip the array.

Tests: default save `practiceArtworks` is `[]`; persist/load one storage piece and one
gallery listing restores both ids and `askingPrice`.

---

## 5. GameStore

Session (not saved):

```ts
practiceStrokeMs = $state(0);
lastPracticeSale = $state<{
	title: string;
	price: number;
	buyerLabel: string;
} | null>(null);
```

`enterPractice`: set `practiceStrokeMs = 0` (in addition to today’s flag).  
`grantPracticeDrawingMs`: when `practiceOpen`, also `this.practiceStrokeMs += deltaMs`.  
`exitPractice` / `reset` / slot load: `practiceStrokeMs = 0`.

Persisted: `practiceArtworks = $state<PracticeArtwork[]>([])`. Hydrate in
`#applySlotSave`; write in `#persist`. `reset()` → `[]`.

### `displayedGalleryEntries`

```
practiceHung ← practiceArtworks.filter(location === 'gallery')
               .sort(createdAt desc)
               .map(practiceAsGalleryEntry)
commissionSlots ← max(0, venue.capacity - practiceHung.length)
commissions ← existing curator/recency sort of galleryHistory, slice(0, commissionSlots)
return [...practiceHung, ...commissions]
```

Fridge capacity 3 + 2 hung practice + 5 commissions → 2 practice + 1 commission.
Tests must pin ids.

`archivedCommissionEntries` derived: `galleryHistory` entries whose `id` is **not** in
`displayedGalleryEntries`.

### `keepPractice`

```ts
keepPractice(input: {
	imageUrl: string;
	coverage01: number;
	destination: 'gallery' | 'storage';
	askingPrice?: number;
	id?: string; // tests
}): boolean
```

- No-op (`false`) unless `practiceOpen`.
- If `isSketchBlank`-equivalent (`coverage01 < 0.005`) → `false`.
- Snapshot `skillLevel` from `mediumSkillProgress(activeMediumTierId, xp).level`.
- `title` = `` `Practice — ${getMediumTier(activeMediumTierId).name}` ``.
- `createdAt = #now()`.
- Durable-ize `imageUrl` via existing `ensureDurableImageUrl` if it is not already
  `data:` (Keep path should pass a data URL from the overlay; if a blob URL slips
  through, convert — `keepPractice` MAY be `async` like `collectCash` if that is
  cleaner; if async, tests `await` it).
- Destination `storage`: `location: 'storage'`, `askingPrice: null`. Push. Persist.
  `exitPractice()`. Return `true`.
- Destination `gallery`: if `!canListPracticeForSale({ strokeMs: practiceStrokeMs, coverage01 })`
  return `false`. `askingPrice = clampAskingPrice(input.askingPrice ?? fairValue)`.
  If hung practice count `>= venue.capacity`, set the **oldest** hung practice
  (`createdAt` asc) to `location: 'storage'`, `askingPrice: null`. Then push the new
  piece as gallery. Persist. `exitPractice()`. Return `true`.

### `movePracticeToStorage(id)` / `hangPracticeFromStorage(id, askingPrice)`

- `movePracticeToStorage`: if found, `location = 'storage'`, `askingPrice = null`. Persist.
- `hangPracticeFromStorage`: if found and `canListPracticeForSale` (using saved
  stroke/coverage), same capacity kick as Keep-to-gallery, then `location = 'gallery'`,
  clamped price. Return `false` if unlistable.

Commissions cannot be hung from storage in v1.

### Sale clock

Private `#practiceSaleTimer`. Arm when entering `idle` and `!practiceOpen`; clear on
`enterPractice`, non-idle phases, `reset`, destroy.

Every `PRACTICE_SALE_TICK_MS`, call `tickPracticeSales` with injected `random`
(`Math.random` in prod; tests pass a stub via constructor/`GameStoreDeps` — add
`random?: () => number` to deps if missing, default `Math.random`).

On `soldId`:

- Find piece, `cash += askingPrice`, remove from `practiceArtworks`.
- `lastPracticeSale = { title, price: askingPrice, buyerLabel: practiceBuyerLabel(unlockedVenueId) }`.
- Persist. Do **not** touch reputation or `commissionsCompleted`.

`clearPracticeSaleToast()` sets `lastPracticeSale = null`.

No sale ticks during `practiceOpen` or while a commission is in flight.

Store tests (literal):

| Call                                                                                                               | Expected                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| idle `enterPractice`; `grantPracticeDrawingMs(8000)`; `keepPractice({ coverage01: 0.05, destination: 'storage' })` | `practiceArtworks[0].location === 'storage'`, `askingPrice === null`, `practiceOpen === false`, title `Practice — Crayons & Construction Paper` |
| same but `destination: 'gallery', askingPrice: 4` after 8000ms + coverage 0.05                                     | location gallery, askingPrice 4, `displayedGalleryEntries[0].id` is the piece                                                                   |
| gallery keep with `strokeMs` 1000                                                                                  | `false`, array unchanged, still practising                                                                                                      |
| fridge capacity 3, 3 hung practice, hang a 4th                                                                     | oldest of the first three moves to storage; new one on wall; `displayedGalleryEntries` length 3                                                 |
| 2 hung practice + 5 commissions, fridge                                                                            | displayed length 3: 2 practice then 1 commission                                                                                                |
| sale tick with stub `random` that sells                                                                            | cash += ask; piece gone; `lastPracticeSale.price` is ask; reputation unchanged                                                                  |
| `tick` while `practiceOpen`                                                                                        | no sale                                                                                                                                         |

---

## 6. `PracticeDesk.svelte`

Replace the single **Done** button. Presentational; no store import beyond what it
already uses (`mediumTiers`, `MediumSkillProgress`). It **MAY** import
`canListPracticeForSale`, `practiceFairValue`, `clampAskingPrice` from `$lib/game`.

New / changed props:

```ts
practiceStrokeMs: number;          // from GameStore.practiceStrokeMs
venueId: string;
reputation: number;
skillLevel: number;                // skill.level
onscrap: () => void;               // was ondone
onkeep: (payload: {
	destination: 'gallery' | 'storage';
	askingPrice: number | null;
	imageUrl: string;
	coverage01: number;
}) => void;
```

Remove `ondone`. Overlay maps `onscrap` → `exitPractice` and `onkeep` → `keepPractice`
then relies on the store to close practice.

Local step `$state<'draw' | 'keep' | 'price'>('draw')`.

Wire `SketchCanvas` `onexportready` and bind `hasStrokes`. On Keep, `getBlob()`, convert
with existing `blobToDataUrl` (`$lib/game/submitChoice`), decode pixels (OffscreenCanvas
or a `<canvas>` draw). If blob is null, treat coverage as `0`. Tests stub `onkeep`
without needing a real PNG — add an optional `coverageOverride?: number` prop **only if**
component tests cannot decode a blob in Chromium; prefer real `getBlob` if the canvas
already paints in tests. If decoding is flaky in component tests, assert that **Add to
gallery** is disabled when `practiceStrokeMs < 8000` (no pixel decode required for that
case) and unit-test coverage in `sketchBlank.test.ts`.

**Draw step**

- Button **Scrap** — `aria-label="Scrap this practice painting"` → `onscrap`.
- Button **Keep** — `aria-label="Keep this practice painting"` — disabled when
  `!hasStrokes` (or coverage 0). Enabled Keep → step `keep`.

**Keep step** (`role="group"` `aria-label="Keep practice painting"`)

- **Add to gallery** — `aria-label="Add to gallery"` — disabled when
  `!canListPracticeForSale({ strokeMs: practiceStrokeMs, coverage01 })`.
  Disabled title/text: `Too little paint for a sale — draw more, or put it in storage.`
  Click → step `price`.
- **Put in storage** — `aria-label="Put in storage"` → `onkeep({ destination: 'storage', askingPrice: null, imageUrl, coverage01 })`.
- **Back** — returns to draw step (canvas stays).

**Price step** (`role="group"` `aria-label="Set asking price"`)

- Visible line **Recommended price: $X** where
  `X = practiceFairValue({ mediumTierId, strokeMs: practiceStrokeMs, coverage01, skillLevel, venueId, reputation })`.
- Number input `aria-label="Asking price"` min 1 max 9999, default `X`.
- Helper: `Recommended $X. Visitors walk away if you ask much more.`
- **Hang in gallery** → `onkeep({ destination: 'gallery', askingPrice: clampAskingPrice(+input), imageUrl, coverage01 })`.
- **Back** → keep step.

Canvas unavailable: Scrap still works (replaces today’s Done-still-works rule).

Component tests:

| Action                                                                                    | Expected                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Scrap click                                                                               | `onscrap` once                                                 |
| Keep with `practiceStrokeMs` 0                                                            | Keep disabled **or** Add to gallery disabled after Keep        |
| Keep with `practiceStrokeMs` 9000 → Put in storage                                        | `onkeep` destination `storage`                                 |
| Keep with 9000 → Add to gallery → Hang                                                    | `onkeep` destination `gallery`, askingPrice is the input value |
| Default asking price at crayon / 90_000 / coverageOverride 0.4 / skill 1 / fridge / rep 0 | input value `2`; visible **Recommended price: $2**             |
| Same at storefront watercolor coverage 0.25 / 45_000 / skill 4 / rep 12                   | **Recommended price: $22**                                     |
| Overlay: Scrap fires `onexitpractice` (rename mapping)                                    | once                                                           |

Update `StudioHudOverlay.svelte.test.ts` — the old “Done / Finish practising” case
becomes Scrap.

---

## 7. `StoragePanel.svelte`

Presentational dialog (`role="dialog"` `aria-label={storageName}`).

```ts
interface Props {
	storageName: string;
	tagline: string;
	practiceStored: PracticeArtwork[]; // location storage
	practiceHung: PracticeArtwork[]; // location gallery
	archivedCommissions: GalleryEntry[];
	venueId: string;
	reputation: number;
	onhangpractice: (id: string, askingPrice: number) => void;
	ontakepractice: (id: string) => void;
	onclose: () => void;
}
```

Sections:

1. **On the wall** — hung practice. Each row: thumb, title, `Listed at $N`, button
   **Take down** (`aria-label="Take down {title}"`) → `ontakepractice`.
2. **In storage** — stored practice. **Hang** opens an inline asking-price field
   showing **Recommended price: $X** (piece’s saved stroke/coverage/skill + current
   `venueId` + `reputation`) and **Hang in gallery**. If `!canListPracticeForSale(piece)`
   the Hang button is disabled with the too-little-paint copy.
3. **Off the wall** — `archivedCommissions`. Title + “Commission archive — returns when
   there is space.” No hang button.

Empty storage + empty archive + empty hung: `Nothing stored yet.`

GameMenuBar: button **Storage** `aria-label="Open storage"` next to Gallery Upgrades.
`openStorageNonce?: number` (same nonce pattern as toolkit from spec 21b) **or** a
bindable `showStorage` — pick nonce to match toolkit.

`+page.svelte`: `open-storage` increments the nonce / sets show. Wire
`hangPracticeFromStorage` / `movePracticeToStorage`.

Idle CSS kitchen: GameMenuBar is enough (no second IdlePanel button required).

---

## 8. `PracticeSaleToast.svelte` + FridgeGallery caption

```ts
{ sale: { title: string; price: number; buyerLabel: string } | null }
```

When `sale` is non-null, a polite live region:
`{buyerLabel} bought {title} for ${price}.`
`role="status"`. No pointer trap. Parent clears after ~4s.

FridgeGallery: if `entry.briefId.startsWith('practice:')` and `entry.payout > 0`, render
a second line `For sale · ${payout}` (visible text, not a CSS-only cue). Commission
rows unchanged.

---

## 9. Overlay / page wiring

`StudioHudOverlay` practice props:

- Drop `ondone` mapping.
- Pass `practiceStrokeMs`, `venueId={game.unlockedVenueId}`, `reputation={game.reputation}`, `skillLevel={skill.level}`.
- `onscrap={() => onexitpractice?.()}`.
- `onkeep` forwarded as `onkeeppractice`.

`+page` `onkeeppractice`:

```
await game.keepPractice({ imageUrl, coverage01, destination, askingPrice: askingPrice ?? undefined })
```

`keepPractice` already `exitPractice`s on success.

Mount `PracticeSaleToast` from `game.lastPracticeSale`. Mount `StoragePanel` when open.

---

## Tests (zone extra)

| Case                                         | Expected                                 |
| -------------------------------------------- | ---------------------------------------- |
| `storageForVenue('mega-museum').promptLabel` | `Open vault`                             |
| `storageForVenue('nope').name`               | `Mum's rainy-day box`                    |
| FridgeGallery practice entry                 | accessible text includes `For sale · $4` |
| StoragePanel Hang on unlistable piece        | Hang disabled                            |
| StoragePanel Take down                       | `ontakepractice` with id                 |
| GameMenuBar Storage nonce                    | dialog titled with `storageName`         |
| interactables storage prompt                 | `E — Open crate`                         |

---

## Definition of done

- [x] Practice footer is Scrap / Keep, not Done; Keep offers gallery or storage
- [x] Gallery listing requires 8s stroke + 2% coverage and a player-set price
- [x] Fair value / buy chance match the literal tables; junk listed above ~2.5× never sells
- [x] Hung practice occupies capacity first; overflow practice goes to storage
- [x] Off-wall commissions appear in the storage panel; not for sale
- [x] Each venue has a uniquely named storage prop; E opens StoragePanel
- [x] Idle sale ticks pay cash only; toast names a visitor; no offline catch-up
- [x] Synthetic practice entries hang on FridgeGallery / easels via `displayedGalleryEntries`
- [x] Unit + component tests per tables; `.svelte.test.ts` suffix for components
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for this zone
- [x] Directory READMEs + TSDoc current; handoff in `docs/agent-log.md`
- [x] `docs/tasks/README.md` index row for spec 34
- [x] No writes outside the ownership zone; no `contracts.ts`; no `+server.ts`

## Out of scope

- New Phaser shopper NPCs / opening-night crowds (spec 21 catalog).
- Selling commissioned work or print-shop interaction with practice stock.
- Player-typed titles, frames, or lighting per piece.
- Manual commission curation / drag-and-drop hang.
- Changing venue `capacity` numbers or Spec 16 idle staff rates.
- Spec 33 kitchen fridge-wall furniture (different tiles).
