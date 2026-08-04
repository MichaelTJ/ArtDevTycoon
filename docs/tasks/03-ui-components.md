# Spec 03 — UI Component Library

**Status:** Shipped. Playtest copy/UX retunes: **My idea** (P24), Mum honesty reveal (P26),
**Skip** on overlay/desk (P25 — wired with Spec 04).
**Worktree:** `../adt-wt-ui` (branch `agent/ui`)
**Depends on:** nothing. Start immediately, in parallel with specs 01 and 05.

## Ownership zone

```
src/lib/components/**
static/avatars/**
```

Read-only: everything else. In particular you do **not** own `src/routes/+page.svelte`,
`src/routes/layout.css` or `src/lib/stores/**` — spec 04 assembles your components into
the screen. Do not run `npm install`. Do not run state-changing git commands.

## Mission

Build every visual piece of the game as a **pure presentational component**: props in,
callbacks out, no global state, no `fetch`, no imports from `$lib/stores` or
`$lib/game`. The only import you need is types from `$lib/types/contracts`.

This constraint is what lets you work in parallel with the domain and backend agents,
and it makes each component testable in isolation with literal props. If you find
yourself wanting to reach for shared state, pass a prop instead.

---

## Ground rules

### Svelte 5 runes only

Runes are forced on in `vite.config.ts`. `export let`, `$:` and `svelte/store` are
compile errors. Every component follows this shape:

```svelte
<script lang="ts">
	import type { Critique } from '$lib/types/contracts';

	interface Props {
		critique: Critique;
		compact?: boolean;
		oncollect?: () => void;
	}

	let { critique, compact = false, oncollect }: Props = $props();
</script>
```

Callbacks are plain function props named `onsomething`. Do not use `createEventDispatcher`.

### Accessibility is not optional

Real `<button>` elements, never clickable `<div>`s. Every image needs meaningful `alt`.
Every form control needs an associated `<label>`. Modal-like surfaces need
`role="dialog"` and `aria-modal="true"`. ESLint will fail the build on most violations.

### Mobile first, genuinely

This is a phone game that also runs on desktop, not the other way around. Design every
component at 360 px wide first and let it grow.

- Tap targets are at least 44×44 px. A 32 px icon button fails on a phone.
- No hover-only affordances — touch devices have no hover.
- Text stays at 16 px or larger in inputs; smaller triggers iOS auto-zoom on focus.
- Prefer flexible layouts over fixed pixel widths. The only fixed dimension in the whole
  library is the artwork thumbnail.

### Respect reduced motion

```svelte
import { prefersReducedMotion } from 'svelte/motion';
import { fade } from 'svelte/transition';

<div transition:fade={{ duration: prefersReducedMotion.current ? 0 : 250 }}>
```

Apply this to **every** transition and animation you write. No exceptions.

### Visual language

Warm paper and garage-workshop. Use these exact Tailwind 4 classes so fifteen
independently-written components still look like one game:

| Role                          | Classes                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Panel surface                 | `rounded-xl border border-stone-300 bg-white p-5 shadow-sm`                                                                     |
| Page text / muted             | `text-stone-800` / `text-stone-500`                                                                                             |
| Primary button                | `rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50` |
| Secondary button              | `rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300`                                               |
| Cash / positive               | `text-emerald-700`                                                                                                              |
| Error surface                 | `rounded-xl border border-red-300 bg-red-50 p-5 text-red-800`                                                                   |
| Focus ring (all interactives) | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600`                                        |

Score colour bands, used by `ScoreBadge` and reused anywhere a score appears:

| Score | Classes                           |
| ----- | --------------------------------- |
| 1–3   | `bg-red-100 text-red-800`         |
| 4–6   | `bg-amber-100 text-amber-800`     |
| 7–8   | `bg-lime-100 text-lime-800`       |
| 9–10  | `bg-emerald-100 text-emerald-800` |

### Testing idiom — verified, copy it exactly

Every component needs a sibling test named `ComponentName.svelte.test.ts`. The
`.svelte.test.ts` suffix routes it to the real-browser Vitest project; a plain
`.test.ts` runs in Node and cannot mount. Props are passed as the **second argument
directly**, not wrapped in a `props` key:

```ts
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ScoreBadge from './ScoreBadge.svelte';

