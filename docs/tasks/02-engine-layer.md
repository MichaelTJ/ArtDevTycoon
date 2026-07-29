# Spec 02 — Engine Layer, Capability Probe & Mock Engine

**Worktree:** `../adt-wt-backend` (branch `agent/backend`)
**Depends on:** Spec 01 merged to `main`, then `git -C "..\adt-wt-backend" merge main`.
You import scoring from `$lib/game`; if that import does not resolve, stop.

## Ownership zone

```
src/lib/engines/*.ts          top-level files only
src/lib/engines/mock/**
src/lib/engines/janus/janusEngine.ts        stub only — see §7
src/lib/engines/sdturbo/sdturboEngine.ts    stub only — see §7
```

Read-only: everything else. Do not run `npm install`. Do not run state-changing git
commands.

## Mission

Build the plumbing that lets the game talk to any AI backend without knowing which one
it is, and build the `mock` engine that ships as the always-available tier.

This is not a stub. WebGPU is not available to roughly a quarter of mobile players, and
nobody is forced to download a gigabyte, so **`mock` is what a real share of players
will actually play.** It has to be a complete, good-feeling experience: deterministic
procedural art and genuine scoring, not grey boxes and random numbers.

## Files to create

| File                                         | Contents                                |
| -------------------------------------------- | --------------------------------------- |
| `src/lib/engines/errors.ts`                  | `EngineError`                           |
| `src/lib/engines/random.ts`                  | `hashString`, `mulberry32`, `pick`      |
| `src/lib/engines/random.test.ts`             | Unit tests                              |
| `src/lib/engines/capability.ts`              | `detectCapability`, `meetsRequirements` |
| `src/lib/engines/capability.svelte.test.ts`  | Browser tests (needs real `navigator`)  |
| `src/lib/engines/critiqueProtocol.ts`        | Shared vision-critique helpers          |
| `src/lib/engines/critiqueProtocol.test.ts`   | Unit tests                              |
| `src/lib/engines/registry.ts`                | Engine descriptors and lazy factories   |
| `src/lib/engines/manager.ts`                 | `EngineManager`                         |
| `src/lib/engines/manager.test.ts`            | Unit tests                              |
| `src/lib/engines/mock/proceduralArt.ts`      | Deterministic SVG painter               |
| `src/lib/engines/mock/proceduralArt.test.ts` | Unit tests                              |
| `src/lib/engines/mock/reviewTemplates.ts`    | Critic copy                             |
| `src/lib/engines/mock/mockEngine.ts`         | `MockEngine implements ArtEngine`       |
| `src/lib/engines/mock/mockEngine.test.ts`    | Unit tests                              |
| `src/lib/engines/index.ts`                   | Public barrel                           |
| `src/lib/engines/README.md`                  | Per `best-practices.md` §4              |

---

## 1. `errors.ts`

```ts
import type { EngineErrorCode } from '$lib/types/contracts';

/** Every engine failure is one of these. The UI branches on `code`, shows `message`. */
export class EngineError extends Error {
	constructor(
		readonly code: EngineErrorCode,
		message: string,
		readonly cause?: unknown
	) {
		super(message);
		this.name = 'EngineError';
	}
}

/** Wrap an unknown thrown value. Never let a raw exception reach the UI. */
export function toEngineError(error: unknown, fallbackCode: EngineErrorCode): EngineError;
```

`toEngineError` returns the value unchanged if it is already an `EngineError`, maps a
`DOMException` named `AbortError` to code `'cancelled'`, and otherwise produces the
fallback code with a player-safe message.

## 2. `random.ts`

Determinism utilities. Identical input must always produce identical art, forever —
that is what makes the e2e tests stable.

```ts
/** FNV-1a 32-bit. Stable across runs and platforms; not for security. */
export function hashString(input: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h >>> 0;
}

/** Small seeded PRNG. Returns a function producing values in [0, 1). */
export function mulberry32(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t = (t + 0x6d2b79f5) >>> 0;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

export function pick<T>(items: readonly T[], random: () => number): T;
```

`pick` throws on an empty array and clamps its index so a `random()` of exactly `1`
cannot overflow.

**Tests:** `hashString` is stable and case-sensitive; two `mulberry32(42)` instances
produce identical first five values, all in `[0, 1)`; `pick([], rng)` throws;
`pick(['a','b','c'], () => 1)` returns `'c'`.

## 3. `capability.ts`

The gate that stops us crashing a phone. Read `docs/architecture.md` §5 before writing
this — the numbers matter.

