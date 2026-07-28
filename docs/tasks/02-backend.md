# Spec 02 — Backend & AI Providers

**Worktree:** `../adt-wt-backend` (branch `agent/backend`)
**Depends on:** Spec 01 must be merged to `main` first, then run
`git -C "..\adt-wt-backend" merge main`. You import scoring functions from
`$lib/game`; if that import does not resolve, stop — the merge has not happened.

## Ownership zone

```
src/lib/server/ai/**
src/routes/api/**
```

Read-only: everything else, including `src/lib/game/**`, `src/lib/types/contracts.ts`
and all config. Do not run `npm install`. Do not run state-changing git commands.

## Mission

Build the AI layer and the HTTP endpoints on top of it. There are two implementations
of each capability behind one interface: a **mock** that is deterministic, instant and
needs no models, and a **sidecar** that calls a local Python service running real
models. The mock is the default and must be genuinely good — it is what CI runs, what
the e2e tests exercise, and what anyone without a 7 GB model download will play. Treat
it as a first-class feature, not a stub.

The hard rule: **no code outside `src/lib/server/ai/**` may know which provider is
active.** The routes call the interface and nothing else.

## Files to create

| File                                       | Contents                                        |
| ------------------------------------------ | ----------------------------------------------- |
| `src/lib/server/ai/config.ts`              | Reads env, exposes typed settings               |
| `src/lib/server/ai/random.ts`              | `hashString`, `mulberry32` — seeded determinism |
| `src/lib/server/ai/random.test.ts`         | Unit tests                                      |
| `src/lib/server/ai/mockGenerator.ts`       | `MockImageGenerator`                            |
| `src/lib/server/ai/mockGenerator.test.ts`  | Unit tests                                      |
| `src/lib/server/ai/mockCritic.ts`          | `MockArtCritic`                                 |
| `src/lib/server/ai/mockCritic.test.ts`     | Unit tests                                      |
| `src/lib/server/ai/sidecarClient.ts`       | `SidecarImageGenerator`, `SidecarArtCritic`     |
| `src/lib/server/ai/sidecarClient.test.ts`  | Unit tests with an injected `fetch`             |
| `src/lib/server/ai/index.ts`               | `getImageGenerator()`, `getArtCritic()`         |
| `src/routes/api/generate/+server.ts`       | `POST` handler                                  |
| `src/routes/api/generate/generate.test.ts` | Route tests                                     |
| `src/routes/api/evaluate/+server.ts`       | `POST` handler                                  |
| `src/routes/api/evaluate/evaluate.test.ts` | Route tests                                     |
| `src/routes/api/health/+server.ts`         | `GET` handler                                   |
| `src/lib/server/ai/README.md`              | Per `best-practices.md` §4                      |

> **Do not** name a test file `+server.test.ts`. SvelteKit reserves the `+` prefix and
> will refuse to build. Use the plain names given above.

---

## 1. `src/lib/server/ai/config.ts`

```ts
import { env } from '$env/dynamic/private';

export type ProviderMode = 'mock' | 'sidecar' | 'auto';

export interface AiConfig {
	mode: ProviderMode;
	sidecarUrl: string;
	timeoutMs: number;
}

/** Read once per call so tests and `.env` edits are picked up without a restart. */
export function readAiConfig(): AiConfig;
```

- `mode` comes from `env.AI_PROVIDER`. Anything not exactly `sidecar` or `auto`
  (including undefined) resolves to `'mock'`.
- `sidecarUrl` comes from `env.SIDECAR_URL`, defaulting to `'http://127.0.0.1:8756'`.
  Strip any trailing `/`.
- `timeoutMs` comes from `Number(env.SIDECAR_TIMEOUT_MS)`, defaulting to `120000`. If
  the parse yields `NaN` or a value `<= 0`, use the default.

---

## 2. `src/lib/server/ai/random.ts`

Determinism utilities. The mock provider must return the identical artwork and
critique for identical input, forever — that is what makes the e2e tests stable.

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

