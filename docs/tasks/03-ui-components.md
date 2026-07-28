# Spec 03 — UI Component Library

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

### Respect reduced motion

```svelte
import { prefersReducedMotion } from 'svelte/motion';
import { fade } from 'svelte/transition';

<div transition:fade={{ duration: prefersReducedMotion.current ? 0 : 250 }}>
```

Apply this to **every** transition and animation you write. No exceptions.

### Visual language

Warm paper and garage-workshop. Use these exact Tailwind 4 classes so twelve
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

- A `<label>` reading "Your prompt", bound to a `<textarea>` via `id`/`for`.
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

| Prop         | Type       | Default   |
| ------------ | ---------- | --------- |
| `messages`   | `string[]` | see below |
| `intervalMs` | `number`   | `2200`    |

A skeleton placeholder with a shimmer, a spinner, and flavour text that rotates through
`messages` on an interval. Default messages:

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
clears the interval (assert `vi.getTimerCount()` is `0` after unmount).

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

`src/lib/components/index.ts` re-exporting all twelve components, so spec 04 can write
a single import.

---

## Definition of done

- [ ] All twelve components exist, each with a passing `.svelte.test.ts`.
- [ ] All six avatar SVGs exist.
- [ ] No component imports from `$lib/stores`, `$lib/game`, `$lib/server` or `$app/*`.
- [ ] No component performs `fetch` or owns global state.
- [ ] Every transition and animation honours `prefersReducedMotion`.
- [ ] Every interactive element is a real control with an accessible name.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` all green.
- [ ] `src/lib/components/README.md` written, listing each component and its props.
- [ ] Handoff entry appended to `docs/agent-log.md`.
