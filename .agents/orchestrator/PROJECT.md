# Project: Rules Explorer Search Optimization

## Architecture
- **Main Thread (`app.js`)**: Handles user interactions, DOM rendering (with progressive chunk rendering for >100 cards), tab switching, and BGG API imports. It delegates all search, autocomplete, dictionary listings, and Venn comparison set computations to the Web Worker.
- **Web Worker (`search-worker.js`)**: Memory-optimized (heap < 10MB). Fetches and parses `registry.json` on startup. Builds FlexSearch indexes supporting prefix matching and fuzzy search (edit distance up to 2). Resolves search queries, computes list filtering, calculates vector autocomplete recommendations, and runs set-intersection calculations for Venn comparison.
- **Data Flow**:
  - `app.js` sends event message `init` with database path or directly fetches inside the worker.
  - User typing in omni-search → `app.js` posts message `{ type: 'search', query: filters }` → worker processes using FlexSearch/filtering and posts back `{ type: 'searchResults', results: [...] }` → `app.js` renders results progressively if > 100 results.
  - User typing in vector search → `app.js` posts `{ type: 'autocomplete', query: text }` → worker computes recommendations and posts back `{ type: 'autocompleteResults', suggestions: [...] }` → `app.js` renders suggestions.
  - User selects comparison games → `app.js` posts `{ type: 'compare', gameIdA: idA, gameIdB: idB }` → worker computes sets (exclusive A, exclusive B, shared) and posts back `{ type: 'compareResults', shared, onlyA, onlyB }` → `app.js` renders Venn diagram.
  - Editor adds game → `app.js` posts `{ type: 'addGame', game: newGameEntry }` → worker updates its in-memory database and rebuilds indexes, then posts back `{ type: 'addGameDone', success: true }`.

## Code Layout
- `index.html` - App UI
- `app.js` - Main thread controller (modified to delegate to Web Worker, progressive chunk rendering for results/suggestions)
- `search-worker.js` - Dedicated Web Worker (new file to implement, heap < 10MB)
- `styles.css` - UI Styles
- `tests/` - E2E Testing directory containing test runner and test cases (new folder)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Testing Track | Design E2E test infra, implement 4-Tier test cases (validating R1-R4 requirements and performance benchmarks), publish `TEST_READY.md` | None | DONE (87 test cases, benchmarks validated) |
| 2 | Worker Search Engine | Create `search-worker.js`, load FlexSearch, fetch database, index data, support omni-search, filtering, fuzzy match (edit distance up to 2), heap < 10MB | None | DONE (in implementation track) |
| 3 | Autocomplete & Dict | Implement autocomplete suggestions (<500μs) and dictionary filtering inside Web Worker | M2 | DONE (in implementation track) |
| 4 | Venn Optimization | Re-implement Venn comparison using fast Set lookups in Web Worker (<100μs) | M2 | DONE (in implementation track) |
| 5 | App.js Integration | Refactor `app.js` to communicate with worker, progressive chunk rendering (>100 cards using requestAnimationFrame), block duration < 8ms, pass E2E | M1, M3, M4 | DONE (all E2E tests passed) |
| 6 | Adversarial Hardening | Implement Tier 5 white-box coverage hardening via Challenger | M5 | DONE (112/112 tests passed, 98% line coverage in app.js, 100% in search-worker.js) |

## Interface Contracts
### Main Thread ↔ Web Worker Communication Protocol
#### Inbound Messages (to Worker)
- `{ type: 'init', dbUrl: string }`
  - Initializes worker, fetches database, builds indexes.
  - Response: `{ type: 'ready', stats: { totalGames, totalTtrpgs, totalBoardgames, uniqueVectorsCount } }`
- `{ type: 'search', filters: { searchTerm, medium, genre, minYear, maxYear, sort } }`
  - Executes omni-search and filters.
  - Response: `{ type: 'searchResults', results: Array, totalCount: number }`
- `{ type: 'autocomplete', query: string }`
  - Get autocomplete matches for vector namespace.
  - Response: `{ type: 'autocompleteResults', suggestions: Array }`
- `{ type: 'compare', gameIdA: string, gameIdB: string }`
  - Computes Venn sets.
  - Response: `{ type: 'compareResults', shared: Array, onlyA: Array, onlyB: Array }`
- `{ type: 'dictionary', domain: string }`
  - Get dictionary mapping.
  - Response: `{ type: 'dictionaryResults', vectors: Array, activeDomain: string }`
- `{ type: 'addGame', game: object }`
  - Adds game to worker-side database and updates index.
  - Response: `{ type: 'addGameDone', success: boolean, updatedStats: object }`