/** Small, fast, seeded PRNG. Returns a function producing values in [0, 1). */
export function mulberry32(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t = (t + 0x6d2b79f5) >>> 0;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

/** Deterministically choose one element using the supplied PRNG. */
export function pick<T>(items: readonly T[], random: () => number): T;
```

`pick` must throw a clear `Error` on an empty array, and must clamp its index the same
way `pickBrief` does so a `random()` of exactly `1` cannot overflow.

**Tests:** `hashString('a dragon')` equals itself on repeat calls and differs from
`hashString('a Dragon')`; `mulberry32(42)` produces an identical first five values on
two separate instances; all values are `>= 0` and `< 1`; `pick([], rng)` throws.

---

## 3. `src/lib/server/ai/mockGenerator.ts`

Implements `ImageGenerator` from the contract with `name = 'mock'`.

Produce a **deterministic procedural SVG** — the same prompt always yields the same
picture. It should read as naive crayon art, which is exactly the Level 1 aesthetic, so
the mock looks intentional rather than broken.

```ts
export class MockImageGenerator implements ImageGenerator {
	readonly name = 'mock';
	async generate(input: { prompt: string; seed?: number; signal?: AbortSignal }): Promise<Artwork>;
	async isAvailable(): Promise<boolean>; // always true
}
```

Algorithm:

1. `const seed = input.seed ?? hashString(input.prompt)`; `const rng = mulberry32(seed)`.
2. Build a 512×512 SVG string:
   - Background `<rect>` filled `hsl(H, 55%, 90%)` where `H = Math.floor(rng() * 360)`.
   - Five blobs. For each, draw a `<circle>` with `cx`/`cy` in `[64, 448]`, `r` in
     `[40, 120]`, fill `hsl((H + i * 47) % 360, 65%, 65%)`, `fill-opacity="0.75"`,
     `stroke="hsl(0 0% 25%)"`, `stroke-width="3"`, `stroke-linecap="round"`. Derive
     every number from successive `rng()` calls.
   - Three crayon strokes: `<path>` elements with two quadratic curves, `fill="none"`,
     `stroke="hsl(0 0% 20%)"`, `stroke-width` in `[2, 6]`, `stroke-opacity="0.5"`.
   - A grain overlay `<rect>` across the whole canvas with `fill="url(#grain)"` where
     `grain` is an `<feTurbulence>` filter pattern, `opacity="0.12"`.
3. Return:

```ts
{
	id: `mock-${seed.toString(36)}`,
	imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
	playerPrompt: input.prompt,
	generationMs: <measured with performance.now()>,
	provider: 'mock'
}
```

Use `encodeURIComponent`, **not** base64 — it avoids `Buffer` and works in every
runtime. Do not add an artificial delay; the UI owns pacing, and a sleep here would
slow every test.

If `input.signal?.aborted` is already true when called, throw a `DOMException` named
`'AbortError'`.

**Tests:** two calls with the same prompt return byte-identical `imageUrl`; different
prompts differ; the result parses against `artworkSchema`; `imageUrl` starts with
`data:image/svg+xml,`; an already-aborted signal throws.

---

## 4. `src/lib/server/ai/mockCritic.ts`

Implements `ArtCritic` with `name = 'mock'`. This is where the domain layer earns its
keep: the mock critic is a real scoring engine, not random numbers.

```ts
export class MockArtCritic implements ArtCritic {
	readonly name = 'mock';
	async evaluate(input: {
		brief: ClientBrief;
		playerPrompt: string;
		imageUrl: string;
		signal?: AbortSignal;
	}): Promise<Critique>;
	async isAvailable(): Promise<boolean>; // always true
}
```

Algorithm:

1. `const { accuracyScore, creativityScore, matchedKeywords, missedKeywords } = scorePrompt(brief, playerPrompt)` — imported from `$lib/game`.
2. `const finalPayout = calculatePayout(brief, accuracyScore, creativityScore)`.
3. `const rng = mulberry32(hashString(brief.id + '|' + playerPrompt))`.
4. Build `title` and `criticReview` from the templates below.
5. Return the object **validated through `critiqueSchema.parse(...)`** so a template
   bug surfaces here rather than in the browser.

### Title

Take the first two meaningful tokens of the prompt (use `normalize` and `STOPWORDS`
from `$lib/game`), title-case them, and prefix a seeded adjective from:

```
['Study of', 'Impression of', 'Portrait of', 'Meditation on', 'Sketch of', 'Ode to']
```

Producing e.g. `"Study of Cozy Coffee"`. If the prompt has no meaningful tokens, use
`'Untitled Study'`. Cap the title at 120 characters to satisfy the schema.

### Review

Choose a band from `accuracyScore`, then `pick` one template with `rng`. Substitute
`{client}` with `brief.clientName`, `{missed}` with the first missed keyword, and
`{matched}` with the first matched keyword.

| Band      | accuracyScore | Templates (at least four each)                                                                                                                                                                                                                                                                          |
| --------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Poor      | 1–3           | `"{client} squints at this for a long moment. Whatever it is, it is not what they asked for."` · `"Technically a picture. The brief mentioned {missed}, and this does not."` · `"Bold of you to submit this. {client} is too polite to say more."` · `"A confident answer to a question nobody asked."` |
| Middling  | 4–6           | `"It gestures at {matched}, which is something. {client} expected a little more."` · `"Competent, in the way a shrug is competent."` · `"The idea is in there somewhere, buried under the crayon."` · `"{client} nods slowly. Not displeased. Not pleased."`                                            |
| Good      | 7–8           | `"A charming, if slightly unrefined, take on {matched}."` · `"{client} smiles. The amateur texture is almost part of the appeal."` · `"Genuinely pleasant work. The brief has been served."` · `"Rough around the edges, but the heart of it is right."`                                                |
| Excellent | 9–10          | `"{client} is delighted. Every note of the brief is here."` · `"Astonishing, given the budget and the crayons. A small triumph."` · `"This is exactly what {client} pictured, and slightly better."` · `"The garage studio has produced something genuinely good."`                                     |

If there are no missed keywords, `{missed}` falls back to `'the point'`; if none
matched, `{matched}` falls back to `'the subject'`. Truncate the final review to 600
characters.

**Tests:** the same input twice yields an identical `Critique`; the result parses
against `critiqueSchema`; `finalPayout` never exceeds `brief.budget`; a perfect prompt
for `c1` (`'a cozy coffee cup on a wooden table'`) gives `accuracyScore` 10 and
`finalPayout` 76; a junk prompt (`'dragon'`) gives `accuracyScore` 1 and `finalPayout`
10; no template placeholder (`{client}`, `{missed}`, `{matched}`) survives into the
output string.

---

## 5. `src/lib/server/ai/sidecarClient.ts`

Talks HTTP to the Python service. Inject `fetch` so the tests never touch the network.

```ts
export interface SidecarDeps {
	baseUrl: string;
	timeoutMs: number;
	/** Injected for testing; defaults to the global `fetch`. */
	fetchFn?: typeof fetch;
}

export class SidecarImageGenerator implements ImageGenerator {
	readonly name = 'sidecar'; /* ... */
}
export class SidecarArtCritic implements ArtCritic {
	readonly name = 'sidecar'; /* ... */
}
```

### The sidecar HTTP API

This contract is shared with Spec 05. Note that the sidecar uses `snake_case` (Python
convention) while our TypeScript uses `camelCase`; convert at this boundary.

**`GET /health`** → `200`

```json
{ "status": "ok", "device": "GPU", "models": { "image": "loaded", "critic": "unloaded" } }
```

**`POST /generate`** — body `{ "prompt": string, "seed": number | null }` → `200`

```json
{
	"image_base64": "<PNG bytes, base64, no data: prefix>",
	"width": 512,
	"height": 512,
	"duration_ms": 2431
}
```

**`POST /critique`** — body:

```json
{
	"brief_request": "I need a painting of a cozy coffee cup...",
	"brief_keywords": ["coffee", "cup", "cozy", "table"],
	"player_prompt": "a cozy coffee cup on a wooden table",
	"image_base64": "<PNG bytes, base64>"
}
```

→ `200`

```json
{ "title": "Study of Cozy Coffee", "accuracyScore": 7, "criticReview": "..." }
```

**The sidecar returns only `accuracyScore`.** That is the one judgement a vision model
can make that text analysis cannot — it has actually looked at the picture. You compute
the rest here:

```ts
const { creativityScore } = scorePrompt(brief, playerPrompt); // text-only, deterministic
const finalPayout = calculatePayout(brief, response.accuracyScore, creativityScore);
```

So all economy rules stay in the domain layer and the mock and sidecar providers cannot
drift apart on difficulty or payout. The sidecar never decides money.

### Behaviour

- Compose timeouts: `AbortSignal.any([AbortSignal.timeout(timeoutMs), input.signal].filter(Boolean))`.
- On a non-2xx response or a network throw, throw a `SidecarError` (export this class)
  carrying an `ApiErrorCode`: `'timeout'` when the abort came from the timeout,
  `'sidecar_unavailable'` on a connection failure, `'generation_failed'` or
  `'evaluation_failed'` on a bad status.
- Validate every response body with a Zod schema defined in this file before using it.
  A malformed body is `'generation_failed'` / `'evaluation_failed'`, never a crash.
- `SidecarImageGenerator.generate` returns `imageUrl` as
  `` `data:image/png;base64,${image_base64}` `` and `provider: 'sidecar'`.
- `SidecarArtCritic.evaluate` receives `imageUrl` as a data URL; strip everything up to
  and including the first comma to recover the raw base64 before sending.
- `isAvailable()` does a `GET /health` with a **2000 ms** timeout, independent of
  `timeoutMs`, and returns `false` on any failure rather than throwing.

**Tests** (all with an injected fake `fetch`): a successful generate returns a
`data:image/png;base64,` URL and parses against `artworkSchema`; a `500` throws
`SidecarError` with code `'generation_failed'`; a body missing `image_base64` throws
rather than returning junk; `isAvailable()` returns `false` when `fetch` rejects;
`evaluate` posts the raw base64 with no `data:` prefix; `evaluate` derives
`creativityScore` from the player's prompt and computes `finalPayout` against the real
brief budget; a `/critique` body containing an unexpected `finalPayout` field is
ignored rather than trusted.

---

## 6. `src/lib/server/ai/index.ts`

```ts
/**
 * Resolve the active providers. In `auto` mode the sidecar is probed once and the
 * result cached for 30 seconds, so a dead sidecar costs one failed request rather than
 * one per commission.
 */
export async function getImageGenerator(): Promise<ImageGenerator>;
export async function getArtCritic(): Promise<ArtCritic>;
/** For the health endpoint. */
export async function describeProviders(): Promise<{
	mode: ProviderMode;
	generator: 'mock' | 'sidecar';
	critic: 'mock' | 'sidecar';
	sidecarReachable: boolean;
}>;
/** Test seam: clears the availability cache. */
export function resetProviderCache(): void;
```

Resolution:

- `mode === 'mock'` → always the mock instances.
- `mode === 'sidecar'` → always the sidecar instances, even if unreachable, so
  misconfiguration produces a clear error instead of silently degrading.
- `mode === 'auto'` → probe `isAvailable()`; use sidecar if reachable, otherwise mock.
  Cache the boolean for 30 000 ms.

Instantiate each provider once at module scope; they are stateless.

**Tests:** with `AI_PROVIDER` unset the generator is `'mock'`; `resetProviderCache()`
clears the cached probe. Use `vi.mock('$env/dynamic/private', ...)` to control env.

---

## 7. API routes

All three return JSON. Every error response body must satisfy `apiErrorSchema` — never
let a raw exception reach the client.

### `src/routes/api/generate/+server.ts`

```ts
export const POST: RequestHandler = async ({ request }) => {
	/* ... */
};
```

1. Parse the JSON body; a malformed body is a `400` with code `'invalid_request'`.
2. Validate with `generateRequestSchema`. On failure return `400` `'invalid_request'`
   with the first Zod issue's message — those messages are already player-friendly
   (`'Describe the artwork before creating it.'`).
3. `const fullPrompt = buildLevel1Prompt(parsed.prompt)` — the hidden modifiers are
   applied **here**, on the server. The unmodified `prompt` must never reach the model
   and the modified one must never reach the client.
4. `const generator = await getImageGenerator()`, then `generator.generate({ prompt: fullPrompt, seed: parsed.seed })`.
5. Return `200` with `{ artwork }` matching `generateResponseSchema`. Overwrite
   `artwork.playerPrompt` with the **original** `parsed.prompt`, so the portfolio shows
   what the player wrote rather than the modified prompt.
6. On `SidecarError` use its code; on anything else `500` `'generation_failed'`. Log
   the real error server-side with `console.error`; return only a safe message.

### `src/routes/api/evaluate/+server.ts`

Same shape, using `evaluateRequestSchema`, `getArtCritic()` and
`evaluateResponseSchema`. Errors map to `'evaluation_failed'`.

### `src/routes/api/health/+server.ts`

`GET` returning `200` with `describeProviders()` plus `{ status: 'ok' }`. This endpoint
must never throw — it is what the UI uses to decide whether to warn the player that
real generation is unavailable.

### Route tests

Import the handler directly and call it with a hand-built `Request`:

```ts
const response = await POST({
	request: new Request('http://localhost/api/generate', {
		method: 'POST',
		body: JSON.stringify({ prompt: 'a cozy coffee cup' })
	})
} as never);
```

Cover: a valid body returns `200` and a schema-valid `artwork`; an empty prompt returns
`400` with code `'invalid_request'`; a non-JSON body returns `400`; the returned
`artwork.playerPrompt` equals the original prompt and does **not** contain
`'crayon texture'`; a provider that throws yields a `500` whose body parses against
`apiErrorSchema`.

---

## Definition of done

- [ ] Every file in the table exists, with TSDoc on every exported symbol.
- [ ] The mock path needs no network, no models and no env vars, and is deterministic.
- [ ] Every error path returns a body satisfying `apiErrorSchema`.
- [ ] `'crayon texture'` never appears in any response body.
- [ ] No `any`, no `@ts-ignore`.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` all green.
- [ ] `src/lib/server/ai/README.md` written, documenting how to switch providers.
- [ ] Handoff entry appended to `docs/agent-log.md`.
