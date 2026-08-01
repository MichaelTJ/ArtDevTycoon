# Spec 21c — Studio audio (music beds, work SFX, settings)

**Worktree:**
`git worktree add -b agent/studio-audio ../adt-wt-studio-audio main`
(then junction `node_modules` per `best-practices.md` §2.2).
**Depends on:** Specs 17–20 merged (venues, phases, `lastCollectedGains`, GameMenuBar).
Does **not** depend on 05–11 or on 21a/21b/21d landing. Catalog radio prop (B3) is
out of scope here — leave a mute/music API others can call.
**Parent catalog:** `docs/tasks/21-living-studio.md` §C + shortlist C1, C3, C4, C8.
**Boss plan:** `docs/tasks/21-boss-plan.md` (Wave H / R3).

## Mission

The commission loop is silent. This slice adds **mute-first, mobile-safe audio**:

1. **C1** Soft looping music beds that change with the unlocked venue tier.
2. **C3** Work-loop SFX while `generating` / `critiquing`.
3. **C4** Short stingers on Collect Cash and when a craft skill levels up (detectable
   from existing store fields — no new economy).
4. **C8** An Audio settings panel (master + music + SFX) persisted under
   `localStorage` key `adt.audio.v1`, Zod-validated, **default music low or off**,
   **no autoplay until a user gesture**.

Presentation only. Decode/load failures **MUST** no-op — commissions never break.
Prefer `HTMLAudioElement` (Howler-free, no new npm deps). Keep Phaser almost
untouched: drive cues from Svelte (`+page` / `StudioHudOverlay` / phase watchers).

---

## Ownership zone

```
New:
  src/lib/audio/README.md
  src/lib/audio/schema.ts
  src/lib/audio/schema.test.ts
  src/lib/audio/catalog.ts
  src/lib/audio/catalog.test.ts
  src/lib/audio/levels.ts              ← volume math + level-up detect helpers
  src/lib/audio/levels.test.ts
  src/lib/audio/player.ts              ← HTMLAudioElement pool / mute-safe play
  src/lib/audio/player.test.ts         ← Node tests with stubbed Audio / document
  src/lib/audio/controller.svelte.ts   ← reactive prefs + cue API (Svelte 5 runes)
  src/lib/audio/index.ts
  src/lib/components/AudioSettingsPanel.svelte
  src/lib/components/AudioSettingsPanel.svelte.test.ts
  static/studio/audio/                 ← beds + SFX stubs (see §5)
  static/studio/audio/CREDITS.md       ← OR fold lines into static/studio/CREDITS.md
  docs/tasks/21c-studio-audio.md       ← this file (DoD ticks only after impl)

Edit:
  src/lib/components/GameMenuBar.svelte
  src/lib/components/GameMenuBar.svelte.test.ts
  src/lib/components/index.ts
  src/lib/components/README.md
  src/lib/components/StudioHudOverlay.svelte          ← optional: phase cue hook only
  src/lib/components/StudioHudOverlay.svelte.test.ts  ← only if overlay owns cues
  src/routes/+page.svelte                             ← gesture unlock + cue wiring
  static/studio/CREDITS.md                            ← audio credit lines
  docs/agent-log.md                                   ← handoff
```

**MUST NOT** edit:

- `package.json`, lockfiles, Vite/TS/ESLint/Prettier configs
- `src/lib/types/contracts.ts`
- `src/lib/studio/scenes/StudioScene.ts` (NPC rewrite / interact registry)
- `src/lib/studio/bridge.ts` (bridge freeze is orchestrator / 21a — see §8)
- Engine workers, shop unlock tables, scoring / skills formulas (read-only import OK)
- Spec 21a/21b ownership files

Touch Phaser only if absolutely unavoidable; the design goal is **zero Phaser audio**.

---

## Shared contract note (boss plan)

Boss plan freezes this additive snapshot field name for later floor props (radio B3):

```ts
audioEnabled: boolean; // master; 21c
```

**21c MUST NOT invent or edit `bridge.ts`.** Implement the real preference blob in
`src/lib/audio/**`. Export a derived getter:

