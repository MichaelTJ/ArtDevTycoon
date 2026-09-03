# Spec 27 — Medium skill (time-based brush ranks)

**Status:** Implemented. Do **not** start Spec 28 until this spec is green.
**Worktree:** `git worktree add -b agent/medium-skill ../adt-wt-medium-skill main`
**Depends on:** Specs 13 (mediums), 20 (craft XP pattern), 24 (hired artists), 25 (brushes).
**Unlocks:** Spec 28 (practice station).

## Mission

Buying a medium (Spec 13) currently staples one fixed hidden suffix onto every Janus
prompt — pencil is always `rough pencil sketch…`, oil is always `masterpiece`. Explorer
runs showed the real lever: **the same medium at different skill adjectives**. A prompt
like `rough pencil sketch of an apple` comes back dodgey; `masterful pencil portrait of
an apple` comes back as a real drawing.

This spec adds a **per-medium skill** for the player and for every hired artist. Rank
(Novice → Master, 1–7) picks the hidden suffix. XP is **time-based**: the player gains
while a commission is generating; artists gain while hired (faster while assigned). The
player never sees the suffix (best-practices §8.3). They see a rank name and a bar.

This is **not** Spec 20 Prompting / Imagination / Hustle (those still bank on Collect
Cash and still feed `skillPayoutMultiplier`). This is **not** Spec 24 artist training
XP (that still drives assignment **speed** via `artistLevel`). Medium skill drives
**how the picture looks**.

---

## Ownership zone

```
New:
  src/lib/data/mediumSkillTiers.ts
  src/lib/data/mediumSkillTiers.test.ts
  src/lib/game/mediumSkill.ts
  src/lib/game/mediumSkill.test.ts
  docs/tasks/27-medium-skill.md          ← DoD ticks only after impl

Edit (targeted):
  src/lib/data/mediumTiers.ts            ← amateur-in-medium L1 suffixes (see §2)
  src/lib/data/mediumTiers.test.ts       ← only if existing assertions name old copy
  src/lib/data/README.md
  src/lib/game/promptPipeline.ts
  src/lib/game/promptPipeline.test.ts
  src/lib/game/save.ts
  src/lib/game/save.test.ts
  src/lib/game/assignCommission.ts       ← HiredArtistState.mediumSkillXp
  src/lib/game/assignCommission.test.ts  ← hire-shape / findHiredArtist only if needed
  src/lib/game/index.ts
  src/lib/game/README.md
  src/lib/stores/gameState.svelte.ts
  src/lib/stores/gameState.svelte.test.ts
  src/lib/stores/README.md
  src/lib/components/ProgressPanel.svelte
  src/lib/components/ProgressPanel.svelte.test.ts
  src/lib/components/TeamRoster.svelte
  src/lib/components/TeamRoster.svelte.test.ts
  src/lib/components/index.ts            ← only if a new component is added (none expected)
  src/lib/components/README.md
  src/routes/+page.svelte                ← pass medium-skill props into ProgressPanel / TeamRoster
  docs/tasks/README.md                   ← Wave N row (status ticks)
  docs/agent-log.md                      ← handoff
```

**MUST NOT** edit: `package.json`, lockfiles, `src/lib/types/contracts.ts`,
`best-practices.md`, `docs/architecture.md` (orchestrator-owned — already updated),
engine workers, Phaser (`src/lib/studio/**`), `SketchCanvas.svelte` (Spec 28),
Spec 20 `skills.ts`.

Do not add a `+server.ts`. Do not download a model in tests. Use the injected mock
engine for artist generate.

---

## Locked product rules

1. **One XP map per painter per medium.** Keys are Spec 13 medium ids
   (`crayon` / `pencil` / `ink` / `watercolor` / `acrylic` / `oil`). Missing key = 0 XP
   = rank 1 (Novice).
2. **Level is derived, never stored.** Same pattern as Spec 20.
3. **Unlocking a medium does not grant skill.** A brand-new oil set is still Novice oil.
   Spec 13's `payoutMultiplier` still pays more for expensive materials; skill is how
   well you handle them.
