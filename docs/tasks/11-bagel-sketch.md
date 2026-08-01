# Spec 11 — BAGEL sketch refine + paint tools

**Worktree:** `git worktree add -b agent/bagel-sketch ../adt-wt-bagel-sketch main`
**Depends on:** Specs 07–09 (My PC / remote providers). **Companion:** ADTLocalServe
`POST /api/janus/edit` (same auth/CORS as generate — **not** ComfyUI).
**Do not run concurrently with:** agents editing `contracts.ts`, `gameState.svelte.ts`,
`StudioHudOverlay.svelte`, or `src/lib/engines/remote/**`.

## Ownership zone

```
New:
  src/lib/components/SketchCanvas.svelte
  src/lib/components/SketchCanvas.svelte.test.ts
  src/lib/game/sketchBlank.ts          ← pure: isSketchBlank(ImageData) helper
  src/lib/game/sketchBlank.test.ts

Edit:
  src/lib/components/StudioHudOverlay.svelte*
  src/lib/components/index.ts
  src/lib/components/README.md
  src/lib/stores/gameState.svelte.ts
  src/lib/stores/gameState.svelte.test.ts
  src/lib/engines/manager.ts
  src/lib/engines/mock/mockEngine.ts
  src/lib/engines/mock/mockEngine.test.ts
  src/lib/engines/remote/janusLinkClient.ts
  src/lib/engines/remote/janusLinkClient.test.ts
  src/lib/engines/remote/remoteEngine.ts
  src/lib/engines/remote/remoteEngine.test.ts
  src/lib/engines/remote/providers/janusAdapter.ts
  src/lib/engines/remote/providers/types.ts   ← optional edit on RemoteProviderClient
  src/lib/engines/README.md
  src/lib/game/README.md
  docs/agent-log.md
  docs/tasks/README.md                       ← mark 11 ready

Orchestrator-owned (already applied or apply before agents):
  src/lib/types/contracts.ts                 ← optional sketchImage on generate()
  docs/architecture.md                       ← one-line BAGEL sketch note
```

ADTLocalServe changes land in the sibling repo (orchestrator / parallel agent) — see §8.

**MUST NOT:** `npm install`, git commit, `+server.ts` in this game, ComfyUI.

---

## Mission

Let the player **roughly paint a sketch** during briefing (basic paint tools), type a
prompt, and refine sketch → finished art via **BAGEL-style image edit** on My PC
(ADTLocalServe / JanusLink `POST /api/janus/edit`). Critique stays on the existing
vision path (Janus understand / other critique models).

Pitch: **"Draw a rough idea, describe it, let your PC refine it."**

Level 1 crayon joke still applies: `buildPrompt` modifiers stay on the **text** prompt;
`playerPrompt` remains verbatim. The sketch is an additional visual input, not a
replacement for the prompt.

---

## 1. Contract (orchestrator)

`ArtEngine.generate` and `EngineManager.generate` gain optional:

```ts
sketchImage?: Blob;
```

Engines that cannot edit **MUST** ignore `sketchImage` and behave as today (prompt-only).
Engines that can edit **SHOULD** prefer edit when `sketchImage` is present and non-blank.

No new `EngineId`. No new `GamePhase`.

---

## 2. Paint tools — `SketchCanvas.svelte`

Presentational canvas. Size **384×384** CSS pixels (devicePixelRatio-aware backing store).

| Prop            | Type                                                      | Notes                                          |
| --------------- | --------------------------------------------------------- | ---------------------------------------------- |
| `disabled`      | `boolean`                                                 | default false                                  |
| `hasStrokes`    | `$bindable` boolean                                       | true after any paint stroke; false after clear |
| `onexportready` | optional `(getBlob: () => Promise<Blob \| null>) => void` | parent registers exporter                      |

**Tools (basic painting properties):**

| Control | Behaviour                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------- |
| Tool    | `brush` \| `eraser` (segmented buttons)                                                           |
| Size    | range 2–40, default 8                                                                             |
| Color   | palette swatches: black, white, red, orange, yellow, green, blue, purple + `<input type="color">` |
| Clear   | wipe to white; `hasStrokes = false`                                                               |
| Undo    | last stroke (stack depth 20)                                                                      |

Drawing: pointer events, round line caps/joins, eraser uses `destination-out` or paints white.

Export: `canvas.toBlob('image/png')`. If `!hasStrokes`, exporter returns `null`.

**Tests:** mounts; brush/eraser buttons; clear resets hasStrokes; color/size controls have accessible names; prefers-reduced-motion: no obligatory animation.

---

## 3. Blank detection — `sketchBlank.ts`