```ts
export async function detectCapability(): Promise<DeviceCapability>;

/** Can this device run an engine with these requirements? */
export function meetsRequirements(
	capability: DeviceCapability,
	requirements: EngineRequirements
): { ok: true } | { ok: false; reason: string };
```

`detectCapability` algorithm:

1. If `!('gpu' in navigator)`, return a capability with `webgpu: false` and all limits
   `null`. Do not throw — most of the world lands here.
2. `const adapter = await navigator.gpu.requestAdapter()`. A `null` adapter also means
   `webgpu: false`; this happens on blocklisted drivers even when the API exists.
3. `fp16 = adapter.features.has('shader-f16')`.
4. Read `adapter.limits.maxStorageBufferBindingSize` and `adapter.limits.maxBufferSize`,
   converting bytes to MB.
5. `isMobile` from `navigator.userAgentData?.mobile` when present, else a
   `/Android|iPhone|iPad|iPod/i` test on the user agent.
6. `deviceMemoryGb` from `navigator.deviceMemory ?? null` — absent on Safari and Firefox,
   so it may inform but must never gate.
7. Never throw. Wrap the whole thing and degrade to `webgpu: false` on any error.

`meetsRequirements` rules, in order, returning the first failure:

- Requires WebGPU but `capability.webgpu` is false → `'This device does not support WebGPU.'`
- `desktopOnly` and `capability.isMobile` → `'This engine needs a desktop or laptop.'`
- `maxStorageBufferBindingMb` is known and below `minStorageBufferMb` →
  `'This device does not have enough GPU memory for this model.'`
- An unknown (`null`) limit while WebGPU is present is **treated as a pass**, since
  some browsers under-report; the load itself is the real gate.

**Tests** must be in `capability.svelte.test.ts` so they run in real Chromium.
`detectCapability()` resolves without throwing and returns an object with all seven
keys. Test `meetsRequirements` exhaustively with hand-built capability objects — it is
a pure function, so cover every branch including the `null`-limit pass.

## 4. `critiqueProtocol.ts`

Shared by the real engines in specs 05 and 06. Pure functions, no model access.

```ts
export function buildKeywordQuestion(keyword: string): string;
export function buildReviewPrompt(briefRequest: string): string;
export function parseYesNo(answer: string): boolean;
export function accuracyFromHits(hits: number, total: number): number;
export function buildTitle(playerPrompt: string, seed: number): string;
export function cleanReview(raw: string, fallback: string): string;
```

- `buildKeywordQuestion(kw)` → `` `Does this picture clearly show ${kw}? Answer only yes or no.` ``
- `buildReviewPrompt(req)` → an instruction to act as a witty critic reviewing an
  amateur painting against `req`, answering in one or two sentences.
- `parseYesNo`: lowercase and trim, then `true` only when the answer begins with the
  word `yes` or contains `yes` as a standalone word. `'yesterday'` must be `false` —
  a naive `startsWith('yes')` is the bug to avoid. Empty and rambling answers are
  `false`; under-scoring beats handing out money for an unparseable answer.
- `accuracyFromHits(hits, total)` → `clamp(Math.round(1 + (hits / total) * 9), 1, 10)`.
  This **must** match spec 01's accuracy ladder exactly, or switching engines would
  change the game's difficulty. `total === 0` returns `1`.
- `buildTitle` takes the first two meaningful tokens (use `normalize` and `STOPWORDS`
  from `$lib/game`), title-cases them, and prefixes a seeded phrase from
  `['Study of', 'Impression of', 'Portrait of', 'Meditation on', 'Sketch of', 'Ode to']`.
  No meaningful tokens → `'Untitled Study'`. Cap at 120 characters.
- `cleanReview` trims, collapses whitespace, strips any echo of the prompt instruction,
  truncates to 600 characters at a word boundary, and returns `fallback` when nothing
  usable remains.

**Tests:** the full `accuracyFromHits` ladder (0/4→1, 1/4→3, 2/4→6, 3/4→8, 4/4→10, and
0 total→1); `parseYesNo` for `'Yes'`, `'yes, clearly'`, `'No.'`, `'I cannot tell'`,
`''`, `'yesterday'`; `buildTitle` is deterministic per seed and never exceeds 120
characters; `cleanReview` returns the fallback for `'   '` and truncates a 900-character
input to at most 600.

## 5. `mock/proceduralArt.ts`

```ts
/** Deterministic 512x512 SVG. The same seed always yields byte-identical output. */
export function paintProceduralArt(seed: number): string;
```