4. **Crayon rank 1 suffix is byte-identical to `LEVEL_1.promptModifiers`.** Fresh saves
   must not change Level 1 comedy.
5. **The modified prompt stays invisible** in player UI. Rank **name** is visible.
6. **Clock is injected.** `GameStore`'s existing `#now` / income ticker drive artist
   ticks. Tests fake the clock. No `Date.now()` inside `mediumSkill.ts`.
7. **Catch-up is capped** so a week of AFK cannot max a skill. See literals below.
8. **Mock remains first-class.** Artist generate uses whatever engine is injected;
   tests inject a fake. Failure falls back to today's SVG mock artwork.

---

## 1. Literals (copy these — tests pin them)

```ts
export const MEDIUM_SKILL_LEVEL_CAP = 7;

/** Rank names shown in UI. Index = level - 1. */
export const MEDIUM_SKILL_RANK_LABELS = [
	'Novice',
	'Doodler',
	'Student',
	'Competent',
	'Skilled',
	'Expert',
	'Master'
] as const;

/** XP to go from `level` → `level + 1`. Level 1→2 = 60, then +30 per step. */
export function mediumSkillXpToNext(level: number): number {
	if (level < 1) return 60;
	if (level >= MEDIUM_SKILL_LEVEL_CAP) return 0;
	return 60 + (level - 1) * 30;
}
// Totals to reach level 7 from 0: 60+90+120+150+180+210 = 810

/** Player: 1 XP per this many ms of generating-phase wall time (active medium). */
export const COMMISSION_PAINT_MS_PER_XP = 8_000;

/** Player: 1 XP per this many ms of pointer-down drawing. Spec 28 calls this. */
export const PRACTICE_MS_PER_XP = 3_000;

/** Hired artist, not on an assignment: 1 XP per this many ms, into the studio's active medium. */
export const ARTIST_IDLE_MS_PER_XP = 60_000;

/** Hired artist on an assignment: 1 XP per this many ms, into `assignment.mediumTierId`. */
export const ARTIST_WORK_MS_PER_XP = 2_000;

/** Clamp artist catch-up on load / ticker gap. 10 minutes. */
export const MAX_ARTIST_SKILL_CATCHUP_MS = 600_000;
```

Worked XP table (pin in tests):

| From level | XP needed | Cumulative XP to _reach_ this next level |
| ---------- | --------- | ---------------------------------------- |
| 1 → 2      | 60        | 60                                       |
| 2 → 3      | 90        | 150                                      |
| 3 → 4      | 120       | 270                                      |
| 4 → 5      | 150       | 420                                      |
| 5 → 6      | 180       | 600                                      |
| 6 → 7      | 210       | 810                                      |
| 7 (cap)    | 0         | —                                        |

Time-to-rank-2 examples (pin):

| Source                    | ms / XP | Time for 60 XP |
| ------------------------- | ------- | -------------- |
| Player generating         | 8_000   | 480_000 ms     |
| Player practice (Spec 28) | 3_000   | 180_000 ms     |
| Artist idle               | 60_000  | 3_600_000 ms   |
| Artist assigned           | 2_000   | 120_000 ms     |

---

## 2. `src/lib/data/mediumTiers.ts` — amateur L1 suffixes

Keep **crayon** and **pencil** `promptModifierSuffix` **byte-identical** to today.

Rewrite these three so buying the medium is not an instant masterpiece. Rank 1 of
Spec 27 will read these strings via `mediumSkillSuffix(id, 1)`.

| id           | New `promptModifierSuffix` (rank 1)                                           |
| ------------ | ----------------------------------------------------------------------------- |
| `watercolor` | `beginner watercolor, uneven washes, muddy paper, amateur watercolour study`  |
| `acrylic`    | `flat vector, basic digital painting, amateur tablet art, simple cel shading` |
| `oil`        | `beginner oil painting, muddy colors, finger-painted oil, amateur canvas`     |

Ink stays as today's student-portfolio string (already amateur-in-medium).

