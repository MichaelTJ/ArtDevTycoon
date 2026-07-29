# Spec 05 — Janus-Pro-1B WebGPU Engine

**Worktree:** `../adt-wt-sidecar` (branch `agent/sidecar`)
**Depends on:** Spec 02 merged to `main`, then `git -C "..\adt-wt-sidecar" merge main`.
You implement the `ArtEngine` interface and use helpers from `$lib/engines`.

## Ownership zone

```
src/lib/engines/janus/**
```

Spec 02 leaves a stub at `src/lib/engines/janus/janusEngine.ts`. **Replace it.** Touch
nothing else — not the registry, not the manager, not the contracts. Do not run
`npm install`. Do not run state-changing git commands.

## Mission

Make the real thing work: Janus-Pro-1B running entirely in the player's browser on
WebGPU, generating the artwork _and_ critiquing it.

Janus is a **unified multimodal model** — the same loaded weights do text-to-image and
image understanding, switched by the chat template. That is why it is the default tier:
one ~1 GB download buys both the painter and the critic. Pairing two separate models
would more than double the download, which on mobile is the difference between shipping
and not.

## Non-negotiables

- **All inference runs in a Web Worker.** On the main thread a 1B model freezes the UI
  for the entire generation, and mobile browsers kill the tab. This is not a
  performance nicety.
- **Never ask the model for JSON.** Ask narrow questions with trivially parseable
  answers and compute the score yourself. A 1B model will not reliably emit valid JSON
  and a parse failure mid-commission is a terrible experience.
- **Never decide money.** Return a `CritiqueDraft` — title, accuracy, prose. The domain
  layer handles creativity and payout.
- **Fail soft.** Any error becomes an `EngineError`; the manager then falls back to the
  mock engine and the player keeps playing.

## Files to create

| File                                                   | Contents                                               |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `src/lib/engines/janus/janusEngine.ts`                 | `JanusEngine implements ArtEngine` (replaces the stub) |
| `src/lib/engines/janus/workerClient.ts`                | Promise-based RPC over `postMessage`                   |
| `src/lib/engines/janus/workerClient.test.ts`           | Tests against a fake worker                            |
| `src/lib/engines/janus/janus.worker.ts`                | The worker: model loading and inference                |
| `src/lib/engines/janus/imageConversion.ts`             | `RawImage` ⇄ `ImageBitmap` ⇄ blob URL                  |
| `src/lib/engines/janus/imageConversion.svelte.test.ts` | Browser tests                                          |
| `src/lib/engines/janus/README.md`                      | Per `best-practices.md` §4                             |

---

## 1. `janus.worker.ts` — model loading

The exact configuration matters. These dtype and device assignments come from the
official `huggingface/transformers.js-examples/janus-pro-webgpu` reference; deviating
will either exhaust memory or fail to compile.

```ts
import { AutoProcessor, MultiModalityCausalLM, RawImage } from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/Janus-Pro-1B-ONNX';

const processor = await AutoProcessor.from_pretrained(MODEL_ID);

const model = await MultiModalityCausalLM.from_pretrained(MODEL_ID, {
	dtype: fp16Supported
		? {
				prepare_inputs_embeds: 'q4',
				language_model: 'q4f16',
				lm_head: 'fp16',
				gen_head: 'fp16',
				gen_img_embeds: 'fp16',
				image_decode: 'fp32'
			}
		: {
				prepare_inputs_embeds: 'fp32',
				language_model: 'q4',
				lm_head: 'fp32',
				gen_head: 'fp32',
				gen_img_embeds: 'fp32',
				image_decode: 'fp32'
			},
	device: {
		// Upstream bug: this submodel must stay on WASM for now.
		prepare_inputs_embeds: 'wasm',
		language_model: 'webgpu',
		lm_head: 'webgpu',
		gen_head: 'webgpu',
		gen_img_embeds: 'webgpu',
		image_decode: 'webgpu'
	},
	progress_callback: (report) => {
		/* forward as a `progress` message */
	}
});
```

