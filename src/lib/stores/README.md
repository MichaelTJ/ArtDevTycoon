# Game stores (`src/lib/stores`)

Reactive Svelte 5 stores that wire the domain layer, engine manager, and UI together.

## Public surface

| Export            | Role                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| `engines`         | Singleton {@link EngineStore} — engine picker state and the one {@link EngineManager} |
| `engines.manager` | The engine instance {@link GameStore} calls for `generate` / `critique`               |
| `game`            | Singleton {@link GameStore} — commission loop state machine                           |

Import from:

- `$lib/stores/engineStore.svelte`
- `$lib/stores/gameState.svelte`

## State machine

| Phase           | UI                                           | Entry                  |
| --------------- | -------------------------------------------- | ---------------------- |
| `idle`          | {@link IdlePanel}                            | start / after collect  |
| `briefing`      | {@link ClientCard} + {@link PromptComposer}  | `inviteClient()`       |
| `generating`    | {@link ClientCard} + {@link GeneratingPanel} | `createArt()`          |
| `critiquing`    | {@link ClientCard} + {@link GeneratingPanel} | after generate         |
| `results`       | {@link ResultsPanel}                         | after critique         |
| `failed`        | {@link ErrorPanel} + composer                | engine error           |
| `levelComplete` | {@link LevelCompleteOverlay}                 | 5 commissions and $500 |

Every store method guards on the current phase. `collectCash()` is async and idempotent —
calling it twice does not pay twice. Blob image URLs are converted to durable `data:` URLs
before the gallery entry is persisted.

## Invariants

- `GameStore` defaults to `engines.manager`, never a second `EngineManager`.
- `createArt()` calls `engines.setSwitchingLocked(true)` for its whole async body.
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