**Test (add to `mediumTiers.test.ts`):** crayon suffix equals
`LEVEL_1.promptModifiers` from `$lib/types/contracts`.

Shop taglines / costs / multipliers **MUST NOT** change.

---

## 3. `src/lib/data/mediumSkillTiers.ts`

Hidden suffixes. Player-facing copy never imports this file into HUD labels — only
`mediumSkill.ts` rank names go on screen.

```ts
import { getMediumTier, MEDIUM_TIERS } from './mediumTiers';

export const MEDIUM_SKILL_SUFFIXES: Readonly<Record<string, readonly string[]>> = {
	crayon: [
		getMediumTier('crayon').promptModifierSuffix,
		'childlike crayon drawing, construction paper, waxy texture, simple shapes',
		'crayon illustration, construction paper collage, bold color blocks, naive art',
		'detailed crayon artwork, rich wax texture, careful coloring, student art',
		'skilled crayon illustration, layered wax, vibrant construction paper, gallery craft',
		'professional crayon artwork, refined wax blending, intricate crayon detail',
		'masterful crayon illustration, rich wax layers, museum-quality construction paper art'
	],
	pencil: [
		getMediumTier('pencil').promptModifierSuffix,
		'quick pencil sketch, light graphite, loose construction lines, sketchbook page',
		'pencil sketch, sketchbook study, basic proportions, simple hatching',
		'detailed pencil drawing, graphite shading, careful contours, even lines',
		'refined pencil illustration, cross-hatching, accurate proportions, clean graphite',
		'highly detailed pencil portrait, fine graphite, professional draftsmanship',
		'masterful pencil portrait, museum-quality graphite, intricate detail, perfect proportions'
	],
	ink: [
		getMediumTier('ink').promptModifierSuffix,
		'heavy charcoal sketch, smudged shadows, rough ink lines, student study',
		'ballpoint scratch drawing, ink wash, charcoal shading, uneven hatching',
		'ink and charcoal drawing, crisp outlines, deliberate shadow, portfolio piece',
		'detailed ink illustration, charcoal grain, confident linework',
		'fine-liner pen illustration, stipple shading, dramatic chiaroscuro',
		'masterful ink and charcoal drawing, fine-liner stipple, museum-quality linework'
	],
	watercolor: [
		getMediumTier('watercolor').promptModifierSuffix,
		'loose watercolor sketch, uneven washes, beginner gouache, paper buckling',
		'watercolor study, soft pastels, simple gouache, student wash',
		'watercolor painting, delicate blending, controlled gouache, clean paper',
		'skilled watercolor illustration, luminous washes, confident gouache',
		'matte gouache painting, refined watercolor, professional illustration',
		'master gouache painting, luminous watercolor, museum-quality washes'
	],
	acrylic: [
		getMediumTier('acrylic').promptModifierSuffix,
		'flat vector basic, simple digital painting, amateur tablet sketch',
		'cell-shaded digital, basic acrylic study, clean but simple shapes',
		'digital illustration, vector art, cel shading, student portfolio piece',
		'skilled digital painting, polished cel shading, professional tablet work',
		'refined acrylic and digital illustration, crisp outlines, gallery finish',
		'masterful digital illustration, polished vector, professional finish, artstation trending'
	],
	oil: [
		getMediumTier('oil').promptModifierSuffix,
		'amateur oil study, thick muddy impasto, beginner canvas, uneven color',
		'student oil painting, simple still life, visible brushwork, sketchy canvas',
		'oil painting on canvas, decent impasto, careful mixing, student gallery',
		'skilled oil painting, rich impasto, accurate light, professional canvas',
		'detailed oil on canvas, intricate brushwork, gallery-quality realism',
		'oil painting on canvas, impasto, masterpiece, intricate detail, hyperrealistic, trending on artstation'
	]
};
```

`getMediumTier` inside the array initialiser is fine — `mediumTiers.ts` has no import
cycle with this file.

**Helpers in the same file (or in `mediumSkill.ts` — pick one and re-export from
`$lib/game`):**

```ts
/** Clamp 1..7; unknown medium id → crayon ladder. */
export function mediumSkillSuffix(mediumId: string, level: number): string;
```