Detect `fp16Supported` inside the worker:

```ts
const adapter = await navigator.gpu.requestAdapter();
const fp16Supported = adapter?.features.has('shader-f16') ?? false;
```

If `navigator.gpu` is missing or the adapter is null, reply with an `error` message of
code `'webgpu_unavailable'` and do not attempt to load.

Load exactly once and memoise. `load` must be safe to call twice.

### Progress reporting

`progress_callback` fires with `{ status, file, loaded, total }` per file. Map it onto
the `LoadProgress` contract type:

- `status: 'progress'` → `'downloading'`, with `fraction` as summed loaded over summed
  total across all files seen so far. Per-file fractions jumping backwards look broken;
  track a running total.
- After the last file, emit `status: 'compiling'` with `fraction: 1`. **Shader
  compilation takes 10–15 seconds on mobile with no callbacks at all**, so the UI needs
  to know it is in that phase rather than appearing frozen.
- Finish with `status: 'ready'`.

## 2. `janus.worker.ts` — image generation

```ts
const conversation = [{ role: '<|User|>', content: prompt }];
const inputs = await processor(conversation, { chat_template: 'text_to_image' });
const numImageTokens = processor.num_image_tokens;

const outputs = await model.generate_images({
	...inputs,
	min_new_tokens: numImageTokens,
	max_new_tokens: numImageTokens,
	do_sample: true,
	streamer: progressStreamer
});

const rawImage = outputs[0]; // RawImage, 384x384
```

`chat_template: 'text_to_image'` is what switches the model into generation mode.
Output is **384×384** — the right size for Level 1's amateur aesthetic.

### Token-level progress

Generation emits `num_image_tokens` (576) tokens autoregressively and takes roughly
10–60 seconds depending on the device. An indeterminate spinner for a minute is
unacceptable, so report real progress with a duck-typed streamer — it only needs `put`
and `end`, so there is no need to import a base class:

```ts
let tokenCount = -1; // the first `put` carries the prompt, not a generated token
const progressStreamer = {
	put: () => {
		tokenCount += 1;
		if (tokenCount > 0 && tokenCount % 8 === 0) {
			postProgress(tokenCount / numImageTokens);
		}
	},
	end: () => {}
};
```

Throttle to every 8th token; posting 576 messages costs more than it informs.

## 3. `janus.worker.ts` — critique

Same model, no reload, default chat template:

```ts
const conversation = [
	{ role: '<|User|>', content: `<image_placeholder>\n${question}`, images: [rawImage] }
];
const inputs = await processor(conversation);
const outputs = await model.generate({ ...inputs, max_new_tokens: maxTokens, do_sample: false });

const answer = processor
	.batch_decode(outputs.slice(null, [inputs.input_ids.dims.at(-1), null]), {
		skip_special_tokens: true
	})[0]
	.trim();
```

Slicing from `inputs.input_ids.dims.at(-1)` drops the prompt tokens so only the model's
answer is decoded. `do_sample: false` makes critiques reproducible.

Token budgets: **8** for yes/no questions, **64** for the prose review. Resize the input
image to 384×384 first — that is Janus's native SigLIP input size.

The worker receives already-built question strings from the main thread and returns raw
answers. It does no scoring: `buildKeywordQuestion`, `parseYesNo` and
`accuracyFromHits` live in `$lib/engines/critiqueProtocol` and are called by
`janusEngine.ts`, which keeps all judgement logic pure and unit-testable.

## 4. `imageConversion.ts`

`RawImage` carries `data`, `width`, `height` and `channels`. Getting it to the main
thread efficiently:

