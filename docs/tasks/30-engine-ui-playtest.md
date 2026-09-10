# Spec 30 — Playtest 5 bundle (engine UI, Mum `!`, editor restore, XP, welcome)

**Status:** Draft (kickoff). Implement only after /new-agent Step 6 approval.
**Worktree:** `git worktree add -b agent/playtest-5 ../adt-wt-playtest-5 main`
**Depends on:** Specs 03, 04, 05, 20, 27, 28, 29. Does **not** edit engine workers or
`contracts.ts`.

Orchestrate slices **A → E** on this one worktree. Fix a red §3.3 gate before the next
slice. Do not bounce the user to `/new-agent` per slice.

## Assumptions

- Load-time “Crayon Mode” is `CapabilityNotice`. **Got it** fails because the banner
  sits in `GameMenuBar` under the Phaser/HUD stack. Promote it to a viewport modal.
- **Download model** = `handleEngineSelect('janus-webgpu')` (existing gate). Hide the
  button when Janus is not `available`. Copy is **Continue without model** /
  **Download model**.
- Engine overlay clip is the `+page` shell (`max-w-lg`, no scroll, **Close** outside
  the white card) plus fieldset `min-width: min-content`.
- Mum `!` is `#attentionMark` at `host.y - 22` (14px glyph). E-verb labels use
  `y - 18` (8px) and barks use `BARK_OFFSET_Y = 28`. Lower the `!` only; do not move
  bark or E-verb text.
- Studio editor drafts live in **localStorage**, not git. Main switched the key from
  `adt.studio-editor.v1` to `adt.studio-editor.v2` (letterbox migration), which made
  authored rooms **and** people looks disappear. v1 may still be in the player’s
  browser. Unmerged git `40e916e` (`origin/cursor/studio-room-layouts-0a0a`) is a
  different tileset era (classic `furniture.png` frames) — **MUST NOT** paste those
  frames onto the current home-indoor rooms.
- There is **no** shipped tutorial. A prior `/new-agent` for it stopped at git
  hygiene. This bundle includes that one-pager.
- “Experience tick up ~3× faster” means Spec 27/28 **medium-skill time XP** (the live
  bar while generating / practising / hired artists work), not Spec 20 craft XP on
  Collect Cash.

## Mission

Playtest 5: make the Crayon notice and engine menu usable, drop Mum’s `!` onto her
head, restore studio-editor v1 drafts (rooms + character looks), triple medium-skill
XP rate, and ship the welcome one-pager that never landed.

## Ownership zone

```
New:
  docs/tasks/30-engine-ui-playtest.md
  src/lib/components/WelcomeTutorial.svelte
  src/lib/components/WelcomeTutorial.svelte.test.ts
  src/lib/welcome/welcomePrefs.ts
  src/lib/welcome/welcomePrefs.test.ts
  src/lib/welcome/README.md

Edit:
  src/lib/components/CapabilityNotice.svelte
  src/lib/components/CapabilityNotice.svelte.test.ts
  src/lib/components/EnginePicker.svelte
  src/lib/components/EnginePicker.svelte.test.ts
  src/lib/components/GameMenuBar.svelte
  src/lib/components/GameMenuBar.svelte.test.ts
  src/lib/components/README.md
  src/lib/components/index.ts
  src/routes/+page.svelte
  src/lib/studio/scenes/StudioScene.ts
  src/lib/studio/npcAttention.ts          ← ATTENTION_MARK_OFFSET_Y constant only
  src/lib/studio/npcAttention.test.ts
  src/lib/studio/README.md
  src/lib/studio-editor/schema.ts         ← v1 key constant + comment
  src/lib/studio-editor/storage.ts
  src/lib/studio-editor/storage.test.ts
  src/lib/studio-editor/README.md
  src/lib/game/mediumSkill.ts
  src/lib/game/mediumSkill.test.ts
  src/lib/game/README.md
  docs/playtest-notes.md
  docs/tasks/README.md
  docs/agent-log.md
```

**MUST NOT** edit:

- `package.json`, lockfiles, vite/tsconfig/eslint/prettier/svelte/playwright, `.gitignore`
- `src/lib/types/**`, `best-practices.md`, `docs/architecture.md`, `src/routes/+layout.ts`
- `src/lib/engines/**`
- `src/lib/stores/engineStore.svelte.ts`
- `src/lib/game/skills.ts` (craft XP stays)
- `ModelDownloadGate.svelte`
- `src/lib/studio/rooms.ts` (authored Pokémon/letterbox rooms stay; drafts overlay via editor)
- Phaser camera / bark offset / E-verb `y - 18`

