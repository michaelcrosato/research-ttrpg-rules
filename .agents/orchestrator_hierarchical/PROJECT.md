# Project: Hierarchical Rules Vectors and Registry Enrichment

## Architecture
- `registry.json`: Holds the database of tabletop RPGs and board games.
- `search-worker.js`: Web Worker to index, search, autocomplete, and compare games.
- `app.js` / `index.html`: Client-side UI using web worker or LocalSearchWorker fallback.
- `tests/`: Jest test suite.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Database & Metadata Enrichment | Enrich registry.json to support at least 300 unique hierarchical vectors, ensuring >=85% games have 4+ vectors and 100% of explanations are >=30 characters & game-specific. Add a validation script. | None | DONE |
| 2 | Hierarchical Search Worker & Local Fallback | Update search-worker.js and LocalSearchWorker in app.js to match sub-vectors when querying parent namespaces. Suggest sub-vectors on autocomplete. | M1 | DONE |
| 3 | UI Integration & Verification | Update app.js rendering logic to display combined sub-vector explanations. Add Jest tests for hierarchical search. Run Forensic Auditor validation. | M2 | DONE |

## Interface Contracts
### Search Worker ↔ Main Thread
- Message `dictionary`: When `vector` parameter is supplied, worker finds all games matching the exact vector or any of its sub-vectors (e.g. prefix matches). Returns combined results.
- Message `autocomplete`: Type `vector` returns child vectors matching prefix/sub-vectors.