```ts
/** Worker side: RawImage -> ImageBitmap, ready to transfer. */
export async function rawImageToBitmap(image: {
	data: Uint8Array | Uint8ClampedArray;
	width: number;
	height: number;
	channels: number;
}): Promise<ImageBitmap>;

/** Main-thread side: ImageBitmap -> object URL for an <img src>. */
export function bitmapToObjectUrl(bitmap: ImageBitmap): Promise<string>;

/** Main-thread side: an <img>-ready URL back to a RawImage-shaped payload. */
export async function urlToBitmap(url: string): Promise<ImageBitmap>;
```

- `rawImageToBitmap` expands 3-channel RGB to RGBA (alpha `255`), builds an `ImageData`
  and calls `createImageBitmap`. Both exist in workers.
- Transfer the bitmap rather than copying: `postMessage(msg, [bitmap])`.
- `bitmapToObjectUrl` draws onto an `OffscreenCanvas`, calls `convertToBlob({ type: 'image/png' })`,
  and returns `URL.createObjectURL(blob)`.

**Object URLs leak if never revoked.** Track every URL this engine creates in a `Set`
and revoke them all in `unload()`. Do not revoke on each new generation — the portfolio
strip still displays earlier pieces.

**Tests** run in the browser project (`.svelte.test.ts`): a 2×2 RGB buffer converts to a
2×2 `ImageBitmap`; a 4-channel buffer round-trips unchanged; `bitmapToObjectUrl` returns
a string starting with `blob:`.

## 5. `workerClient.ts`

A promise-based wrapper so the engine never touches raw `postMessage`.

```ts
export class JanusWorkerClient {
	constructor(factory?: () => Worker);

	load(onProgress?: (p: LoadProgress) => void, signal?: AbortSignal): Promise<void>;
	/**
	 * Takes only the already-built `prompt` — `playerPrompt` never needs to leave
	 * `JanusEngine.generate()`, since the worker has no reason to see it and the
	 * engine attaches it to the returned `Artwork` itself.
	 */
	generate(
		prompt: string,
		onProgress?: (fraction: number) => void,
		signal?: AbortSignal
	): Promise<{ bitmap: ImageBitmap; generationMs: number }>;
	ask(
		bitmap: ImageBitmap,
		questions: string[],
		reviewPrompt: string,
		signal?: AbortSignal
	): Promise<{ answers: string[]; review: string }>;
	terminate(): void;
}
```

- Create the worker with the Vite idiom, which is what makes the bundle work in
  production:

```ts
new Worker(new URL('./janus.worker.ts', import.meta.url), { type: 'module' });
```

- Give every request a unique `id` and keep a `Map<string, {resolve, reject}>` of
  pending calls. Match replies by `id`; use the `WorkerRequest` / `WorkerResponse`
  unions from the contract.
- An `error` reply rejects with an `EngineError` carrying the returned code.
- On `signal.abort`, post a `cancel` message and reject with `EngineError('cancelled', …)`.
- **Serialise requests.** Never run two generations concurrently: it doubles peak VRAM
  and reliably crashes the tab on mobile. Queue, or reject a second concurrent call.
- `terminate()` kills the worker and rejects all pending promises.

**Tests** with an injected fake `Worker` (a small `EventTarget` with a `postMessage` that
echoes canned responses): a `load` resolves when `loaded` arrives; progress messages
invoke the callback in order; an `error` reply rejects with a matching
`EngineError.code`; a second concurrent `generate` does not interleave; `terminate`
rejects pending promises.

## 6. `janusEngine.ts`

```ts
export class JanusEngine implements ArtEngine {
	readonly id = 'janus-webgpu';
	readonly displayName = 'Janus Pro 1B';
	readonly description =
		'Real AI art, generated privately on your device. About 1 GB to download once.';
	readonly requirements = {
		webgpu: true,
		approxDownloadMb: 1024,
		minStorageBufferMb: 1024,
		desktopOnly: false
	};
	readonly capabilities = { generate: true, critique: true };
}
```

