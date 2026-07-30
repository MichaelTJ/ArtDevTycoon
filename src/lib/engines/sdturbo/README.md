# SD-Turbo HD WebGPU engine

SD-Turbo paints at 512×512 via ONNX Runtime Web on desktop GPUs. Janus-Pro-1B critiques
lazily so the two model stacks are never resident at once — the desktop HD tier from spec 06.

## Public surface

Import from `$lib/engines/sdturbo/sdturboEngine` (the registry lazy-loads this module):

| Export              | Role                                               |
| ------------------- | -------------------------------------------------- |
| `SdturboEngine`     | `ArtEngine` implementation                         |
| `SdTurboEngineDeps` | Optional `{ createClient, createJanus }` for tests |
| `isModelCached`     | Best-effort Cache API probe for `probe()`          |

Supporting modules (usually not imported by game code):

| Module              | Role                                |
| ------------------- | ----------------------------------- |
| `workerClient.ts`   | Promise RPC over `postMessage`      |
| `sdturbo.worker.ts` | ORT WebGPU inference (worker entry) |

## Model source

Verified against Hugging Face on 2026-07-29:

| Asset        | Path                                                       |
| ------------ | ---------------------------------------------------------- |
| Repository   | `schmuell/sd-turbo-ort-web`                                |
| Text encoder | `text_encoder/model.onnx` (~681 MB)                        |
| UNet         | `unet/model.onnx` (~1.7 GB)                                |
| VAE decoder  | `vae_decoder/model.onnx` (~99 MB)                          |
| Tokenizer    | `Xenova/clip-vit-base-patch16` via `AutoTokenizer.from_pretrained` |

Weights are cached under the `onnx` Cache API bucket, matching Microsoft's
[sd-turbo ORT example](https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/sd-turbo).

## Invariants

- **All inference in the worker.** Three ORT sessions (text encoder, UNet, VAE) never load on
  the main thread.
- **Single-step UNet, no classifier-free guidance.** SD-Turbo is distilled for one denoising
  step at timestep 999; guidance produces noise, not art.
- **Graph optimization disabled.** ORT's `graphOptimizationLevel: 'all'` constant-folds
  `Sqrt` nodes on CPU during session load, but the webgpu bundle has no CPU kernel for that
  op — matching Microsoft's sd-turbo example, which omits aggressive graph optimization.
- **Requires WebGPU float16.** The worker refuses to load without the `shader-f16` feature,
  same gate as Microsoft's reference demo.
- **`playerPrompt` never enters the worker.** Only the built `prompt` (with hidden Level 1
  modifiers) is sent for generation.
- **Critique disposes SD-Turbo first.** `critique()` calls `disposeSessions()` on the worker,
  then lazily loads a composed `JanusEngine`. Sessions are recreated on the next `generate()`.
- **Desktop only.** `desktopOnly: true` and `minStorageBufferMb: 1536` gate mobile devices.
- **Determinism is best-effort.** An optional `seed` fixes the initial latents, but GPU driver
  differences can still change pixels slightly — tests must not assert on pixel values.

## Deliberately not done here

- Creativity scoring and payout — domain layer in `$lib/game`.
- Engine picker / download UI — `$lib/stores` and `$lib/components`.

## Manual verification

Automated tests use injected fake workers and never download the model. After merging,
verify once on a desktop GPU in Chrome or Edge:

```powershell
npm run dev
```

Pick **SD-Turbo HD**, accept the download, complete one commission. Confirm the image is
visibly sharper than Janus's 384px output, the UI stays responsive during generation, and
switching engines frees memory rather than accumulating it (watch the browser task manager
across a few switches). Record observed generation time and peak memory in a handoff note.

## Tests

```powershell
npm run test:unit -- --run --project=node src/lib/engines/sdturbo
```