**Tests (`mediumSkillTiers.test.ts`):**

| Case                                                                                 | Expected |
| ------------------------------------------------------------------------------------ | -------- |
| Every `MEDIUM_TIERS` id has exactly 7 suffixes                                       | true     |
| `mediumSkillSuffix(id, 1)` === `getMediumTier(id).promptModifierSuffix` for every id | true     |
| `mediumSkillSuffix('crayon', 1)` === `LEVEL_1.promptModifiers`                       | true     |
| `mediumSkillSuffix('pencil', 7)` contains `masterful pencil portrait`                | true     |
| `mediumSkillSuffix('nope', 1)` === crayon rank 1                                     | true     |
| `mediumSkillSuffix('pencil', 0)` === rank 1 (clamp)                                  | true     |
| `mediumSkillSuffix('pencil', 99)` === rank 7 (clamp)                                 | true     |

---

## 4. `src/lib/game/mediumSkill.ts`

Pure. No Svelte, DOM, or `Date.now`.

```ts
export type MediumSkillXpMap = Record<string, number>;

export function createEmptyMediumSkillXp(): MediumSkillXpMap {
	return {};
}

export function mediumSkillXpOf(map: MediumSkillXpMap, mediumId: string): number {
	return Math.max(0, Math.floor(map[mediumId] ?? 0));
}

export function grantMediumSkillXp(
	map: MediumSkillXpMap,
	mediumId: string,
	amount: number
): MediumSkillXpMap {
	if (amount <= 0) return map;
	return { ...map, [mediumId]: mediumSkillXpOf(map, mediumId) + Math.floor(amount) };
}

export interface MediumSkillProgress {
	mediumId: string;
	xp: number;
	level: number; // 1..7
	rankLabel: string; // from MEDIUM_SKILL_RANK_LABELS
	xpIntoLevel: number;
	xpForNext: number; // 0 at cap
	fill: number; // 0..1, 1 at cap
}

export function mediumSkillProgress(mediumId: string, xp: number): MediumSkillProgress;

/** Same loop as spec 20 `skillProgress`, using `mediumSkillXpToNext`. */

export function mediumSkillXpThresholdForLevel(level: number): number {
	let total = 0;
	for (let L = 1; L < level; L++) total += mediumSkillXpToNext(L);
	return total;
}

/**
 * Convert elapsed time + leftover remainder into whole XP.
 * `msPerXp` MUST be > 0; if not, return current remainder unchanged and xpGain 0.
 */
export function applyElapsedSkillMs(input: {
	elapsedMs: number;
	msPerXp: number;
	remainderMs: number;
}): { xpGain: number; remainderMs: number } {
	const elapsed = Math.max(0, input.elapsedMs);
	const remainder = Math.max(0, input.remainderMs);
	const msPerXp = input.msPerXp;
	if (!(msPerXp > 0)) return { xpGain: 0, remainderMs: remainder };
	const total = elapsed + remainder;
	return { xpGain: Math.floor(total / msPerXp), remainderMs: total % msPerXp };
}

export function clampArtistSkillCatchupMs(elapsedMs: number): number {
	return Math.min(MAX_ARTIST_SKILL_CATCHUP_MS, Math.max(0, elapsedMs));
}
```

**Tests (`mediumSkill.test.ts`) — literal:**