- `probe(capability)` delegates to `meetsRequirements` from `$lib/engines`. Report
  `requiresDownload: true` unless the model is already cached. Cache detection is
  best-effort: `Transformers.js` stores model shards in the browser's Cache API under a
  cache named after the model id (e.g. via `caches.open('transformers-cache')` — check
  the installed `@huggingface/transformers` version's source for the exact name rather
  than assuming, since this is not part of its public API and can change between
  versions). List that cache's keys and check whether **all** expected shard filenames
  for `onnx-community/Janus-Pro-1B-ONNX` are present, not just one — a partially cached
  model still needs to finish downloading. Wrap the whole check in `try/catch` and
  treat any failure (cache API unavailable, unexpected key format, version mismatch) as
  **not cached**, i.e. `requiresDownload: true`. A false "not cached" costs the player
  one unnecessary confirmation click; a false "cached" would leave them staring at a
  frozen load with no download progress to explain it, which is the worse failure.
- `load()` constructs the worker client and forwards progress.
- `generate({ playerPrompt, prompt, seed, signal })` calls `client.generate(prompt,
...)` — the worker never receives `playerPrompt` — converts the bitmap to an object
  URL, and returns an `Artwork` with `width: 384`, `height: 384`,
  `engineId: 'janus-webgpu'`, a measured `generationMs`, a unique `id`, and
  **`playerPrompt` set to the `playerPrompt` argument, verbatim, never to `prompt`**.
  Keep the `ImageBitmap` cached against the artwork id so `critique` can reuse it
  without decoding the URL again.
- `critique({ brief, playerPrompt, artwork })`:
  1. Build one question per keyword with `buildKeywordQuestion`, capped at **four** to
     bound latency.
  2. Build the prose request with `buildReviewPrompt(brief.requestText)`.
  3. Call `client.ask(...)`.
  4. `hits = answers.filter(parseYesNo).length`, then
     `accuracyScore = accuracyFromHits(hits, questions.length)`.
  5. `title = buildTitle(playerPrompt, hashString(artwork.id))`,
     `criticReview = cleanReview(review, <band-appropriate fallback>)`.
  6. Return `critiqueDraftSchema.parse(...)`.
- `unload()` terminates the worker and revokes every object URL created.

**Tests** with an injected fake worker client: `critique` maps four `'yes'` answers to
`accuracyScore` 10 and four `'no'` answers to 1; a rambling review falls back to the
canned line; `generate` returns a schema-valid `Artwork` with `engineId: 'janus-webgpu'`
**and `playerPrompt` equal to the input `playerPrompt`, not the input `prompt`**;
`unload` revokes every created URL. Do **not** write a test that loads the real model —
it would download a gigabyte in CI.

---

## Manual verification

Automated tests cannot load the model. Verify by hand once and record the result in
your handoff:

```powershell
npm run dev
```

Open the game in Chrome or Edge, pick **Janus Pro 1B** in the engine picker, accept the
download, and complete one commission. Confirm: the progress bar advances during
download, the UI stays responsive throughout (the worker is doing its job), a 384×384
image appears, the critique reads sensibly, and a second generation is much faster than
the first because the model is cached.

Note the wall-clock generation time you observe in your handoff entry — it drives how
much flavour text the generating panel needs.

## Definition of done

- [ ] Every file exists, with TSDoc on every exported symbol.
- [ ] All inference happens in the worker; nothing blocks the main thread.
- [ ] `num_image_tokens` is used for both `min_new_tokens` and `max_new_tokens`.
- [ ] Real download and token progress is reported, plus a distinct `compiling` phase.
- [ ] Every failure path produces an `EngineError` with a player-safe message.
- [ ] Object URLs are tracked and revoked in `unload()`.
- [ ] No test downloads a model.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` all green.
- [ ] `src/lib/engines/janus/README.md` written.
- [ ] Handoff entry appended to `docs/agent-log.md`, including observed timings.
