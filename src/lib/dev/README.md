# Dev mode (Spec 23)

Gated QA / content tooling. Playtest builds show **Dev** by default so other game
devs can test; `?dev=0` hides it.

## Public surface

| Symbol                                                            | Role                                                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `resolveDevMode`                                                  | Pure gate: playtest default on; `?dev=1` / `?dev=true`, `?studioDebug=1` alias, latch, Vite `import.meta.env.DEV`; `?dev=0` hard-off |
| `loadDevLatch` / `persistDevLatch` / `clearDevLatch`              | `adt.dev.v1` latch; never throws                                                                                |
| `clampCheatCash` / `clampCheatRep`                   | Integer clamps for economy cheats                                                                               |
| `peekLevel1ModifierSuffix`                                        | Hidden crayon suffix for **DevPanel only**                                                                      |
| `DevCheatPort`                                                    | Narrow mutator interface; GameStore implements via `dev*` methods                                               |

## Invariants

- Modifier peek UI mounts only inside `DevPanel` when Dev mode is enabled.
- Do not `console.log` the modified prompt in production when Dev mode is off.
- Cheats mutate the local `GameStore` / active save slot only — no server.
- `?studioDebug=1` remains a query alias for one release; e2e prefers `?dev=1`.

## Deliberately unfinished

- Hide Dev again for a public release (`?dev=0` is the current off switch).
- No server admin / feature-flag service.
- No auto-playing commissions or bot clients.