```ts
/** True when master is not muted and masterVolume > 0. For future StudioSnapshot sync. */
export function isAudioEnabled(prefs: AudioPrefs): boolean;
```

When the orchestrator later adds `audioEnabled` to `StudioSnapshot`, `+page` can pass
`isAudioEnabled(audio.prefs)` in one line. Until then, audio works entirely from Svelte.

Also agreed (owned by other specs — do not implement here):

```ts
hiredRoleIds: readonly string[];
reducedVfx: boolean;
```

---

## 1. Persistence schema — `adt.audio.v1`

```ts
// src/lib/audio/schema.ts
import { z } from 'zod';

export const AUDIO_STORAGE_KEY = 'adt.audio.v1';

/** Clamp helper used by schema transforms and slider writes. */
export function clamp01(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.min(1, Math.max(0, n));
}

export const audioPrefsSchema = z.object({
	version: z.literal(1),
	/** Master fader 0–1. */
	masterVolume: z.number().transform(clamp01).pipe(z.number().min(0).max(1)),
	/** Music bus 0–1. Default OFF so first visits stay quiet. */
	musicVolume: z.number().transform(clamp01).pipe(z.number().min(0).max(1)),
	/** SFX bus 0–1. */
	sfxVolume: z.number().transform(clamp01).pipe(z.number().min(0).max(1)),
	/** Hard mute — ignores bus faders until cleared. */
	muted: z.boolean()
});

export type AudioPrefs = z.infer<typeof audioPrefsSchema>;

export function createDefaultAudioPrefs(): AudioPrefs {
	return {
		version: 1,
		masterVolume: 1,
		musicVolume: 0, // default music OFF
		sfxVolume: 0.65,
		muted: false
	};
}
```

Load / persist rules (mirror `save.ts` / `remoteConfig.ts` tone):

| Scenario                                       | Result                               |
| ---------------------------------------------- | ------------------------------------ |
| Missing key                                    | `createDefaultAudioPrefs()`          |
| Malformed JSON / schema fail / `getItem` throw | defaults                             |
| Valid blob with `musicVolume: 2`               | clamped to `1`                       |
| Valid blob with `sfxVolume: -0.2`              | clamped to `0`                       |
| `setItem` throw (private mode / quota)         | swallow — never throw into game loop |

```ts
export function loadAudioPrefs(): AudioPrefs;
export function persistAudioPrefs(prefs: AudioPrefs): void;
```

**Do not** fold audio into `adt.save.v1`. Audio is a device preference, not career
progress — clearing a save must not reset the player's mute choice, and vice versa.

### Effective gains

```ts
// src/lib/audio/levels.ts
export function effectiveMusicGain(prefs: AudioPrefs): number {
	if (prefs.muted) return 0;
	return clamp01(prefs.masterVolume * prefs.musicVolume);
}

export function effectiveSfxGain(prefs: AudioPrefs): number {
	if (prefs.muted) return 0;
	return clamp01(prefs.masterVolume * prefs.sfxVolume);
}

export function isAudioEnabled(prefs: AudioPrefs): boolean {
	return !prefs.muted && prefs.masterVolume > 0;
}
```

**Tests (`schema.test.ts` / `levels.test.ts`) — literal:**

| Call / input                                                             | Expected |
| ------------------------------------------------------------------------ | -------- |
| `createDefaultAudioPrefs().musicVolume`                                  | `0`      |
| `createDefaultAudioPrefs().sfxVolume`                                    | `0.65`   |
| `createDefaultAudioPrefs().muted`                                        | `false`  |
| `audioPrefsSchema.parse({ … musicVolume: 2 }).musicVolume`               | `1`      |
| `audioPrefsSchema.parse({ … sfxVolume: -1 }).sfxVolume`                  | `0`      |
| `effectiveMusicGain({ … muted: true, masterVolume: 1, musicVolume: 1 })` | `0`      |
| `effectiveSfxGain({ muted: false, masterVolume: 0.5, sfxVolume: 0.5 })`  | `0.25`   |
| `isAudioEnabled({ muted: false, masterVolume: 0, … })`                   | `false`  |
| `loadAudioPrefs()` with missing key                                      | defaults |
| `loadAudioPrefs()` with `'{not json'`                                    | defaults |