## Slice order

| Slice | What                                          |
| ----- | --------------------------------------------- |
| A     | Crayon modal + engine overlay overflow        |
| B     | Mum `!` offset                                |
| C     | Restore `adt.studio-editor.v1` drafts into v2 |
| D     | Medium-skill XP ×3                            |
| E     | Welcome tutorial one-pager                    |

---

## Slice A — Crayon notice + engine picker

### Locked product rules

1. `CapabilityNotice` is `role="dialog"` `aria-modal="true"` `fixed inset-0 z-50`
   matching `ModelDownloadGate`. Backdrop does **not** dismiss.
2. `supported === true` → render nothing.
3. Dismiss button text + accessible name: **Continue without model** → `ondismiss`.
   No **Got it**. No `Dismiss Crayon Mode notice`.
4. When `canDownload === true`, **Download model** (amber, first in DOM) calls
   `ondownload`. When false, that button is absent.
5. `+page` shows the notice when `engines.showCrayonNotice && !downloadGateOpen && !showWelcome`.
   `canDownload` = Janus option exists and `available`. `ondownload` =
   `() => handleEngineSelect('janus-webgpu')`.
6. Engine overlay inner panel: `max-h-[90vh] min-w-0 w-full max-w-xl overflow-y-auto
rounded-xl border border-stone-300 bg-white p-5 shadow-sm`. **Close** inside it.
   Backdrop `overflow-y-auto`. `EnginePicker` fieldset `min-w-0 w-full border-0 p-0
shadow-none bg-transparent`.
7. Remove `GameMenuBar` `notice` snippet.

### Tests (A)

| Case                  | Input / action                   | Expected                        |
| --------------------- | -------------------------------- | ------------------------------- |
| Hidden when supported | `supported: true`                | empty text                      |
| Continue              | click **Continue without model** | `ondismiss` ×1                  |
| Download hidden       | `canDownload` false              | no **Download model**           |
| Download fires        | `canDownload: true`              | `ondownload` ×1, `ondismiss` ×0 |
| No Got it             | `supported: false`               | no **Got it**                   |
| Dialog                | `supported: false`               | `role="dialog"`                 |
| Picker wrap           | Janus description string         | visible                         |
| Picker badge          | 1000 MB                          | `1.0 GB download`               |

---

## Slice B — Mum attention mark

### Locked product rules

1. Export `ATTENTION_MARK_OFFSET_Y = 12` from `npcAttention.ts` (same module as
   `showAttentionMark`). Phaser places the mark at `(host.x, host.y - ATTENTION_MARK_OFFSET_Y)`.
2. Keep `#attentionMark` origin `(0.5, 1)`, font 14px amber, depth 21.
3. **MUST NOT** change `BARK_OFFSET_Y` (28) or interact prompt `y - 18`.

12px puts the baseline of `!` closer to the sprite than the 8px E-verb (which sits at 18) so the taller glyph does not float a head above Mum.

### Tests (B)

| Case                        | Input / action                     | Expected              |
| --------------------------- | ---------------------------------- | --------------------- |
| Constant                    | import `ATTENTION_MARK_OFFSET_Y`   | `12`                  |
| showAttentionMark unchanged | `ready-commission` + `promptOnNpc` | still hides on prompt |

---

## Slice C — Restore studio-editor drafts

### Locked product rules

1. Keep writing `adt.studio-editor.v2`.
2. `STUDIO_EDITOR_V1_STORAGE_KEY = 'adt.studio-editor.v1'` in `schema.ts`.
3. `loadStudioEditorState()`:
   - Parse v2 if present and (`rooms` or `people` has ≥1 key) → return it.
   - Else parse v1 with the same `parseStudioEditorState`. If v1 has any rooms or
     people, **persist that state to v2** and return it.
   - Else empty state.
4. Do not delete v1 (leave it; v2 is canonical going forward).
5. Do not rewrite `rooms.ts`. Editor drafts still merge through `apply.ts`.

### Tests (C)

| Case            | Input / action                                                                                  | Expected                                          |
| --------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| v2 wins         | v2 has people.player, v1 has different frame                                                    | load returns v2 frame                             |
| v1 fallback     | v2 missing; v1 `{ version:1, rooms:{}, people:{ player:{ sheetId:'mum', frame:3, tint:null }}}` | `people.player.frame === 3`; v2 now has that blob |
| v2 empty object | v2 `{"version":1,"rooms":{},"people":{}}`, v1 has a room draft                                  | load returns v1 room; v2 rewritten                |
| malformed v1    | v2 missing, v1 `'nope'`                                                                         | empty state, no throw                             |

---