test('renders the score and its label', async () => {
	const screen = render(ScoreBadge, { label: 'Accuracy', score: 7 });
	await expect.element(screen.getByText('Accuracy')).toBeVisible();
	await expect.element(screen.getByText('7')).toBeVisible();
});

test('invokes the callback on click', async () => {
	const onpress = vi.fn();
	const screen = render(SomeButton, { onpress });
	await screen.getByRole('button', { name: 'Collect Cash' }).click();
	expect(onpress).toHaveBeenCalledTimes(1);
});
```

Query by role and accessible name wherever possible. Never assert on CSS classes.

> The first browser test run takes **40–70 seconds** because Vitest launches Chromium
> and pre-bundles dependencies. This is normal — do not assume it has hung. Later runs
> are fast. Run only your project with `npm run test:unit -- --run --project=client`.

---

## Components to build

### 1. `Avatar.svelte`

| Prop   | Type                   | Default | Notes                                    |
| ------ | ---------------------- | ------- | ---------------------------------------- |
| `src`  | `string`               | —       | Path such as `/avatars/c1.svg`           |
| `name` | `string`               | —       | Used for `alt` and the initials fallback |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  | 32 / 48 / 72 px                          |

Renders a rounded `<img>` with `alt={name}`. If the image fails to load (`onerror`),
swap to a `<div>` showing up to two uppercase initials derived from `name`, on a
background colour chosen deterministically from the name's character codes — so a
missing asset still looks designed rather than broken.

**Tests:** renders an `img` whose accessible name is the client's name; the `sm`/`lg`
variants render; initials fallback shows `LC` for `'Local Cafe Owner'`.

### 2. `ScoreBadge.svelte`

| Prop    | Type     | Default |
| ------- | -------- | ------- |
| `label` | `string` | —       |
| `score` | `number` | —       |
| `max`   | `number` | `10`    |

A pill showing `label` and `score / max`, coloured by the band table above.

**Tests:** shows label and score; a score of 2 renders in the red band and 10 in the
emerald band (assert via visible text plus `getAttribute('class')` containing
`red-100` / `emerald-100` — this is the one permitted class assertion, because colour
band _is_ the component's behaviour).

### 3. `HudBar.svelte`

| Prop                   | Type     | Default |
| ---------------------- | -------- | ------- |
| `cash`                 | `number` | —       |
| `levelName`            | `string` | —       |
| `commissionsCompleted` | `number` | —       |
| `targetCommissions`    | `number` | —       |
| `targetCash`           | `number` | —       |

The top bar. Requirements:

- Cash **ticks up smoothly** using the `Tween` class:

```svelte
import { Tween } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';