---

## 2. Asset catalog — C1 / C3 / C4

```ts
// src/lib/audio/catalog.ts

export type MusicBedId = 'kitchen-hum' | 'garage-bed' | 'storefront-bed' | 'museum-hush';

export type SfxId =
	| 'work-pencil' // loop while generating
	| 'work-critique' // loop while critiquing
	| 'stinger-cash' // one-shot Collect Cash
	| 'stinger-levelup'; // one-shot skill level-up

export interface AudioClip {
	id: string;
	/** Site-root URL under static/, e.g. `/studio/audio/beds/kitchen-hum.mp3` */
	url: string;
	loop: boolean;
	bus: 'music' | 'sfx';
}

export const MUSIC_BEDS: Record<MusicBedId, AudioClip> = {/* §5 paths */};
export const SFX: Record<SfxId, AudioClip> = {/* §5 paths */};

/** Venue id → bed. Unknown / missing → kitchen-hum. */
export function musicBedForVenue(venueId: string): MusicBedId {
	switch (venueId) {
		case 'fridge':
			return 'kitchen-hum';
		case 'garage':
			return 'garage-bed';
		case 'storefront':
			return 'storefront-bed';
		case 'gallery-hall':
		case 'mega-museum':
			return 'museum-hush';
		default:
			return 'kitchen-hum';
	}
}
```

| Venue id       | Bed id           | Feel                         |
| -------------- | ---------------- | ---------------------------- |
| `fridge`       | `kitchen-hum`    | Soft fridge / room tone      |
| `garage`       | `garage-bed`     | Low workshop hum             |
| `storefront`   | `storefront-bed` | Light street-muffled bed     |
| `gallery-hall` | `museum-hush`    | Quiet gallery air            |
| `mega-museum`  | `museum-hush`    | Same hush (richer later MAY) |

**Tests (`catalog.test.ts`):**

| Call                              | Expected        |
| --------------------------------- | --------------- |
| `musicBedForVenue('fridge')`      | `'kitchen-hum'` |
| `musicBedForVenue('mega-museum')` | `'museum-hush'` |
| `musicBedForVenue('nope')`        | `'kitchen-hum'` |

---

## 3. Mute-safe player + gesture unlock

### 3.1 Engine choice

Use **`HTMLAudioElement`** only (`new Audio(url)` or `<audio>` created in JS).

- **MUST NOT** add Howler, Tone.js, or any new dependency (`package.json` frozen).
- **MUST NOT** require `AudioContext` unlock gymnastics unless you already need it —
  HTMLAudioElement + a user-gesture `play().catch(() => {})` is enough for MVP loops.
- If you create an `AudioContext` anyway, resume it only inside `unlock()`.

### 3.2 Unlock gate

Browsers block autoplay with sound. Rules:

1. On module / controller init: `unlocked = false`. **Do not** call `play()` for music
   or SFX until unlock.
2. `unlock()` is idempotent. Call it from the **first** qualifying user gesture:
   - `pointerdown` / `keydown` / `touchstart` on `window` (capture, once), **or**
   - opening Audio settings / moving a slider / clicking Mute — any of these counts.
3. Wire the listener from `+page.svelte` (or a tiny `attachAudioUnlock()` helper
   exported from `$lib/audio`) in `onMount`, and remove it after success.
4. After unlock: apply current prefs and start the venue music bed **only if**
   `effectiveMusicGain(prefs) > 0`. With default `musicVolume: 0`, unlock alone
   produces silence — that is correct.
5. SSR / `prerender`: guard all `window` / `Audio` access; no-op on the server.

```ts
export interface StudioAudioController {
	readonly prefs: AudioPrefs;
	readonly unlocked: boolean;

	unlock(): void;
	setPrefs(patch: Partial<Omit<AudioPrefs, 'version'>>): void;
	setMuted(muted: boolean): void;

	/** Swap / start looping bed for venue. No-op if locked or gain 0. */
	syncMusicForVenue(venueId: string): void;
	stopMusic(): void;

	/** Start/stop phase loops. */
	onPhase(phase: GamePhase): void;

	/** One-shots. */
	playCashStinger(): void;
	playLevelUpStinger(): void;

	dispose(): void;
}
```

