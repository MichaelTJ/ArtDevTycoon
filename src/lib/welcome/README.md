# Welcome prefs (`$lib/welcome`)

Device-level one-pager flag for the first-visit studio tutorial. **Not** part of career
saves — switching slots must not re-show the dialog.

## Public surface

| Export                      | Role                                                    |
| --------------------------- | ------------------------------------------------------- |
| `WELCOME_STORAGE_KEY`       | `adt.welcome.v1`                                        |
| `loadWelcomeDismissed()`    | `true` only when parsed `dismissed === true`            |
| `persistWelcomeDismissed()` | Writes `{ version: 1, dismissed: true }` (never throws) |

Re-opening **How to play** from `GameMenuBar` does not clear this flag. Dismissing again
is a no-op persist.

## Invariants

- Missing / malformed / unavailable storage → not dismissed.
- No `contracts.ts`. No Zod schema — a boolean flag does not need one.