It should read as naive crayon art — that _is_ the Level 1 aesthetic, so the mock looks
intentional rather than broken. Derive every number from successive `mulberry32(seed)`
calls:

- Background `<rect>` filled `hsl(H, 55%, 90%)`, `H = floor(rng() * 360)`.
- Five `<circle>` blobs, `cx`/`cy` in `[64, 448]`, `r` in `[40, 120]`, fill
  `hsl((H + i * 47) % 360, 65%, 65%)`, `fill-opacity="0.75"`, `stroke="hsl(0 0% 25%)"`,
  `stroke-width="3"`.
- Three crayon `<path>` strokes with two quadratic curves each, `fill="none"`,
  `stroke-width` in `[2, 6]`, `stroke-opacity="0.5"`.
- A grain overlay using an `<feTurbulence>` filter at `opacity="0.12"`.

Return the SVG source. The engine wraps it as
`` `data:image/svg+xml,${encodeURIComponent(svg)}` `` — use `encodeURIComponent`, not
base64, so there is no `Buffer` dependency and it works in every runtime.

**Tests:** same seed → identical string; different seeds → different strings; output
starts with `<svg` and contains `viewBox="0 0 512 512"`.

## 6. `mock/mockEngine.ts`

```ts
export class MockEngine implements ArtEngine {
	readonly id = 'mock';
	readonly displayName = 'Crayon Mode';
	readonly description = 'Instant procedural art. No download, works on any device.';
	readonly requirements = {
		webgpu: false,
		approxDownloadMb: 0,
		minStorageBufferMb: 0,
		desktopOnly: false
	};
	readonly capabilities = { generate: true, critique: true };
	// ...
}
```

- `probe()` always returns `{ available: true, requiresDownload: false, approxDownloadMb: 0 }`.
- `load()` resolves immediately.
- `generate({ prompt, seed })` → `seed ?? hashString(prompt)`, paint, and return an
  `Artwork` with `width: 512`, `height: 512`, `engineId: 'mock'`, a measured
  `generationMs`, and `id` of `` `mock-${seed.toString(36)}` ``. Add **no** artificial
  delay; the UI owns pacing and a sleep here would slow every test.
- `critique({ brief, playerPrompt })` uses `scorePrompt` from `$lib/game` for
  `accuracyScore`, `buildTitle` for the title, and the templates below for the review.
  Return a `CritiqueDraft` validated with `critiqueDraftSchema.parse(...)`.
- An already-aborted `signal` throws `EngineError('cancelled', ...)`.

### `mock/reviewTemplates.ts`

Band on `accuracyScore`, then `pick` with a seeded PRNG. Substitute `{client}`,
`{missed}` (first missed keyword, fallback `'the point'`) and `{matched}` (first matched
keyword, fallback `'the subject'`).

| Band      | Score | Templates (at least four each)                                                                                                                                                                                                                                                                          |
| --------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Poor      | 1–3   | `"{client} squints at this for a long moment. Whatever it is, it is not what they asked for."` · `"Technically a picture. The brief mentioned {missed}, and this does not."` · `"Bold of you to submit this. {client} is too polite to say more."` · `"A confident answer to a question nobody asked."` |
| Middling  | 4–6   | `"It gestures at {matched}, which is something. {client} expected a little more."` · `"Competent, in the way a shrug is competent."` · `"The idea is in there somewhere, buried under the crayon."` · `"{client} nods slowly. Not displeased. Not pleased."`                                            |
| Good      | 7–8   | `"A charming, if slightly unrefined, take on {matched}."` · `"{client} smiles. The amateur texture is almost part of the appeal."` · `"Genuinely pleasant work. The brief has been served."` · `"Rough around the edges, but the heart of it is right."`                                                |
| Excellent | 9–10  | `"{client} is delighted. Every note of the brief is here."` · `"Astonishing, given the budget and the crayons. A small triumph."` · `"This is exactly what {client} pictured, and slightly better."` · `"The garage studio has produced something genuinely good."`                                     |

**Tests:** identical input twice yields an identical `Artwork` and `CritiqueDraft`;
results parse against their schemas; `'a cozy coffee cup on a wooden table'` against
brief `c1` gives `accuracyScore` 10 and `'dragon'` gives 1; no `{placeholder}` survives
into any output; an aborted signal throws `EngineError` with code `'cancelled'`.

## 7. `registry.ts`

```ts
export interface EngineDescriptor {
	id: EngineId;
	displayName: string;
	description: string;
	requirements: EngineRequirements;
	/** Preference order; higher wins when several are available. */
	tier: number;
	create: () => Promise<ArtEngine>;
}

export const ENGINE_REGISTRY: readonly EngineDescriptor[];
```

