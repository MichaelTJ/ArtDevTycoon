# Spec 11 — BAGEL sketch refine — STUB

**Status:** Placeholder. A full spec will replace this before implementation.
**Depends on:** Level 2+ design; likely spec 08 or 09 provider layer; may need `contracts.ts` changes.
**Priority:** Later feature. Not Level 1.

## Mission (draft)

New commission input: player **roughly draws** on a canvas, types a **text description**, and
sends **sketch + text** to **BAGEL** ([ByteDance BAGEL](https://github.com/bytedance-seed/BAGEL))
to **refine the sketch into finished art** matching the description — image editing, not pure
text-to-image.

Critique still uses a **separate vision model** (or BAGEL's understanding mode if the full spec
decides one model can do both edit + judge — default assumption: **two models**, same as 08/09):

- **Edit model** — BAGEL (or BAGEL via ComfyUI workflow)
- **Critique model** — vision LLM (local or API)

## New surface area (draft)

| Area       | Change                                                                          |
| ---------- | ------------------------------------------------------------------------------- |
| UI         | `SketchCanvas.svelte` — draw, clear, submit with prompt                         |
| Contracts  | Optional `sketchImageUrl` or extend `generate()` input — orchestrator-owned     |
| Game phase | New sub-phase or Level 2 briefing variant                                       |
| Engine     | Provider sends input image + edit instruction built from `playerPrompt` / brief |

## Integration paths (pick one in full spec)

1. **ComfyUI BAGEL nodes** + same `/prompt` client as spec 07
2. **Replicate / BYO API** BAGEL endpoint (extends spec 09)
3. **ADT Cloud** (spec 10)

## Open questions for full spec

- Level 1 stays prompt-only crayon joke — sketch mode is Level 2+?
- Canvas resolution and export format for BAGEL input
- Whether edit model and critique model can both be BAGEL with different task flags
- Progress UI for slow local BAGEL inference

## Definition of done (TBD)

- [ ] Player can draw, describe, and receive refined artwork
- [ ] **Edit model** and **critique model** configurable (or documented if fixed pair)
- [ ] `playerPrompt` still verbatim in `Artwork` / results UI
