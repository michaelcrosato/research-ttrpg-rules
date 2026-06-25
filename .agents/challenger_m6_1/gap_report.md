# Gap Report: Web Worker Search Coverage Audit

**Date**: 2026-06-25
**Target**: `search-worker.js` (Web Worker)
**Initial Coverage**: 80.00% Statements / 44.14% Branches / 90.00% Functions / 79.51% Lines

## Identified Gaps

### 1. Missing Actions & Error Routing
- **Uncovered lines 50-53 (Switch case 'addVector' & Default error handler)**: The case for handling the `addVector` message type as well as the default error handler when receiving an unrecognized message type are completely untested.
- **Uncovered lines 539-542 (`handleAddVector`)**: The helper function for dynamically adding a custom vector to the uniqueVectors Set has zero test coverage.

### 2. Initialization & Fetch Failures
- **Uncovered line 155 (`handleInit` fetch rejection)**: The failure path during initialization, specifically if `fetch` returns a non-ok status (e.g., 404, 500) when loading `registry.json`, is untested.

### 3. Search Caching & Eviction
- **Uncovered lines 242-252 (Search Cache Hits)**: The performance optimization where subsequent searches return cached results in O(1) time is untested.
- **Cache Eviction**: Testing whether the search cache is cleared correctly (evicted) when a new game is dynamically added via `addGame`.

### 4. Search Boundaries, Filters & Sorting
- **Uncovered line 268 (Empty Search Term)**: The fallback code path when a search query is empty (or whitespace only) which returns all games is not covered.
- **Uncovered lines 281-285 (Genre Filter)**: The search filter for matching games by primary genre and subgenres is not tested.
- **Uncovered line 292 (Year Range Bounds)**: Boundary checks for the minimum and maximum year filters.
- **Uncovered lines 302-312, 316 (Sorting options)**: The title ascending (`title-asc`), title descending (`title-desc`), and year ascending (`year-asc`) sorting branches are uncovered. The default fallback sorting condition is also uncovered.

### 5. Autocomplete Edge Cases
- **Uncovered line 345 (Pre-init Autocomplete)**: Rejection of autocomplete messages sent before the worker has been initialized.
- **Uncovered line 360 (Vector Autocomplete with Empty Query)**: The branch returning all sorted unique vectors when the autocomplete query is empty.

### 6. Venn Comparison Failures & Boundaries
- **Uncovered lines 392, 403, 406 (Venn Compare Edge Cases)**:
  - Attempting Venn comparison before initialization.
  - Querying Venn comparison with a non-existent Game A ID.
  - Querying Venn comparison with a non-existent Game B ID.

### 7. Dictionary Domain Lookup & Pre-init Rejections
- **Uncovered line 439 (Pre-init Dictionary)**: Attempting vector dictionary lookups before initialization.
- **Uncovered lines 459-471 (Domain/All Dictionary Lookups)**: Queries to retrieve lists of games grouped by a specific domain (e.g. `'combat'`) or all domains (`'all'`) are untested.

### 8. AddGame Rejections & Boundaries
- **Uncovered lines 488, 493, 498 (AddGame Edge Cases)**:
  - Attempting to add a game before initialization.
  - Adding a game with missing/invalid required fields (like `game_id` or `title`).
  - Adding a game that has a duplicate `game_id` which already exists in the registry.

---

## Stress / Adversarial Test Scenarios to Implement

We will extend `tests/worker.test.js` to assert the correctness and robust error-handling/boundaries of the above scenarios:
1. **Fetch Rejection**: Mock `fetch` to return `ok: false` and verify that the init action rejects with a proper error message.
2. **Invalid Worker Messages**: Post unrecognized types/payloads to the worker to verify default error branch matches.
3. **Pre-init Rejections**: Trigger `compare`, `autocomplete`, `dictionary`, and `addGame` actions before `init` is run to verify robust state checks.
4. **Empty Search & Filters**: Run searches with empty values, non-matching genres, subgenres, out-of-bound years, and check all sorting modes (`title-asc`, `title-desc`, `year-asc`, and default).
5. **Search Cache Hit & Eviction**: Make the same search query twice, verifying that the cache is hit, then verify cache clearing when `addGame` is invoked.
6. **Autocomplete Limits & Edge Cases**: Perform vector autocomplete with an empty string, and verify all unique vectors are returned.
7. **Compare Non-existent Games**: Perform Venn comparison on bad IDs and assert correct error throw.
8. **Dictionary Domain & All Lookups**: Test query payload with `domain: 'combat'` and `domain: 'all'`, ensuring proper inverted index groups are returned.
9. **AddGame Edge Cases**: Add games with missing titles, duplicate IDs, and verify correct rejections.
10. **AddVector Action**: Dispatch `addVector` and verify that it updates `uniqueVectors` and rebuilds the sorted vectors cache.