| id               | tier | approxDownloadMb | minStorageBufferMb | webgpu | desktopOnly |
| ---------------- | ---- | ---------------- | ------------------ | ------ | ----------- |
| `mock`           | 0    | 0                | 0                  | false  | false       |
| `janus-webgpu`   | 1    | 1024             | 1024               | true   | false       |
| `sdturbo-webgpu` | 2    | 1536             | 1024               | true   | true        |

`create` uses a **dynamic import** so heavy engine code is only fetched when chosen:

```ts
create: async () => new (await import('./janus/janusEngine')).JanusEngine();
```

> **Stubs.** Also create `src/lib/engines/janus/janusEngine.ts` and
> `src/lib/engines/sdturbo/sdturboEngine.ts` as minimal classes implementing `ArtEngine`
> whose `probe` returns `{ available: false, reason: 'Not implemented yet.' }` and whose
> other methods throw `EngineError('internal', 'Not implemented yet.')`. This keeps the
> build green. Specs 05 and 06 replace these files wholesale; do not implement them.

Do not register `remote` — that tier is a later phase.

## 8. `manager.ts`

```ts
export interface EngineManagerDeps {
	capability?: DeviceCapability;
	registry?: readonly EngineDescriptor[];
}

export class EngineManager {
	constructor(deps?: EngineManagerDeps);

	/** Probe the device and every registered engine. Call once at startup. */
	init(): Promise<void>;

	get capability(): DeviceCapability | null;
	get activeId(): EngineId;
	get state(): EngineState;
	/** Every engine with its availability, for the picker UI. */
	get options(): Array<EngineDescriptor & { availability: EngineAvailability }>;
	/** Highest-tier available engine that needs no download — always at least `mock`. */
	get recommendedId(): EngineId;

	select(id: EngineId, onProgress?: (p: LoadProgress) => void): Promise<void>;
	generate(input: { prompt: string; seed?: number; signal?: AbortSignal }): Promise<Artwork>;
	critique(input: {
		brief: ClientBrief;
		playerPrompt: string;
		artwork: Artwork;
		signal?: AbortSignal;
	}): Promise<CritiqueDraft>;
}
```

Behaviour:

- `init()` runs `detectCapability()` once, then `probe`s every descriptor. It never
  loads a model and never throws.
- The active engine starts as `mock`, always. **Never auto-select a downloading
  engine** — a gigabyte on mobile data is not our decision to make.
- `select(id)` unloads the current engine first (GPU memory does not co-fit), then
  loads the new one, forwarding progress. On failure it falls back to `mock`, sets
  `state` to `'error'`, and rethrows an `EngineError` so the UI can explain.
- `generate` and `critique` delegate to the active engine. If the active engine throws
  anything other than `'cancelled'`, fall back to `mock` and **retry once**, so a mid-game
  GPU failure degrades to procedural art instead of dead-ending the commission.
- If the active engine reports `capabilities.critique === false`, route `critique` to
  the mock engine. Every engine currently claims both capabilities, so this is a safety
  net rather than a live path — but it is what stops a future generate-only engine from
  silently breaking scoring.
- Persist the selected id under `localStorage['adt.engine']`, and restore it on `init`
  **only if** the engine is available _and_ already cached. Never trigger a silent
  download on page load.

**Tests** with an injected fake registry and hand-built capability objects: `init()`
leaves `activeId` as `'mock'`; `recommendedId` prefers the highest available tier;
`select` on a failing engine falls back to `mock` and throws `EngineError`; `generate`
retries on `mock` after a non-cancel engine failure; a `'cancelled'` error is **not**
retried; `select` unloads the previous engine exactly once.

## 9. `index.ts`

Re-export `EngineManager`, `ENGINE_REGISTRY`, `detectCapability`, `meetsRequirements`,
`EngineError`, and the `critiqueProtocol` helpers.

---

## Definition of done

- [ ] Every file in the table exists, with TSDoc on every exported symbol.
- [ ] The mock engine is deterministic and needs no network, no GPU and no download.
- [ ] Nothing here imports Svelte or touches the DOM except `capability.ts`.
- [ ] Every thrown error is an `EngineError` with a player-safe message.
- [ ] Both engine stubs exist so the build stays green.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` all green.
- [ ] `src/lib/engines/README.md` written, covering the tier table and how to add an engine.
- [ ] Handoff entry appended to `docs/agent-log.md`.