| Call                                                                      | Expected                           |
| ------------------------------------------------------------------------- | ---------------------------------- |
| `mediumSkillProgress('pencil', 0).level`                                  | `1`                                |
| `.rankLabel`                                                              | `'Novice'`                         |
| `.xpForNext`                                                              | `60`                               |
| `.fill`                                                                   | `0`                                |
| `mediumSkillProgress('pencil', 59).fill`                                  | `59/60`                            |
| `mediumSkillProgress('pencil', 60).level`                                 | `2`                                |
| `.rankLabel`                                                              | `'Doodler'`                        |
| `mediumSkillProgress('pencil', 810).level`                                | `7`                                |
| `.fill`                                                                   | `1`                                |
| `.xpForNext`                                                              | `0`                                |
| `mediumSkillProgress('pencil', 900).level`                                | `7` (cap; extra XP kept on `.xp`)  |
| `grantMediumSkillXp({}, 'pencil', 10).pencil`                             | `10`                               |
| `grantMediumSkillXp({ pencil: 5 }, 'pencil', 0)`                          | same object values, pencil stays 5 |
| `applyElapsedSkillMs({ elapsedMs: 8000, msPerXp: 8000, remainderMs: 0 })` | `{ xpGain: 1, remainderMs: 0 }`    |
| `applyElapsedSkillMs({ elapsedMs: 7999, msPerXp: 8000, remainderMs: 0 })` | `{ xpGain: 0, remainderMs: 7999 }` |
| `applyElapsedSkillMs({ elapsedMs: 1, msPerXp: 8000, remainderMs: 7999 })` | `{ xpGain: 1, remainderMs: 0 }`    |
| `clampArtistSkillCatchupMs(999_999)`                                      | `600_000`                          |
| `mediumSkillXpThresholdForLevel(7)`                                       | `810`                              |
| `mediumSkillXpThresholdForLevel(1)`                                       | `0`                                |

---

## 5. `promptPipeline.ts`

```ts
export function buildPrompt(playerInput: string, tier: MediumTier, skillLevel: number = 1): string {
	const clean = sanitizePlayerPrompt(playerInput);
	if (clean === '') {
		throw new Error('Prompt cannot be empty.');
	}
	return `${clean}, ${mediumSkillSuffix(tier.id, skillLevel)}`;
}
```

`buildLevel1Prompt` stays a crayon wrapper and **MUST** keep producing the same string
as today (`a dragon, flat color, simple line art, …`).

**Tests to add:**

| Call                                       | Expected                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `buildPrompt('an apple', pencil, 1)`       | `` `an apple, ${getMediumTier('pencil').promptModifierSuffix}` ``                                              |
| `buildPrompt('an apple', pencil, 7)`       | ends with `mediumSkillSuffix('pencil', 7)` and contains `masterful pencil portrait`                            |
| `buildPrompt('x', crayon)` (default level) | equals `buildLevel1Prompt('x')`                                                                                |
| Existing `buildPrompt('a dragon', oil)`    | still equals `` `a dragon, ${oil.promptModifierSuffix}` `` (oil L1 is now amateur; this assertion stays valid) |

---

## 6. Save schema (`save.ts`)

Keep `CURRENT_SAVE_VERSION = 1`. New fields **MUST** have Zod `.default(...)` so old
slots parse.

```ts
export const hiredArtistSchema = z.object({
	catalogId: z.string().min(1),
	xp: z.number().int().min(0).default(0),
	/** Spec 27. Missing keys = 0 XP. */
	mediumSkillXp: z.record(z.string(), z.number().int().min(0)).default({})
});

// on saveDataSchema:
playerMediumSkillXp: z.record(z.string(), z.number().int().min(0)).default({}),
lastMediumSkillTickAt: z.number().int().nonnegative().nullable().default(null),
```

`lastMediumSkillTickAt` is artist-skill catch-up (parallel to `lastIncomeTickAt`).
Null on old saves → initialise to `now()` on load (no retroactive XP dump), same
pattern as `withIncomeTickInitialised`.

**Tests:** legacy blob without these keys loads with `playerMediumSkillXp: {}`,
`hiredArtists[].mediumSkillXp: {}`, `lastMediumSkillTickAt` stamped to `now()`.
Round-trip a map `{ pencil: 60 }`.

---

## 7. `HiredArtistState` (`assignCommission.ts`)

```ts
export interface HiredArtistState {
	catalogId: string;
	xp: number;
	mediumSkillXp: MediumSkillXpMap;
}
```

`hireArtist` in GameStore **MUST** push `{ catalogId, xp: 0, mediumSkillXp: {} }`.

Update any test that constructs `{ catalogId, xp }` literals — add `mediumSkillXp: {}`.
Grep `hiredArtists` / `HiredArtistState` / `{ catalogId:` in tests and fix them all
in-zone.

