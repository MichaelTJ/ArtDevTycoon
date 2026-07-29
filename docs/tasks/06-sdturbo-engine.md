# Spec 06 — SD-Turbo Desktop Engine (optional HD tier)

**Worktree:** create one when you start — `git worktree add -b agent/sdturbo ../adt-wt-sdturbo main`
**Depends on:** Specs 02 **and** 05 merged. You compose the Janus engine for critique.
**Priority: lowest.** The game is complete and shippable without this. Build it last.

## Ownership zone

```
src/lib/engines/sdturbo/**
```

Spec 02 leaves a stub at `src/lib/engines/sdturbo/sdturboEngine.ts`. Replace it. You may
_import_ from `src/lib/engines/janus/**` but must not edit it.

## Mission

A higher-quality tier for players on a real desktop GPU: **SD-Turbo** painting at
512×512 instead of Janus's 384×384, with Janus still doing the critique.

Be clear-eyed about the trade. This costs roughly 1.5 GB _on top of_ Janus's gigabyte
and keeps two models resident. That is why it is gated `desktopOnly: true` and never
recommended automatically. If you find yourself relaxing that gate, stop — crashing a
phone's browser tab is a much worse outcome than a slightly smaller picture.

## Why a different stack

SD-Turbo is a diffusion pipeline, not a transformer Transformers.js can drive. It runs
on **ONNX Runtime Web** (`onnxruntime-web`, already installed) with the WebGPU execution
provider, as three separate ONNX graphs: a CLIP text encoder, a UNet, and a VAE decoder.
The reference implementation is Microsoft's
`onnxruntime-inference-examples/js/sd-turbo` and `guschmue/ort-webgpu`.

**Verify the model repository before building.** The ORT example hosts weights on
Hugging Face (`schmuell/sd-turbo-ort-web` at the time of writing). Confirm the repo and
the exact file names still resolve, and record what you used in your handoff — this is
the single most likely thing in this spec to have drifted.

## Files to create

| File                                           | Contents                                                 |
| ---------------------------------------------- | -------------------------------------------------------- |
| `src/lib/engines/sdturbo/sdturboEngine.ts`     | `SdTurboEngine implements ArtEngine` (replaces the stub) |
| `src/lib/engines/sdturbo/sdturbo.worker.ts`    | ORT Web session setup and the diffusion loop             |
| `src/lib/engines/sdturbo/workerClient.ts`      | Promise-based RPC, mirroring the Janus client            |
| `src/lib/engines/sdturbo/workerClient.test.ts` | Tests against a fake worker                              |
| `src/lib/engines/sdturbo/README.md`            | Per `best-practices.md` §4                               |

---

## 1. The worker

```ts
import * as ort from 'onnxruntime-web/webgpu';

const session = await ort.InferenceSession.create(modelUrl, {
	executionProviders: ['webgpu'],
	graphOptimizationLevel: 'all'
});
```

Pipeline for one image:

1. Tokenise the prompt with `CLIPTokenizer` from `@huggingface/transformers` — reuse it
   rather than hand-rolling a tokeniser.
2. Run the text encoder to get embeddings.
3. Seed the latents. SD-Turbo is **single-step**: run the UNet exactly **once** with
   **no classifier-free guidance**. It is distilled for this; ordinary guidance produces
   noise. This is the same trap as the Janus token counts — the easiest thing to get
   wrong and the hardest to debug from the output.
4. Decode the latents through the VAE to a 512×512 RGB buffer.
5. Convert to an `ImageBitmap` and transfer it to the main thread. Reuse
   `rawImageToBitmap` from `$lib/engines/janus/imageConversion` rather than
   reimplementing it.

Load the three sessions lazily and memoise them. Report progress across all three
downloads as one running total, then a `compiling` phase — shader compilation for the
UNet is slow and silent.

Support the `seed` input by seeding the initial latents deterministically. Note in the
README that determinism is best-effort: driver differences change results slightly, so
tests must not assert on pixels.

## 2. `sdturboEngine.ts`

```ts
export class SdTurboEngine implements ArtEngine {
	readonly id = 'sdturbo-webgpu';
	readonly displayName = 'SD-Turbo HD';
	readonly description = 'Sharper 512px art for desktop GPUs. About 1.5 GB extra to download.';
	readonly requirements = {
		webgpu: true,
		approxDownloadMb: 1536,
		minStorageBufferMb: 1536,
		desktopOnly: true
	};
	readonly capabilities = { generate: true, critique: true };
}
```

`minStorageBufferMb` is raised from SD-Turbo's own 1024 to 1536 as a safety margin, but
the real fix for the combined footprint is architectural, not a bigger number: **SD-Turbo's
three ORT sessions and Janus must not knowingly be resident at once.** Two 1 GB+ WebGPU
models stacked on top of each other is exactly the crash this project keeps gating
against elsewhere, and no `minStorageBufferMb` value is a substitute for actually
freeing memory.

- `generate` uses the SD-Turbo worker and returns an `Artwork` with `width: 512`,
  `height: 512`, `engineId: 'sdturbo-webgpu'`, and `playerPrompt` set to the input
  `playerPrompt` argument verbatim (never the built `prompt`) — same rule as every
  other engine.
- `critique` **delegates to an internally-composed `JanusEngine`**, loading it lazily on
  the first critique rather than up front. Before that load, **dispose the SD-Turbo
  worker's three ORT sessions** (text encoder, UNet, VAE) — none of them are needed
  again until the next `generate()` call, and holding them resident while Janus loads is
  the one thing this file must not do. Re-create the SD-Turbo sessions lazily the next
  time `generate()` is called; accept the one-time recompilation cost as the price of
  not crashing the tab. Return the delegate's `CritiqueDraft` unchanged apart from the
  `engineId` on the artwork, which stays `'sdturbo-webgpu'`.
- `probe` fails fast on mobile via `meetsRequirements`, which already enforces
  `desktopOnly`.
- `unload` terminates the SD-Turbo worker **and** unloads the composed Janus engine.
  Leaking a second resident model is the failure mode to watch for here.

## 3. Tests

Same discipline as spec 05: an injected fake worker client, and **no test may download a
model**.

Cover: `probe` returns unavailable when `capability.isMobile` is true; `generate`
returns a schema-valid `Artwork` at 512×512 with the right `engineId` and a
`playerPrompt` matching the input `playerPrompt` (not `prompt`); `critique` disposes the
SD-Turbo sessions before the composed engine loads (assert the fake worker client's
`dispose`/`unload` was called before the fake Janus load), delegates to it, and returns
its draft; `unload` tears down both the worker and the delegate.

## Manual verification

Automated tests cannot exercise the real pipeline. Once, by hand on a desktop GPU:
select **SD-Turbo HD**, accept the download, and complete a commission. Confirm the
image is visibly sharper than Janus's 384px output, the UI stays responsive, and
switching back to another engine frees memory rather than accumulating it — watch the
browser task manager across a few switches.

Record the observed generation time and peak memory in your handoff.

## Definition of done

- [ ] Every file exists, with TSDoc on every exported symbol.
- [ ] The UNet runs exactly once with no classifier-free guidance.
- [ ] The engine is unavailable on mobile.
- [ ] Critique delegates to Janus, loaded lazily and unloaded properly.
- [ ] SD-Turbo's own ORT sessions are disposed before Janus loads for critique, and
      recreated lazily on the next `generate()` call.
- [ ] The model repository and file names were verified and are recorded in the handoff.
- [ ] No test downloads a model.
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` all green.
- [ ] `src/lib/engines/sdturbo/README.md` written.
- [ ] Handoff entry appended to `docs/agent-log.md`.
