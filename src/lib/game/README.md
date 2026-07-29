# Domain rules (`src/lib/game`)

Pure game logic with no Svelte, DOM, or engine dependencies. Safe to import from stores,
engines, and tests.

## Public surface

| Module          | Exports                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `levelRules.ts` | `isLevelComplete`, `levelProgress`                                                                                                    |
| `operations.ts` | `filterGalleryEntries`, `identifyOperationalNeeds`, `buildOperationsSummary`, `buildOperationalSnapshot` and their input/output types |

Import from `$lib/game` via the barrel in `index.ts`.

## Invariants

- Every function is deterministic and side-effect free.
- Operational helpers read only the shapes defined in `$lib/types/contracts.ts`; they do not invent parallel state.
- Gallery filtering preserves newest-first ordering from `galleryHistory`.

## Not done yet

The rest of spec 01 (`text.ts`, `promptPipeline.ts`, `scoring.ts`, `src/lib/data/briefs.ts`) is still unimplemented in this checkout.