---

## 8. GameStore wiring

### State

```ts
playerMediumSkillXp = $state<MediumSkillXpMap>({});
lastMediumSkillTickAt = $state<number>(0);
#playerPaintRemainderMs = 0; // session-only, not persisted
#artistSkillRemainderMs = 0; // session-only shared remainder for artist ticks
#artistGenerateToken = 0;
#pendingArtistArtwork: Artwork | null = null;
```

Hydrate `playerMediumSkillXp` / `lastMediumSkillTickAt` / each artist's `mediumSkillXp`
from save. Persist them in `#snapshotSave`. `reset()` / `#applySlotSave` clear
remainders, token, pending artwork, and (for reset) XP maps.

Derived:

```ts
activeMediumSkillProgress = $derived(
	mediumSkillProgress(
		this.activeMediumTierId,
		mediumSkillXpOf(this.playerMediumSkillXp, this.activeMediumTierId)
	)
);
```

### `createArt()`

Replace:

```ts
buildPrompt(playerPrompt, this.activeMediumTier);
```

with:

```ts
buildPrompt(
	playerPrompt,
	this.activeMediumTier,
	mediumSkillProgress(
		this.activeMediumTierId,
		mediumSkillXpOf(this.playerMediumSkillXp, this.activeMediumTierId)
	).level
);
```

**Test:** with `playerMediumSkillXp: { pencil: 810 }` and `activeMediumTierId: 'pencil'`,
the injected engine `generate` receives a `prompt` ending in
`mediumSkillSuffix('pencil', 7)`. Existing oil test still passes (rank 1 = current
`promptModifierSuffix` after §2 rewrite).

### Time ticks (piggyback `startIncomeTicker`)

On every income-ticker interval **and** on the catch-up path inside
`startIncomeTicker`, call `#tickMediumSkills()`.

```ts
#tickMediumSkills(): void {
	const now = this.#now();
	const prev = this.lastMediumSkillTickAt || now;
	const rawElapsed = now - prev;
	this.lastMediumSkillTickAt = now;

	// Player: only while generating, no offline catch-up (clamp to this interval, not MAX_*).
	if (this.phase === 'generating') {
		const elapsed = Math.max(0, rawElapsed);
		const applied = applyElapsedSkillMs({
			elapsedMs: elapsed,
			msPerXp: COMMISSION_PAINT_MS_PER_XP,
			remainderMs: this.#playerPaintRemainderMs
		});
		this.#playerPaintRemainderMs = applied.remainderMs;
		if (applied.xpGain > 0) {
			this.playerMediumSkillXp = grantMediumSkillXp(
				this.playerMediumSkillXp,
				this.activeMediumTierId,
				applied.xpGain
			);
		}
	}

	const artistElapsed = clampArtistSkillCatchupMs(rawElapsed);
	this.#tickArtistMediumSkills(artistElapsed);
	this.#persist();
}
```

`#tickArtistMediumSkills(elapsedMs)`:

- For each hired artist:
  - If `this.artistAssignment?.artistCatalogId === artist.catalogId`, grant work-rate XP
    into `this.artistAssignment.mediumTierId`.
  - Else grant idle-rate XP into `this.activeMediumTierId` (they practise with studio
    supplies).
- Use `applyElapsedSkillMs` with `#artistSkillRemainderMs` **per rate** — simplest
  legal approach that tests can pin: **do not share one remainder across rates**.
  Floor-only is acceptable: `xpGain = Math.floor(elapsedMs / msPerXp)` and drop the
  remainder for artists (document that choice in the handoff). Pin the floor-only
  behaviour in tests so it cannot drift.

**Tests (fake `now` + `tickIntervalMs: 10` or call a test seam):**

Prefer exposing `tickMediumSkillsForTest()` **only if** you cannot drive the existing
ticker. Prefer driving `startIncomeTicker` with injected `now` that advances. If that
is too brittle, a package-private method is allowed as `tickMediumSkillsForTests(elapsedMs: number)`
on GameStore — name it exactly that so it is obvious.

