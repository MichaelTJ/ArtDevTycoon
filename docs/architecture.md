# Architecture — Art Gallery Tycoon, Level 1

Read this after `best-practices.md`. It explains how the pieces fit and, more usefully,
why they are arranged this way — so you can tell which decisions are load-bearing and
which are free to change.

---

## 1. The game in one paragraph

The player runs a garage art studio. A client turns up with a brief ("a cozy coffee cup
on a wooden table"), the player writes a prompt, and the game silently staples a set of
amateur-quality modifiers onto that prompt before generating an image. An art critic
then looks at the result and scores it against the brief, paying out a fraction of the
client's budget. Five commissions and $500 unlocks Level 2. The joke the whole design
rests on is that the player never sees the modifiers, so their grand ambitions keep
coming back rendered in crayon.

---

## 2. Layer map

```
┌──────────────────────────────────────────────────────────────┐
│  Browser — Svelte 5 runes                                    │
│  routes/+page.svelte  ·  lib/components/**  ·  lib/stores/** │
└───────────────────────────┬──────────────────────────────────┘
                            │  fetch, JSON validated both ways
┌───────────────────────────▼──────────────────────────────────┐
│  SvelteKit server — routes/api/generate, routes/api/evaluate │
│  lib/server/ai/**  chooses a provider at runtime             │
└───────────┬──────────────────────────────┬───────────────────┘
            │                              │
   ┌────────▼─────────┐          ┌─────────▼──────────────────┐
   │ mock provider    │          │ sidecar client (HTTP)      │
   │ deterministic,   │          │  ──► FastAPI on :8756      │
   │ instant, no deps │          │      SDXL-Turbo (OpenVINO) │
   │ DEFAULT          │          │      Janus-Pro-1B (critic) │
   └──────────────────┘          └────────────────────────────┘
```

Pure game rules live in `src/lib/game/**` and depend on nothing — no Svelte, no fetch,
no Node. That is what makes them exhaustively unit-testable.

---

## 3. The decision that shapes everything: pluggable AI providers

Both AI capabilities sit behind the `ImageGenerator` and `ArtCritic` interfaces in
`src/lib/types/contracts.ts`, and there are always two implementations:

- **`mock`** — deterministic, instant, zero dependencies. Generates a seeded SVG
  placeholder and scores by keyword overlap. **This is the default.**
- **`sidecar`** — real models over HTTP to a local Python service.

Selected by the `AI_PROVIDER` environment variable (`mock` | `sidecar` | `auto`).
`auto` probes the sidecar and silently falls back to mock.

This is worth the indirection for four reasons. The game stays playable on any machine
with no multi-gigabyte download. The entire test suite runs in CI in seconds with no
GPU. Four agents could build against the AI layer in parallel without any of them
owning a model. And when generation inevitably fails mid-demo, there is a working
fallback instead of a dead end.

**Corollary:** no code outside `src/lib/server/ai/**` may know which provider is
active. If a component branches on provider name, the abstraction has leaked.

---

## 4. Why the models are assigned the way they are

The original brief suggested Janus 1B for image generation. We split the roles
differently, and the reasoning matters:

| Job | Model | Why this one |
| --- | ----- | ------------ |
| Image generation | **SDXL-Turbo** via OpenVINO | Single-step generation, ~2-3s on this iGPU, 512px output. Purpose-built for real-time use. |
| Art critique | **Janus-Pro-1B** | It is a *vision*-language model. It can look at the finished image through its SigLIP encoder and judge it. |

Janus-Pro-1B *can* generate images, but only at 384×384 and at noticeably lower
fidelity than SDXL-Turbo. Meanwhile its understanding side is the only local model here
capable of actually seeing a picture. Using it as the critic means the score reflects
the artwork that was really produced, rather than string-matching the player's prompt —
which makes the critic feel alive and is a genuinely better game.

### Hardware constraints driving the sidecar design

This machine has an **Intel Arc 130V iGPU (Lunar Lake), no CUDA, 16 GB of RAM shared
with the GPU**, so:

- Inference goes through **OpenVINO** (`optimum-intel`) with `device="GPU"`, not stock
  CUDA PyTorch. Stock PyTorch would silently fall back to CPU and take minutes.
- SDXL-Turbo **must** run with `num_inference_steps=1` and `guidance_scale=0.0`. The
  model is distilled for single-step sampling; ordinary guidance produces noise.
- Models are loaded **lazily and one at a time**, with the idle one evictable. Holding
  SDXL-Turbo and Janus resident simultaneously does not fit comfortably in 16 GB
  shared memory.
- The sidecar needs its own **Python 3.12** virtualenv. The system Python is 3.14,
  which the ML stack does not yet support.

---

## 5. Request flow for one commission

1. Player clicks **Create Art**. UI moves to `generating` and renders a skeleton.
2. `POST /api/generate { prompt }`. The route validates with `generateRequestSchema`,
   calls `buildLevel1Prompt()` to append the hidden modifiers, and hands the result to
   the active `ImageGenerator`. Returns an `Artwork`.
3. `POST /api/evaluate { brief, playerPrompt, imageUrl }`. The active `ArtCritic`
   returns a raw judgement; the domain layer clamps the payout to the brief's budget
   and the response is validated with `critiqueSchema` before it leaves the server.
4. UI moves to `results` and shows the image, the critique and the payout.
5. **Collect Cash** applies the payout via a tweened counter, pushes a `GalleryEntry`
   into the portfolio strip, increments the commission count, and returns to `idle` —
   or to `levelComplete` if both win conditions are met.

Any failure at step 2 or 3 moves the UI to `failed` with a player-safe message and a
retry affordance. The player never loses their typed prompt.

---

## 6. Directory ownership

| Path | Contents | Owner |
| ---- | -------- | ----- |
| `src/lib/types/**` | Frozen shared contract | Orchestrator |
| `src/lib/game/**` | Pure rules: prompt pipeline, scoring, payout, win check | Domain agent |
| `src/lib/data/**` | Level 1 client brief pool | Domain agent |
| `src/lib/server/ai/**` | Provider interfaces, mock impl, sidecar client | Backend agent |
| `src/routes/api/**` | HTTP endpoints | Backend agent |
| `src/lib/components/**` | Presentational components | UI agent |
| `src/lib/stores/**` | `gameState.svelte.ts` runes store | UI agent |
| `src/routes/+page.svelte` | Screen assembly | UI agent |
| `sidecar/**` | Python FastAPI + OpenVINO service | Sidecar agent |
| `e2e/**` | Playwright end-to-end specs | Integration agent |

---

## 7. Deliberately deferred

Upgrades, staff, gallery customisation, complex client types and extra art mediums are
all out of scope. Leave seams — `LEVEL_1` is a config object precisely so a `LEVEL_2`
can slot in beside it, and the provider interfaces already allow new backends — but
implement none of it.