const displayCash = Tween.of(() => cash, {
	duration: prefersReducedMotion.current ? 0 : 600,
	easing: cubicOut
});
```

Render `${Math.round(displayCash.current)}`. Use `Tween.of`, not the deprecated
`tweened` store.

- Level name as a heading.
- A progress bar for commissions: a real `<progress>` element with
  `value={commissionsCompleted}` `max={targetCommissions}` and an accessible label,
  plus visible text `"2 / 5 commissions"`.
- A second readout for cash progress toward `targetCash`.

**Tests:** renders the level name; renders `0 / 5 commissions` for
`commissionsCompleted: 0, targetCommissions: 5`; the `progress` element exposes the
right `value` and `max`; the cash figure eventually reads the passed value (await the
tween, or assert with `prefersReducedMotion` unavailable by simply awaiting
`expect.element(...).toHaveTextContent('$100')` which retries).

### 4. `ClientCard.svelte`

| Prop    | Type          |
| ------- | ------------- |
| `brief` | `ClientBrief` |

Avatar, client name, budget (`"Budget: $150"`), and the `requestText` in a speech
bubble. Give the bubble a CSS triangle tail via a pseudo-element in a `<style>` block.
Animate entry with `fly` from `svelte/transition`, reduced-motion aware.

Do **not** render `preferredKeywords` — those are the critic's private rubric, and
showing them would give the game away.

**Tests:** renders the client name and request text; renders the budget as `$150`; does
**not** render any of the `preferredKeywords`.

### 5. `PromptComposer.svelte`

| Prop        | Type                       | Default |
| ----------- | -------------------------- | ------- |
| `value`     | `string` (bindable)        | `''`    |
| `disabled`  | `boolean`                  | `false` |
| `maxLength` | `number`                   | `500`   |
| `onsubmit`  | `(prompt: string) => void` | —       |

```ts
let { value = $bindable(''), disabled = false, maxLength = 500, onsubmit }: Props = $props();
```

- A `<label>` reading **My idea** (playtest P24; historically “Your prompt”), bound to a
  `<textarea>` via `id`/`for`.
- A live character counter `"37 / 500"`, turning `text-red-700` past 90% of the limit.
- A primary submit button labelled **Create Art**, disabled when `disabled` is true or
  the trimmed value is empty.
- Submits on the button click and on Ctrl/Cmd+Enter in the textarea. Show the shortcut
  as hint text.
- `onsubmit` receives the **trimmed** value.

**Tests:** typing updates the counter; the button is disabled for empty and
whitespace-only input; clicking calls `onsubmit` exactly once with the trimmed string;
the button is disabled when `disabled` is true; Ctrl+Enter submits.

### 6. `GeneratingPanel.svelte`

| Prop         | Type             | Default      |
| ------------ | ---------------- | ------------ |
| `messages`   | `string[]`       | see below    |
| `intervalMs` | `number`         | `2200`       |
| `progress`   | `number \| null` | `null`       |
| `stageLabel` | `string`         | `'Painting'` |

A skeleton placeholder with a shimmer, a spinner, and flavour text that rotates through
`messages` on an interval.

Real on-device generation takes **10–60 seconds**, so this panel carries more weight
than it looks. When `progress` is a number in `0`–`1`, render a determinate `<progress>`
element with `aria-label={stageLabel}` and a visible percentage; when it is `null`, fall
back to the indeterminate spinner. Always show `stageLabel` — the store distinguishes
painting from critiquing, and naming the current stage is the difference between the
game feeling busy and feeling frozen.

Default messages:

```ts
[
	'Sharpening the crayons…',
	'Mixing colours in the garage…',
	'Squinting at the brief…',
	'Arguing with the muse…',
	'Blending, badly…'
];
```

The rotation uses `$effect` with `setInterval`, and **must** return a cleanup function
that clears it. Announce status with `role="status"` and `aria-live="polite"`. When
`prefersReducedMotion.current` is true, do not rotate — show only the first message.

**Tests:** renders the first message immediately; exposes `role="status"`; advancing
fake timers (`vi.useFakeTimers()`) past `intervalMs` shows the second message; unmount
clears the interval (assert `vi.getTimerCount()` is `0` after unmount);
`progress={0.5}` renders a determinate progress element showing `50%`;
`progress={null}` renders no progress element.

### 7. `ArtworkFrame.svelte`

| Prop       | Type                | Default  |
| ---------- | ------------------- | -------- |
| `imageUrl` | `string`            | —        |
| `title`    | `string`            | —        |
| `alt`      | `string`            | —        |
| `size`     | `'thumb' \| 'full'` | `'full'` |

A framed image — thick `border-8 border-stone-700` with a warm mat inside — plus a
caption showing `title`. `thumb` renders 96 px square with no caption; `full` renders
responsive up to 512 px. `object-contain`, never distorted.

**Tests:** the image has the given `alt` and `src`; the caption shows in `full` and is
absent in `thumb`.

### 8. `ResultsPanel.svelte`

| Prop         | Type         |
| ------------ | ------------ |
| `artwork`    | `Artwork`    |
| `critique`   | `Critique`   |
| `clientName` | `string`     |
| `oncollect`  | `() => void` |

The payoff moment. A dialog surface (`role="dialog"`, `aria-modal="true"`,
`aria-labelledby` pointing at the title) containing:

- `ArtworkFrame` with the artwork, `alt` set to `critique.title`
- The title as a heading
- Two `ScoreBadge`s: Accuracy and Creativity
- The `criticReview` as a blockquote attributed to `clientName`
- The payout, large and in `text-emerald-700`, as `"+$85"`
- A primary button **Collect Cash** calling `oncollect`
- **Mum path (P7 / P26):** when `mumRealCritique` is set, show toddler praise first; reveal
  control reads **You can be honest with me mum…** (not “Ask for a real critique”)

Entry transition: `scale` + `fade`, reduced-motion aware. Move focus to the Collect
Cash button on mount so keyboard users are not stranded.

**Tests:** renders title, review, both scores and `+$85` for a `finalPayout` of 85;
clicking **Collect Cash** calls `oncollect` once; the dialog exposes `role="dialog"`;
the artwork image's `alt` equals the critique title.

### 9. `PortfolioStrip.svelte`

| Prop           | Type             | Default                                  |
| -------------- | ---------------- | ---------------------------------------- |
| `entries`      | `GalleryEntry[]` | —                                        |
| `emptyMessage` | `string`         | `'Your finished pieces will hang here.'` |

A horizontally scrolling keyed list of `ArtworkFrame` thumbs, newest first, each with
its title, payout and score. Uses `animate:flip` so reordering is animated — which
**requires a keyed each**:

```svelte
{#each entries as entry (entry.id)}
	<li animate:flip={{ duration: prefersReducedMotion.current ? 0 : 300 }}>
```

Renders `emptyMessage` when the list is empty. Use `<ul>`/`<li>` for semantics.

**Tests:** the empty message shows for `[]` and is absent otherwise; three entries
render three list items; each item shows its title and payout; entries appear
newest-first when given ascending `completedAt` values.

### 10. `ErrorPanel.svelte`

| Prop        | Type                      | Default     |
| ----------- | ------------------------- | ----------- |
| `message`   | `string`                  | —           |
| `onretry`   | `() => void`              | —           |
| `ondismiss` | `() => void \| undefined` | `undefined` |

Error surface with `role="alert"`. Shows `message`, a primary **Try Again** button, and
a secondary **Dismiss** button rendered only when `ondismiss` is provided. Reassure the
player their prompt was kept — the copy should say so explicitly.

**Tests:** shows the message; `role="alert"` is present; **Try Again** calls `onretry`;
**Dismiss** is absent when `ondismiss` is omitted.

### 11. `IdlePanel.svelte`

| Prop       | Type         | Default |
| ---------- | ------------ | ------- |
| `oninvite` | `() => void` | —       |
| `disabled` | `boolean`    | `false` |

The between-commissions state: a short line of atmosphere ("The studio is quiet. Dust
floats in the window light.") and a primary button **Wait for a Client**.

**Tests:** the button calls `oninvite`; it is disabled when `disabled` is true.

### 12. `LevelCompleteOverlay.svelte`

| Prop                   | Type         |
| ---------------------- | ------------ |
| `cash`                 | `number`     |
| `commissionsCompleted` | `number`     |
| `oncontinue`           | `() => void` |

Full-screen celebratory overlay: `role="dialog"`, `aria-modal="true"`. Congratulates
the player, shows final cash and commission count, teases the commercial gallery as
"coming in Level 2", and offers a primary **Continue** button.

**Tests:** renders both figures; **Continue** calls `oncontinue`; exposes
`role="dialog"`.

### 13. `CapabilityNotice.svelte`

| Prop        | Type         | Default |
| ----------- | ------------ | ------- |
| `supported` | `boolean`    | —       |
| `reason`    | `string`     | —       |
| `ondismiss` | `() => void` | —       |

Shown once when the device cannot run real AI models — no WebGPU, an old iOS, or too
little GPU memory. Render nothing at all when `supported` is true.

The tone matters more than the markup here. A meaningful share of mobile players will
see this, and they are about to play a complete game, not a degraded one. Explain that
the studio is running in **Crayon Mode**, that everything works, and that the art is
drawn procedurally instead of by an AI model. Do not use warning colours, an error icon,
or the words "unsupported" or "failed" — this is information, not a problem. Show
`reason` as secondary text for the curious.

`role="status"`, a dismiss button with an accessible name, and a maximum width so the
paragraph stays readable.

**Tests:** renders nothing when `supported` is true; renders the reason when false;
dismiss calls `ondismiss`; the copy contains no error-toned wording.

### 14. `EnginePicker.svelte`

| Prop       | Type                   | Default |
| ---------- | ---------------------- | ------- |
| `options`  | `EngineOption[]`       | —       |
| `activeId` | `string`               | —       |
| `onselect` | `(id: string) => void` | —       |

```ts
type EngineOption = {
	id: string;
	displayName: string;
	description: string;
	available: boolean;
	unavailableReason?: string;
	requiresDownload: boolean;
	approxDownloadMb: number;
};
```

A radio group (`role="radiogroup"` with an accessible name) listing every engine. Each
row shows the name, the one-line description, and — when `requiresDownload` — a clear
size badge such as **"1.0 GB download"**.

The size badge is the most important element in this component. It is the player's only
warning before a gigabyte leaves their data plan, so it must be visible before
selection, not after.

Unavailable options render `disabled` with `aria-disabled="true"` and their
`unavailableReason` as visible secondary text. Selecting an option calls `onselect`;
this component never loads anything itself.

**Tests:** renders one radio per option; the active option is checked; clicking an
available option calls `onselect` with its id; a disabled option does not; the download
size is rendered for options that need one; the group has an accessible name.

### 15. `ModelDownloadGate.svelte`

| Prop           | Type                                      | Default         |
| -------------- | ----------------------------------------- | --------------- |
| `engineName`   | `string`                                  | —               |
| `approxMb`     | `number`                                  | —               |
| `state`        | `'prompt' \| 'loading' \| 'error'`        | `'prompt'`      |
| `progress`     | `number`                                  | `0`             |
| `stage`        | `'downloading' \| 'compiling' \| 'ready'` | `'downloading'` |
| `detail`       | `string \| null`                          | `null`          |
| `errorMessage` | `string \| null`                          | `null`          |
| `onconfirm`    | `() => void`                              | —               |
| `oncancel`     | `() => void`                              | —               |

The explicit consent step before any model download, and the progress display during it.

- `'prompt'`: state the size in plain language ("This will download about 1.0 GB once,
  then works offline"), warn about mobile data, and offer **Download and Play** plus
  **Use Crayon Mode instead**. Both are real buttons; there is no way to start a
  download by accident.
- `'loading'`: a determinate `<progress>` driven by `progress`, the `detail` line
  (current file), and a **Cancel** button. When `stage` is `'compiling'`, replace the
  bar's caption with "Preparing the model — this can take a few seconds" and explain
  that no progress will move. Silent 10–15 second stalls during shader compilation read
  as a crash otherwise.
- `'error'`: show `errorMessage`, a **Try Again** and a **Use Crayon Mode** button.

`role="dialog"`, `aria-modal="true"`, focus moved to the primary action on mount.

**Tests:** the prompt state renders the size in GB and calls `onconfirm` / `oncancel`
from the right buttons; the loading state renders a determinate progress element
reflecting `progress`; `stage="compiling"` renders the compiling caption; the error
state renders `errorMessage` and both recovery buttons; the dialog exposes
`role="dialog"`.

---

## Avatar assets

Create six hand-written SVGs at `static/avatars/c1.svg` … `c6.svg`, one per brief in
`src/lib/data/briefs.ts`. Keep each under 2 KB: a flat circular background, a simple
geometric face, and one prop hinting at the character (a coffee cup for `c1`, a quill
for `c2`, cat ears for `c3`, a sailor cap for `c4`, headphones for `c5`, a leaf for
`c6`). Use the warm palette. Include `<title>` in each SVG for accessibility.

Match these to the briefs:

| File     | Client             |
| -------- | ------------------ |
| `c1.svg` | Local Cafe Owner   |
| `c2.svg` | Fantasy Novelist   |
| `c3.svg` | Cat Enthusiast     |
| `c4.svg` | Retired Sailor     |
| `c5.svg` | Indie Band Manager |
| `c6.svg` | Botanical Gardener |

---

## Barrel file

`src/lib/components/index.ts` re-exporting all fifteen components, so spec 04 can write
a single import.

---

## Definition of done

- [ ] All fifteen components exist, each with a passing `.svelte.test.ts`.
- [ ] Every component is usable at 360 px wide with 44 px minimum tap targets.
- [ ] All six avatar SVGs exist.
- [ ] No component imports from `$lib/stores`, `$lib/game`, `$lib/server` or `$app/*`.
- [ ] No component performs `fetch` or owns global state.
- [ ] Every transition and animation honours `prefersReducedMotion`.
- [ ] Every interactive element is a real control with an accessible name.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` all green.
- [ ] `src/lib/components/README.md` written, listing each component and its props.
- [ ] Handoff entry appended to `docs/agent-log.md`.
