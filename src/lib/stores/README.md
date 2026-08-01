# Game stores (`src/lib/stores`)

Reactive Svelte 5 stores that wire the domain layer, engine manager, and UI together.

## Public surface

| Export                     | Role                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `engines`                  | Singleton {@link EngineStore} — engine picker state and the one {@link EngineManager} |
| `engines.manager`          | The engine instance {@link GameStore} calls for `generate` / `critique`               |
| `engines.showCrayonNotice` | Derived — true when `activeId === 'mock'` and the Crayon banner was not dismissed     |
| `game`                     | Singleton {@link GameStore} — commission loop state machine                           |

Import from:

- `$lib/stores/engineStore.svelte`
- `$lib/stores/gameState.svelte`

## State machine

| Phase           | UI                                                                                                                                                                        | Entry                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `idle`          | {@link IdlePanel}                                                                                                                                                         | start / after collect           |
| `briefing`      | {@link ClientCard} + {@link PromptComposer}                                                                                                                               | `inviteClient()`                |
| `generating`    | {@link ClientCard} + {@link SketchCanvas} (paint while waiting; stays interactive after AI arrives) + AI preview below canvas + submit-choice until `confirmSubmitChoice` | `createArt()` then player picks |
| `critiquing`    | {@link ClientCard} + {@link ArtworkFrame} + {@link GeneratingPanel}                                                                                                       | after submit choice             |
| `results`       | {@link ResultsPanel}                                                                                                                                                      | after critique                  |
| `failed`        | {@link ErrorPanel} + composer                                                                                                                                             | engine error                    |
| `levelComplete` | {@link LevelCompleteOverlay}                                                                                                                                              | 5 commissions and $500          |

Every store method guards on the current phase. `collectCash()` is async and idempotent —
calling it twice does not pay twice. Blob image URLs are converted to durable `data:` URLs
before the gallery entry is persisted.

## Invariants

- `GameStore` defaults to `engines.manager`, never a second `EngineManager`.
- Spec 24 adds `hiredArtists`, `artistAssignment`, `majorProjectProgress` (parallel to spec 16
  `hiredStaffIds` — idle income unchanged).
- `createArt()` calls `engines.setSwitchingLocked(true)` until `confirmSubmitChoice` finishes (or generation fails).
- Playtest P6: `createArt()` runs prompt-only generate, then `pendingSubmitChoice` until the player calls `confirmSubmitChoice('drawing' | 'ai', sketchBlob?)`; critique uses the chosen `imageUrl` (no new `GamePhase` — still `generating` during the choice step).
- Hidden Level 1 prompt modifiers are applied only inside `createArt()` via
  `buildLevel1Prompt()`; the UI never displays the built prompt.
- `GameState` does not persist across reloads (intentional for Level 1 testing). Engine
  choice persists via `EngineManager` / `localStorage`.

## Tests

```powershell
npm run test:unit -- --run --project=client src/lib/stores
npm run test:unit -- --run --project=node src/lib/stores
```

E2E commission loop: `e2e/game-loop.e2e.ts`.