```ts
/** True if every pixel is near-white (or fully transparent). */
export function isSketchBlank(data: ImageData, threshold = 250): boolean;
```

Used only if needed server-side / tests; UI primarily uses `hasStrokes`.

---

## 4. GameStore

- `draftSketchBlob = $state<Blob | null>(null)`
- Clear sketch blob on `inviteClient` / collect / error dismiss paths that reset briefing
- `createArt`: if `draftSketchBlob`, pass `sketchImage: draftSketchBlob` into `generate`
- Expose setter `setDraftSketch(blob: Blob | null)` for the page/overlay

---

## 5. UI wiring — `StudioHudOverlay`

During `briefing` (both studio + kitchen paths), above `PromptComposer`:

```svelte
<SketchCanvas bind:hasStrokes={sketchHasStrokes} disabled={false} onexportready={...} />
```

Parent (`+page` or overlay) on submit / before `createArt`:

1. Call registered `getBlob()`
2. `game.setDraftSketch(blob)`
3. `game.createArt()`

Copy under canvas (exact):

> Optional sketch — rough shapes help My PC refine. Brush, eraser, size, and colour.

---

## 6. MockEngine

When `sketchImage` present:

1. Read blob → object URL or data URL
2. Return `Artwork` with that image (or a data URL copy), `engineId: 'mock'`, preserve `playerPrompt`
3. Still ignore sketch for critique (text/procedural as today)

When absent: existing procedural SVG path.

**Test:** generate with a tiny PNG blob → `artwork.imageUrl` is non-empty data/blob URL; `playerPrompt` verbatim.

---

## 7. JanusLink edit client

### `janusLinkClient.ts`

Add:

```ts
edit(
  config: RemoteEngineConfig,
  body: { image: Blob; prompt: string; seed?: number; filename?: string },
  signal?: AbortSignal
): Promise<JanusGenerateResult>; // same shape as generate: images[].base64
```

Request: `POST {baseUrl}/api/janus/edit` multipart:

- `image` — file
- `prompt` — edit instruction (= built Level 1 `prompt`, **never** raw playerPrompt alone without modifiers — pass `input.prompt`)
- `seed` — optional form field

Response: same zod as `janusGenerateResultSchema`.

### `RemoteProviderClient`

Add optional:

```ts
edit?(
  config: RemoteEngineConfig,
  body: { image: Blob; prompt: string; seed?: number; filename?: string },
  signal?: AbortSignal
): Promise<{ images: Array<{ mimeType: string; base64: string }> }>;
```

Janus adapter implements `edit` via janusLinkClient.

### `RemoteEngine.generate`

```
if (input.sketchImage && this.client.edit) {
  → edit({ image: sketchImage, prompt: input.prompt, seed })
} else {
  → generate as today
}
```

If `edit` throws with message matching `/not (installed|available)|501|BAGEL/i`, wrap as
`EngineError('generation_failed', …)` with player-safe copy:

`'Sketch refine needs BAGEL on your PC (ADTLocalServe edit). Falling back is handled by the engine manager.'`

(Manager already falls back to mock on failure.)

**Tests:** fake client `edit` called when sketch present; `generate` called when absent; `playerPrompt` never appears in edit body's prompt field.

---

## 8. ADTLocalServe companion (sibling repo)

Add `POST /api/janus/edit` (janus-api + phone-app proxy), auth identical to understand.

**FakeEngine.edit:** re-encode input PIL image to PNG base64 (deterministic refine stub).

**JanusEngine.edit:**

- If `BAGEL_MODEL_DIR` env set and weights loadable → BAGEL image-edit (future).
- Else → `501` `{"error":"BAGEL not installed. Set BAGEL_MODEL_DIR or use Crayon Mode sketch."}`

Document in ADTLocalServe `docs/SPEC.md` §2.x. **ComfyUI is explicitly out.**

---

## 9. Definition of done

- [x] SketchCanvas with brush, eraser, size, colour, clear, undo
- [x] Optional sketch flows into `createArt` → `generate({ sketchImage })`
- [x] Mock returns sketch-based artwork
- [x] JanusLink client + RemoteEngine call `/api/janus/edit` when sketch present
- [x] `playerPrompt` verbatim; built `prompt` used for edit instruction
- [x] No ComfyUI; no real network in unit tests
- [x] `npm run check` + owned unit tests green
- [x] READMEs + agent-log handoff

---

## Manual verification

1. Mock engine: draw a blob, prompt "a cat", Create Art → results show sketch-derived image.
2. My PC + ADTLocalServe with FakeEngine/tests: edit path returns image.
3. My PC without BAGEL: edit 501 → manager falls back to mock, game continues.
4. Clear sketch → prompt-only generate (no edit call).