Implement as `createStudioAudio()` factory exported from `controller.svelte.ts`
(or a singleton `studioAudio` if that matches other `.svelte.ts` stores). Prefer a
**factory** so unit tests can construct isolated instances with injected `Audio`
constructors.

### 3.3 Failure policy (load-bearing)

Every `play()`, `load()`, decode, or network miss:

```ts
void audio.play().catch(() => {
	/* missing file / NotAllowedError / decode — silent */
});
```

- Missing URL / 404 → element errors → treat as silent clip; **never** rethrow.
- Prefer setting `audio.volume` from effective gain; when gain is `0`, either pause
  or keep element paused (do not spam play/pause every frame).
- Work loops: stop when leaving `generating` / `critiquing`. Switching
  `generating` → `critiquing` stops pencil and starts critique loop.
- Music: crossfade **MAY** be a no-op cut for MVP; do not block the main thread.

### 3.4 `prefers-reduced-motion`

Audio is **not** required to mute when `prefers-reduced-motion: reduce`. Provide
**master mute** (and the muted checkbox / toggle) instead. Do not couple motion
preferences to sound.

---

## 4. Cue wiring (Svelte, not Phaser)

Drive everything from reactive phase / store fields the UI already has.

### 4.1 Venue music — C1

Watch `game.unlockedVenueId` (this is the active ladder venue today; studio floor
already keys rooms off it):

```ts
$effect(() => {
	const venueId = game.unlockedVenueId;
	studioAudio.syncMusicForVenue(venueId);
});
```

Call again after `unlock()` so a bed can start once the player has gestured **and**
raised music volume.

### 4.2 Work loops — C3

```ts
$effect(() => {
	studioAudio.onPhase(game.phase);
});
```

| Phase        | SFX                  |
| ------------ | -------------------- |
| `generating` | loop `work-pencil`   |
| `critiquing` | loop `work-critique` |
| any other    | stop both work loops |

Volumes use `effectiveSfxGain`. If gain is 0, keep loops stopped.

### 4.3 Cash + XP stingers — C4

Detect from **existing** fields only (`lastCollectedGains` + `skillXp` +
`preview` math). Do **not** edit `collectCash` formulas.

```ts
// src/lib/audio/levels.ts
import { skillProgress, SKILL_IDS, type SkillId, type SkillXpMap } from '$lib/game/skills';
import type { SkillGainPreview } from '$lib/game/skills';

/** XP map before the collect, reconstructed from post-collect XP − gains. */
export function skillXpBeforeCollect(after: SkillXpMap, gains: SkillGainPreview): SkillXpMap {
	return {
		prompting: Math.max(0, after.prompting - gains.prompting),
		imagination: Math.max(0, after.imagination - gains.imagination),
		hustle: Math.max(0, after.hustle - gains.hustle)
	};
}

export function skillsThatLeveledUp(before: SkillXpMap, after: SkillXpMap): SkillId[] {
	return SKILL_IDS.filter(
		(id) => skillProgress(id, after[id]).level > skillProgress(id, before[id]).level
	);
}
```

In `+page` / overlay, when `game.lastCollectedGains` becomes non-null:

1. `playCashStinger()` once.
2. Reconstruct before-XP; if `skillsThatLeveledUp(...).length > 0`,
   `playLevelUpStinger()` once (single chime even if multiple skills level).

**Tests (`levels.test.ts`) — literal:**

| Scenario                                                          | Expected                                     |
| ----------------------------------------------------------------- | -------------------------------------------- |
| before prompting XP `14`, after `22` (gain 8)                     | `skillsThatLeveledUp` includes `'prompting'` |
| before `0`, after `8` (still level 1)                             | `[]`                                         |
| `skillXpBeforeCollect({ prompting: 22, … }, { prompting: 8, … })` | prompting `14`                               |

Wire with `$effect` that keys off `lastCollectedGains` identity / a generation
counter so clearing the toast does not replay the stinger.

### 4.4 Where to mount

Preferred single owner: **`src/routes/+page.svelte`**

