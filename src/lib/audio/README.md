# Studio audio (`$lib/audio`)

Mute-first, mobile-safe presentation audio for Spec 21c. **HTMLAudioElement only** —
no Howler, no Phaser `this.sound`, no new npm deps.

## Public surface

```ts
import {
	studioAudio,
	createStudioAudio,
	attachAudioUnlock,
	isAudioEnabled,
	loadAudioPrefs,
	type AudioPrefs,
	type SfxId
} from '$lib/audio';
```

| Export              | Role                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `studioAudio`       | App singleton used by `+page` + `GameMenuBar`                        |
| `createStudioAudio` | Factory for isolated tests (inject `AudioCtor`, prefs)               |
| `attachAudioUnlock` | Window gesture listener → `unlock()` once                            |
| `isAudioEnabled`    | Derived master flag for a future `StudioSnapshot.audioEnabled` field |
| `playSfx(id)`       | Stable seam for follow-up catalog cues (C5–C7)                       |
| `adt.audio.v1`      | Zod-validated device prefs (not career save)                         |

`MuteSafePlayer` prefixes catalog `/studio/audio/…` URLs with `publicUrl` so GitHub Pages
`paths.base` resolves. Catalog strings stay site-root (`/studio/audio/…`).

## Unlock invariant

1. On init: `unlocked = false`. **No** `play()` for music or SFX.
2. First qualifying gesture (`pointerdown` / `keydown` / `touchstart`, or opening
   Audio settings / moving a slider / Mute) calls `unlock()`.
3. After unlock, music starts **only if** `effectiveMusicGain(prefs) > 0`.
4. Defaults: `musicVolume: 0`, `sfxVolume: 0.65`, `masterVolume: 1`, `muted: false`.
   Unlock alone is silent for music — correct.

## Cue map

| Trigger                        | Clip             |
| ------------------------------ | ---------------- |
| `unlockedVenueId`              | venue music bed  |
| phase `generating`             | `work-pencil`    |
| phase `critiquing`             | `work-critique`  |
| `lastCollectedGains` non-null  | cash stinger     |
| skill level-up on that collect | level-up stinger |

Decode / 404 / `NotAllowedError` → swallowed. Commissions never break.

## Not done here

- Footsteps / doors (C2), idle chime (C5), UI clicks (C6), Mum VO (C7)
- Radio boombox prop (21b B3) — call `setPrefs({ musicVolume })` later
- Bridge `audioEnabled` sync — export ready; orchestrator owns the freeze
