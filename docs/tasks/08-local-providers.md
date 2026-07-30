# Spec 08 — Local providers (split models) — STUB

**Status:** Placeholder. A full spec will replace this before implementation.
**Depends on:** Spec 07 merged.
**Priority:** Optional enhancement after ComfyUI + Janus (07).

## Mission (draft)

Extend the `remote` engine with **additional local backends** where generation and critique are
**different models**. The setup UI must expose **two model pickers**:

- **Generation model** — paints the commission image
- **Critique model** — vision Q&A for keyword hits + prose review

Spec 07 uses one Janus model for both. Spec 08 is for stacks that cannot.

## Candidate providers (pick during full spec)

| Provider | Generate | Critique | Default URL |
| -------- | -------- | -------- | ----------- |
| Ollama | Image model (Flux, etc.) | Vision LLM (LLaVA, llama3.2-vision, …) | `http://localhost:11434` |
| LM Studio | If supported by loaded stack | OpenAI-compatible vision chat | `http://localhost:1234` |
| ComfyUI + SD/Flux | Workflow JSON (not Janus) | Separate vision workflow or compose Janus nodes | `http://127.0.0.1:8188` |
| Automatic1111 | `/sdapi/v1/txt2img` | None — must pair with Ollama/LM Studio or mock | `http://127.0.0.1:7860` |

## Config shape (draft)

```ts
{
  provider: 'ollama' | 'lmstudio' | 'comfyui-sd' | 'automatic1111',
  baseUrl: string,
  generateModel: string,   // required for real art
  critiqueModel: string    // required for real critique
}
```

If only one model is set, compose `MockEngine` for the missing half (same rule as early multi-provider plan).

## Ownership zone (draft)

```
src/lib/engines/remote/providers/**
src/lib/components/ComfyUISetup.svelte   → rename/generalize to RemoteEngineSetup
src/lib/engines/remote/remoteConfig.ts   → extend schema
```

## Open questions for full spec

- One setup dialog with provider tabs vs separate flows per program
- ComfyUI: two workflow templates (generate + critique) per SD stack, or one graph with two outputs
- Model list discovery per provider (`/v1/models`, ComfyUI object_info, A1111 `/sdapi/v1/sd-models`)
- CORS docs per provider (already partially documented in 07 README pattern)

## Definition of done (TBD)

- [ ] Player selects **generation model** and **critique model** independently
- [ ] At least two provider presets work end-to-end (manual verify)
- [ ] `playerPrompt` verbatim rule preserved
- [ ] No real network in unit tests