- `onMount` → create / attach unlock listener + initial `syncMusicForVenue`
- `$effect`s for venue, phase, collect stingers
- `onDestroy` → `dispose()`

`StudioHudOverlay` **MAY** host the phase effect instead if that keeps `+page`
smaller — pick one place, not both.

`GameMenuBar` hosts the settings entry only (see §6).

---

## 5. Static assets + credits

### 5.1 Layout

```
static/studio/audio/
  beds/
    kitchen-hum.mp3      (or .ogg + .mp3 pair)
    garage-bed.mp3
    storefront-bed.mp3
    museum-hush.mp3
  sfx/
    work-pencil.mp3
    work-critique.mp3
    stinger-cash.mp3
    stinger-levelup.mp3
```

### 5.2 Placeholder policy

Shipping real CC0 loops is ideal. If assets are not authored yet, **MVP MAY** ship:

- Very short / near-silent CC0 stubs (a few hundred ms of soft noise or a quiet sine),
  **or**
- Documented placeholder URLs that resolve to tiny valid files in-repo

Empty 0-byte files are **not** OK (decode errors). Prefer tiny valid media so the
pipeline is real. Missing files at runtime still no-op (player catch).

**MUST NOT** ship copyrighted sample packs. CC0 / self-authored only.

### 5.3 Credits

Append to `static/studio/CREDITS.md` (and/or `static/studio/audio/CREDITS.md`
linked from the studio credits):

- Source name, license (CC0), URL, which filenames
- If self-authored: “Art Dev Tycoon originals (CC0)” section listing the clips

Same change as the assets — no orphan binaries.

---

## 6. Audio settings panel — C8

### 6.1 `AudioSettingsPanel.svelte`

Modal matching ToolkitShop / ProgressPanel patterns (dialog, close button, focusable
controls, real form controls — not clickable divs).

```ts
interface Props {
	prefs: AudioPrefs;
	onchange: (patch: Partial<Omit<AudioPrefs, 'version'>>) => void;
	onclose: () => void;
}
```

UI:

1. Title: **Audio**
2. Checkbox or toggle: **Mute all** → `muted`
3. Range inputs (or equivalent) with accessible names:
   - **Master** → `masterVolume`
   - **Music** → `musicVolume`
   - **Sound effects** → `sfxVolume`
4. Each slider: `min=0` `max=1` `step=0.05` (or `0.01`); show a short `%` readout
5. Close button

Moving any control calls `onchange` → controller `setPrefs` → `persistAudioPrefs`.
Opening the panel or clicking Mute **counts as a user gesture** — call `unlock()`
from the menu button handler before opening if not yet unlocked.

### 6.2 `GameMenuBar` entry

Add a button beside Progress (same button classes / `min-h-11`):

- Visible label: `Audio` (emoji optional; if used, keep accessible name `"Audio"`)
- Opens `AudioSettingsPanel`
- Component test: click Audio → dialog / heading “Audio” appears; toggle mute
  fires `onchange` with `{ muted: true }` (or whatever API you expose via props)

Do **not** clutter the first-load HUD with volume widgets — menu entry only.

### 6.3 Defaults reminder

First-run: music at `0`, SFX at `0.65`, master `1`, unmuted. Players who want beds
raise Music in the panel after any click has unlocked the audio pipeline.

---

## 7. Catalog extras (MAY / follow-up — not DoD)

Document seams; do **not** block MVP on these:

| #   | Feature              | Note                                                               |
| --- | -------------------- | ------------------------------------------------------------------ |
| C2  | Footstep / door cues | Would need visitor spawn signals from bridge — defer to post-21a/b |
| C5  | Idle earnings chime  | Hook when Apprentice tick applies in-session                       |
| C6  | UI click pack        | Shop buy / invite taps                                             |
| C7  | Mum bark VO          | Captions always; VO optional — needs 21e bark targets              |

Export stable `playSfx(id: SfxId)` (or extend the controller) so follow-ups do not
reopen the player internals.

---

## 8. Conflict / sequencing notes

