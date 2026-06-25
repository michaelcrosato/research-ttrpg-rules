# Project: TypeScript Migration of Systems Indexer

## Architecture
- `app.ts` (compiled to `app.js`): Main UI thread logic, event handlers, DOM manipulation, and instantiation of search worker (Web Worker or LocalSearchWorker fallback).
- `search-worker.ts` (compiled to `search-worker.js`): Web worker thread logic, indexing data via FlexSearch, performing omni-search, autocomplete, Venn comparisons, and dictionary queries.
- `types.ts`: Contains shared TypeScript interfaces and types (`GameRuleset`, `GovernedVector`, `SearchWorkerMessage`, etc.) defining the boundaries of data storage and worker communication.
- `tsconfig.json`: Controls compiler behavior. Strict mode (`strict: true`) is enabled.
- Compilation process: Runs `tsc` to compile TS files to JavaScript, outputs them directly into the workspace root so they are served to the browser and can be ran by Jest tests.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Setup & Config | Create `tsconfig.json` with strict mode, add build script to `package.json`, install TS dependencies. | None | DONE |
| 2 | Core Typings | Define type definitions in `types.ts` (GameRuleset, SearchWorkerMessage, etc.). | M1 | DONE |
| 3 | Migrating search-worker | Port `search-worker.js` to `search-worker.ts` using strict types, compile to `search-worker.js`. | M2 | PLANNED |
| 4 | Migrating app | Port `app.js` to `app.ts`, integrate with compiled search-worker and typings. | M3 | PLANNED |
| 5 | Validation & Verification | Ensure all Jest tests pass, verify search and Venn benchmarks, run Forensic Audit. | M4 | PLANNED |

## Interface Contracts
### App ↔ Search Worker Message Protocol
- Messages sent to worker: `SearchWorkerMessage`
  - Action: `'init' | 'search' | 'autocomplete' | 'compare' | 'dictionary' | 'addGame' | 'addVector'`
  - Payload/filters depending on action
- Messages received from worker: `SearchWorkerResponse`
  - Type: `'ready' | 'searchResults' | 'autocompleteResults' | 'compareResults' | 'dictionaryResults' | 'error'`
  - Payload/data depending on type
