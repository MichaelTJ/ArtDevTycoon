# UI components (`src/lib/components`)

Presentational Svelte 5 components: props in, callbacks out. No stores, no fetch, no game logic.

## Components

| Component         | Purpose                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `OperationsPanel` | Search/filter commission history, surface urgent studio needs, and show summary cards, progress bars, and a records table |

### `OperationsPanel`

| Prop            | Type                         | Notes                                           |
| --------------- | ---------------------------- | ----------------------------------------------- |
| `summary`       | `OperationsSummary`          | Headline metrics from `$lib/game/operations`    |
| `needs`         | `OperationalNeed[]`          | Urgent and informational studio needs           |
| `entries`       | `GalleryEntry[]`             | Already-filtered commission rows                |
| `totalMatching` | `number`                     | Count for the live results readout              |
| `query`         | `OperationsQuery` (bindable) | `{ search, filter }` controlled by the panel    |
| `onquerychange` | `(query) => void`            | Optional callback when search or filter changes |

The parent (spec 04 integration) should call `buildOperationalSnapshot()` whenever game state or `query` changes, then pass the snapshot fields into this component.

## Invariants

- Components import types from `$lib/types/contracts` and, where needed, display types from `$lib/game`.
- Every interactive control is a native element with an accessible name.
- Tailwind utility classes follow the warm paper palette defined in spec 03.

## Not done yet

The other fourteen spec-03 components are still unimplemented in this checkout.