- Wave H may run beside 21d. **21c keeps out of `StudioScene.ts`.**
- Do not race 21b’s radio (B3): expose `setPrefs` / music gain API; radio can later
  call `setPrefs({ musicVolume: … })` or toggle mute.
- If bridge freeze already added `audioEnabled` on main before you start, you **MAY**
  pass `isAudioEnabled(prefs)` through existing `+page` → `StudioFloor` sync in one
  additive line — still **MUST NOT** rewrite NPC / interact code.

---

## 9. Definition of done

- [ ] `audioPrefsSchema` + load/persist defaults/clamp tests green.
- [ ] `musicBedForVenue` + effective gain + level-up helpers tested with literals above.
- [ ] Controller: no audio until `unlock()`; after unlock, music stays silent at
      default `musicVolume: 0`.
- [ ] Phase `generating` / `critiquing` starts the correct work loop; other phases stop it.
- [ ] Collect Cash plays cash stinger; skill level-up (detectable) plays level-up stinger.
- [ ] Missing / broken clip URLs never throw into commission flow (unit-tested with
      rejecting `play()` stubs).
- [ ] `AudioSettingsPanel` + GameMenuBar Audio entry with component tests.
- [ ] Prefs persist under `adt.audio.v1` and reload after remount.
- [ ] Assets under `static/studio/audio/**` + CREDITS lines.
- [ ] `src/lib/audio/README.md` documents public surface + unlock invariant.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for owned files.
- [ ] Handoff appended to `docs/agent-log.md` (template in `best-practices.md` §6.3).
- [ ] No edits outside the ownership zone; no `package.json` / `contracts.ts` /
      `StudioScene` rewrites.

---

## 10. Explicitly out of scope

- Howler / Web Audio graph frameworks / new npm dependencies.
- Phaser `this.sound` usage or BootScene audio loading.
- Editing `contracts.ts`, scoring, skills XP formulas, or `adt.save.v1`.
- Autoplay music on first paint.
- Coupling mute to `prefers-reduced-motion`.
- C2 / C5 / C6 / C7 implementation (seams only).
- Full VO, licensed music, spatial audio, per-NPC mix buses.
- Radio boombox prop visuals (21b B3).

---

## 11. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/21c-studio-audio.md`.
>
> Worktree (orchestrator should already have created it; if you are starting fresh and
> the path exists, work there):
> `C:\Users\JensenM\Documents\My Apps\adt-wt-studio-audio`
> Branch: `agent/studio-audio`
>
> Read these completely before writing any code:
>
> 1. `best-practices.md` — binding rules (a11y, no-backend, mobile, ownership, testing)
> 2. `docs/architecture.md` — layer map + studio floor notes
> 3. `src/lib/types/contracts.ts` — frozen types (**do not edit**)
> 4. `docs/tasks/21c-studio-audio.md` — your spec
> 5. `docs/tasks/21-living-studio.md` §C (context)
> 6. `docs/agent-log.md` — latest handoffs
> 7. `src/lib/components/GameMenuBar.svelte` — settings/menu pattern to extend
>
> Also skim `src/lib/game/save.ts` (Zod localStorage tone) and
> `src/lib/stores/gameState.svelte.ts` (`phase`, `unlockedVenueId`,
> `lastCollectedGains`, `skillXp`).
>
> Confirm there is little/no existing audio system before inventing parallel stacks.
>
> Ownership is listed in the spec. Create `src/lib/audio/**`,
> `AudioSettingsPanel`, and `static/studio/audio/**`. Wire cues from Svelte
> (`+page` / overlay) and add an Audio entry on `GameMenuBar`. Prefer
> `HTMLAudioElement`. **Do not** edit `package.json`, `contracts.ts`, or rewrite
> `StudioScene` / interact registry / `bridge.ts`.
>
> Defaults: music volume `0`, SFX `0.65`, master `1`, muted `false`. Persist
> `adt.audio.v1`. No autoplay until user gesture unlock. Mute-safe on missing files.
>
> Implement every file including tests. Then run and fix only your files:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Append your handoff to `docs/agent-log.md` using `best-practices.md` §6.3.
> Do not run state-changing git (`commit`, `add`, `checkout`, `merge`, `push`,
> `worktree`). Do not run `npm install`.