| Setup                                                    | Advance                                                                     | Expected                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| generating, pencil, elapsed 8000                         | +1 pencil XP                                                                | `playerMediumSkillXp.pencil === 1` |
| idle, elapsed 8000                                       | no player XP                                                                | `playerMediumSkillXp` unchanged    |
| hired Jade, no assignment, active pencil, elapsed 60_000 | Jade `mediumSkillXp.pencil === 1`                                           |                                    |
| hired Jade assigned on ink, elapsed 2000                 | Jade `mediumSkillXp.ink === 1`, pencil unchanged                            |                                    |
| elapsed 999_999 idle                                     | Jade pencil XP === `Math.floor(600_000 / 60_000)` = **10** (catch-up clamp) |                                    |
| `lastMediumSkillTickAt` null on hydrate then first tick  | 0 artist XP from the stamp                                                  |                                    |

Persist after ticks that grant XP. Ticking with 0 gain **MAY** still persist the
timestamp (like income does).

### `grantPracticeDrawingMs(deltaMs: number): void`

Public. Spec 28 is the only UI caller; Spec 27 still implements it so 28 has a stable
seam and unit tests can cover it now.

- No-op when `deltaMs <= 0`.
- Uses `PRACTICE_MS_PER_XP` and a session remainder `#practiceRemainderMs`.
- Grants into `activeMediumTierId`.
- Persists when `xpGain > 0`.

**Test:** two calls of 2000 ms with `PRACTICE_MS_PER_XP = 3000` → after first, 0 XP
remainder 2000; after second, +1 XP remainder 1000.

### Artist generate (slice B — required)

Today `#completeArtistAssignment` paints an SVG. Keep that as **fallback**.

On `assignBriefToArtist`:

1. Build `playerPrompt = \`[${catalog.name}] ${client.requestText}\``.
2. `skillLevel = mediumSkillProgress(mediumId, artist.mediumSkillXp[mediumId] ?? 0).level`.
3. `prompt = buildPrompt(playerPrompt, getMediumTier(mediumId), skillLevel)`.
4. `token = ++this.#artistGenerateToken`; `this.#pendingArtistArtwork = null`.
5. Fire `this.#engine.generate({ playerPrompt, prompt })` **without awaiting** in the
   assign method. On resolve, if `token === this.#artistGenerateToken` and the
   assignment is still this artist, store the artwork in `#pendingArtistArtwork`.
6. On reject, leave pending null (fallback SVG).

On `#completeArtistAssignment`:

- `artwork = this.#pendingArtistArtwork ?? mockArtistImageUrl(...)` as today.
- If using pending artwork, keep its `imageUrl` / size / `engineId`.
- Clear pending + bump token so a late generate cannot overwrite results.
- Mock scores: **keep** `mockArtistScores(artistLevel(xp))` for the critic path when
  the engine is mock / when you did not run a real critique. Do **not** invent a new
  score scale. (Janus critique of artist work is out of scope — stay on mock scores
  even if the image came from Janus. The picture changes; the tycoon payout stays
  deterministic.)

Skip / `declineClient` / `fireArtist` / slot switch / `reset`: bump
`#artistGenerateToken` and clear pending so in-flight generate cannot land.

**Tests:**

- Fake engine `generate` resolves to `{ imageUrl: 'data:image/png;base64,abc', … }`.
  Advance the assignment timer to completion → `currentArtwork.imageUrl` is that URL
  and `generate` was called with a prompt ending in the artist's pencil rank suffix.
- Fake engine `generate` rejects → SVG fallback still reaches `results`.
- `declineClient` after assign, then generate resolves → `currentArtwork` stays null.

Do **not** lock engine switching for the whole artist wait unless generate is in
flight on the same manager; if `setSwitchingLocked` is already true from a player
`createArt`, leave it. Artist assign is only legal in `briefing`, so player generate
is not running. **MAY** lock switching from assign until complete/fail/skip so the
engine cannot unload mid-job — if you lock, you **MUST** unlock on every exit path
(complete, skip, reset, slot switch). Tests already cover skip-from-generating;
add unlock assertion on artist skip if you lock.