## Slice D — Medium skill XP ×3

### Locked product rules

Replace the four rates in `mediumSkill.ts` (ms per 1 XP — smaller is faster):

| Constant                     | Was    | Now    |
| ---------------------------- | ------ | ------ |
| `COMMISSION_PAINT_MS_PER_XP` | 8_000  | 2_666  |
| `PRACTICE_MS_PER_XP`         | 3_000  | 1_000  |
| `ARTIST_IDLE_MS_PER_XP`      | 60_000 | 20_000 |
| `ARTIST_WORK_MS_PER_XP`      | 2_000  | 666    |

Floor(old / 3) so an 8s generate that used to grant 1 XP now grants 3
(`floor(8000 / 2666) === 3`, remainder 2). Rank table (`mediumSkillXpToNext`)
**unchanged**. Spec 20 `previewSkillGains` **unchanged**.

### Tests (D)

| Case          | Input / action                                                                                  | Expected                        |
| ------------- | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| Constants     | import the four                                                                                 | `2666`, `1000`, `20000`, `666`  |
| 8s commission | `applyElapsedSkillMs({ elapsedMs: 8000, msPerXp: COMMISSION_PAINT_MS_PER_XP, remainderMs: 0 })` | `{ xpGain: 3, remainderMs: 2 }` |
| 3s practice   | `elapsedMs: 3000`, `PRACTICE_MS_PER_XP`                                                         | `{ xpGain: 3, remainderMs: 0 }` |
| Rank table    | `mediumSkillXpToNext(1)`                                                                        | still `60`                      |

---

## Slice E — Welcome tutorial

### Locked product rules

1. New presentational `WelcomeTutorial.svelte`: `role="dialog"` `aria-modal="true"`
   `fixed inset-0 z-50` (same chrome as `LevelCompleteOverlay`). Props: `oncontinue: () => void`.
2. Title: **Welcome to the studio**
3. Body, in this order, each a `<li>`:

   - **Practice makes perfect** — The AI-generated images get better the more you draw with a medium.
   - **Grow your reputation, grow your commissions** — Spend your money to get bigger and better spaces.
   - **A gold ! means someone is waiting** — Walk over and press E (or tap) to talk.
   - **AI-assisted drawing** — You explain the concept, AI creates it.
   - **WASD or arrows to walk** — E interacts. Practice at the desk when the studio is quiet.

4. Primary button **Let's go** (apostrophe as shown) calls `oncontinue`. Accessible name matches.
5. Prefs module `$lib/welcome/welcomePrefs.ts`:
   - Key `adt.welcome.v1`
   - `{ version: 1, dismissed: boolean }`
   - `loadWelcomeDismissed(): boolean` — true only when parsed `dismissed === true`
   - `persistWelcomeDismissed(): void` — writes `{ version: 1, dismissed: true }`
   - No `contracts.ts`. Not part of career saves.
6. `+page` shows `WelcomeTutorial` when `!loadWelcomeDismissed()` (session `$state`
   `showWelcome` starts from that). **Let's go** sets `showWelcome = false` and
   `persistWelcomeDismissed()`. Crayon notice waits until welcome is gone (slice A rule 5).
7. `GameMenuBar` adds a **How to play** button (after Audio or with Progress). It sets a
   callback `onopenwelcome` so the parent can show the tutorial again without clearing
   dismissed (re-open is allowed; dismissing again is a no-op persist).

### Tests (E)

| Case            | Input / action              | Expected                                                    |
| --------------- | --------------------------- | ----------------------------------------------------------- |
| Title           | mount                       | **Welcome to the studio** visible                           |
| Practice line   | mount                       | text contains `Practice makes perfect`                      |
| Reputation line | mount                       | text contains `Grow your reputation, grow your commissions` |
| Continue        | click **Let's go**          | `oncontinue` ×1                                             |
| Dialog          | mount                       | `role="dialog"`                                             |
| Prefs default   | empty storage               | `loadWelcomeDismissed() === false`                          |
| Prefs persist   | `persistWelcomeDismissed()` | `loadWelcomeDismissed() === true`                           |
| How to play     | GameMenuBar                 | button named **How to play** calls `onopenwelcome`          |

---

## Definition of done

- [x] All five slices, including welcome loading/dismiss
- [x] Tests per table; `.svelte.test.ts` for new/changed components
- [x] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for this zone
- [x] READMEs + TSDoc current
- [x] Handoff in `docs/agent-log.md`
- [x] `docs/tasks/README.md` index row
- [x] Playtest 5 P29–P33 rows in `docs/playtest-notes.md`
- [x] No writes outside the ownership zone