---

## 9. UI surfaces (still Spec 27)

### `ProgressPanel.svelte`

Add a **Medium skills** section under Craft skills. New prop:

```ts
mediumSkills: MediumSkillProgress[]; // one per unlocked medium, ladder order
```

Parent (`+page` / `GameMenuBar` caller) passes progress for each id in
`unlockedMediumTierIds`, using `MEDIUM_TIERS` order.

Each row: medium name + rank label, `ProgressMeter` with
`value=xpIntoLevel`, `max=xpForNext` (same cap convention as craft skills).

Hint example: `Pencil & Sketchbook · Student · 12/120 XP`.

**Tests:** with one Competent pencil row, the accessible name/text includes `Pencil`
and `Competent`. Craft skills section still renders.

### `TeamRoster.svelte`

Extend `HiredArtistRow`:

```ts
interface HiredArtistRow {
	catalogId: string;
	xp: number;
	mediumSkillXp: Record<string, number>;
}
```

Under the existing training bar, list the studio mediums the artist has XP in
**or** all six ranks at Novice (prefer: show all Spec 13 mediums, compact one line
each, e.g. `✏️ Pencil · Novice`). Keep the card readable; use `<ul>` with accessible
text, not colour alone.

**Tests:** hired Jade with `{ pencil: 60 }` shows Doodler for pencil (level 2).

`GameStore.hireArtist` and hydrate must supply `mediumSkillXp` so the UI never sees
`undefined`.

---

## 10. Definition of done

- [x] Crayon rank 1 suffix is byte-identical to `LEVEL_1.promptModifiers`.
- [x] `buildPrompt(..., pencil, 7)` contains `masterful pencil portrait`.
- [x] Player generating for 8000 ms on pencil grants 1 pencil XP (injected clock).
- [x] Idle player grants 0 medium XP.
- [x] Hired artist idle 60s → 1 XP in the active medium; assigned 2s → 1 XP in the
      assignment medium; catch-up clamp 10 minutes.
- [x] Old saves parse; missing maps default `{}`.
- [x] Artist generate uses skill suffix; failure/skip cannot leak a late image.
- [x] Progress panel shows per-medium ranks; Team roster shows employee ranks.
- [x] Spec 20 craft skills and Spec 24 training XP / timers still pass their tests.
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for owned files
      (repo-wide commands still fail outside this zone — see agent-log).
- [x] Directory READMEs + TSDoc current.
- [x] Handoff appended to `docs/agent-log.md`.
- [x] No file outside the ownership zone.

## 11. Explicitly out of scope (Spec 28 / later)

- Practice station UI, desk E-to-practice, stroke XP from `SketchCanvas`.
  Implement `grantPracticeDrawingMs` only.
- Changing Spec 20 payout formula or skill ids.
- Per-medium visual reskin of the Phaser desk.
- Critiquing artist Janus images with the vision model (keep mock scores).
- New `GamePhase`. Practice will stay a flag on `idle` in Spec 28.

---

## Prompt for the implementing agent

> Implement the spec at `docs/tasks/27-medium-skill.md`.
>
> Read these four files completely before writing any code:
>
> 1. `best-practices.md`
> 2. `docs/architecture.md`
> 3. `src/lib/types/contracts.ts`
> 4. `docs/tasks/27-medium-skill.md`
>
> Also read `src/lib/game/skills.ts`, `src/lib/game/save.ts`, `src/lib/game/promptPipeline.ts`,
> `src/lib/stores/gameState.svelte.ts` (createArt, hireArtist, startIncomeTicker,
> #completeArtistAssignment, #hydrateFromSave, #snapshotSave), and
> `src/lib/data/mediumTiers.ts`.
>
> Own only the paths in the spec's ownership zone. Do not edit `package.json`,
> `src/lib/types/**`, `docs/architecture.md`, or Phaser files. Do not run `npm install`.
> Do not run state-changing git.
>
> Implement every file including tests. Then:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Append a handoff to `docs/agent-log.md` using `best-practices.md` §6.3.
