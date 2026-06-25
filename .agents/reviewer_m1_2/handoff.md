# Handoff Report — Web Worker Implementation Review

## 1. Observation
- **File path**: `C:\dev\research-ttrpg-rules\search-worker.js`
- **File path**: `C:\dev\research-ttrpg-rules\scratch\test_worker.js`
- **File path**: `C:\dev\research-ttrpg-rules\.agents\orchestrator\PROJECT.md`
- **Command and Results (test_worker.js)**:
  `node scratch/test_worker.js` ran and passed:
  ```
  === STARTING WORKER VERIFICATION TESTS ===
  [importScripts] Mocked loading: https://cdnjs.cloudflare.com/ajax/libs/flexsearch/0.7.31/flexsearch.bundle.js
  [FlexSearch] Initialized Index with options: { tokenize: 'forward', split: /[\s.]+/ }
  ✔ search-worker.js successfully parsed and compiled.
  ...
  🎉 ALL WORKER TESTS PASSED SUCCESSFULLY! 🎉
  ```
- **Command and Results (npm test)**:
  `npm test` ran and passed:
  ```
  PASS tests/smoke.test.js
    Systems Indexer - E2E Smoke Tests
      √ DOM initializes successfully (44 ms)
      √ Registry database loads successfully and renders game cards (75 ms)
      √ Dashboard counts are rendered correctly (69 ms)
  ```
- **Interface Mismatch**:
  - `PROJECT.md` line 33 states: ` - { type: 'init', dbUrl: string }`
  - `search-worker.js` line 24-25 uses: `case 'init': await handleInit(payload);` where `payload` contains `{ url }` (defaults to `'registry.json'`).
  - `PROJECT.md` line 35 states response is: `{ type: 'ready', stats: { totalGames, totalTtrpgs, totalBoardgames, uniqueVectorsCount } }`
  - `search-worker.js` line 124-133 returns:
    ```javascript
    self.postMessage({
      action: 'init',
      success: true,
      stats: {
        totalGames: games.length,
        ttrpgCount: ttrpgs.length,
        boardGameCount: boardGames.length,
        uniqueVectors: uniqueVectors.size
      }
    });
    ```
  - `PROJECT.md` line 36 states: `{ type: 'search', filters: { searchTerm, medium, genre, minYear, maxYear, sort } }`
  - `search-worker.js` line 27-28 uses: `case 'search': handleSearch(payload);` where filters are flat on `payload`.
  - `PROJECT.md` line 38 states response is: `{ type: 'searchResults', results: Array, totalCount: number }`
  - `search-worker.js` line 208-212 returns:
    ```javascript
    self.postMessage({
      action: 'search',
      results,
      total: results.length
    });
    ```

## 2. Logic Chain
- **Step 1 (Correctness of imports and index)**: `importScripts('https://cdnjs.cloudflare.com/ajax/libs/flexsearch/0.7.31/flexsearch.bundle.js')` successfully loads the external FlexSearch dependency in standard browser worker environments. The `/[\s.]+/` regex split successfully handles the dot-notation vector namespaces, which allows searching namespaces like `combat.melee` or `tactical` effectively.
- **Step 2 (Completeness of actions)**: All six required actions (`init`, `search`, `autocomplete`, `compare`, `dictionary`, `addGame`) are present in `search-worker.js` switch statement (lines 24-41) and their helper functions are defined.
- **Step 3 (Robustness)**: A global `try-catch` wrapper inside the `onmessage` handler correctly intercepts any runtime errors and uses `postMessage` to communicate them back to the main thread under `{ action, error: error.message }` format.
- **Step 4 (Interface Conformance)**: Comparing the implementation with `PROJECT.md` reveals that the message properties and names do not match. The worker uses `action` where `PROJECT.md` specifies `type`, and response properties are formatted differently (e.g. `total` vs `totalCount`, `results` vs `suggestions`).
- **Step 5 (Sorting Loss)**: Examining the autocomplete game search logic in `search-worker.js` line 241 shows that filtering the global array using `matchedIds.includes(game.game_id)` causes the search relevance sorting returned by FlexSearch to be lost, as the native filter iterates in the order the games are defined in memory.

## 3. Caveats
- Since the main-thread `app.js` is not yet modified to delegate tasks to the worker, the E2E tests run in the main thread only.
- The verification tests in `scratch/test_worker.js` run in a Node environment with mock globals (`self`, `fetch`, `importScripts`, `FlexSearch`), which does not guarantee that browser-specific runtime quirks won't arise (e.g. CORS on importScripts or fetch).

## 4. Conclusion

### Quality Review Report

**Verdict**: REQUEST_CHANGES

#### Findings

##### [Major] Finding 1: Interface Contract Mismatch
- **What**: The Web Worker messaging protocol does not match the specifications defined in `PROJECT.md`.
- **Where**: `C:\dev\research-ttrpg-rules\search-worker.js` (lines 19-48 and handlers) vs `C:\dev\research-ttrpg-rules\.agents\orchestrator\PROJECT.md` (lines 30-51).
- **Why**: The worker uses `action` for command selection, while `PROJECT.md` dictates `type`. Input payloads are expected flat on `payload` instead of wrapped under `filters` or `query`. Output responses return field names like `total` instead of `totalCount`, `results` instead of `suggestions`, and `ttrpgCount`/`boardGameCount` instead of `totalTtrpgs`/`totalBoardgames`. This will break integration with the main thread.
- **Suggestion**: Update `search-worker.js` to conform to the specifications in `PROJECT.md`, or update `PROJECT.md` if the worker's structure is preferred.

##### [Major] Finding 2: Game Autocomplete Relevance Sort Order Loss
- **What**: Game autocomplete (`type !== 'vector'`) loses the relevance rankings returned by FlexSearch.
- **Where**: `C:\dev\research-ttrpg-rules\search-worker.js` (lines 239-242).
- **Why**: `index.search` returns game IDs sorted by search relevance. By filtering the master list with `games.filter(game => matchedIds.includes(game.game_id))`, the results are returned in their database load-order instead of relevance-order.
- **Suggestion**: Map over the search results directly to resolve games:
  ```javascript
  const matchedIds = index.search(q, { limit: 10 });
  results = matchedIds
    .map(id => games.find(game => game.game_id === id))
    .filter(Boolean)
    .map(game => ({ game_id: game.game_id, title: game.title }));
  ```

##### [Minor] Finding 3: Missing Safety Type Casts on Input Variables
- **What**: Text inputs are trimmed and lowered without casting to String, which will cause crashes if non-string payloads are received.
- **Where**: `C:\dev\research-ttrpg-rules\search-worker.js` (lines 156, 226, 319).
- **Why**: If a payload value like `searchTerm` or `query` is passed as a number (e.g. a year) or undefined, calling `.trim().toLowerCase()` throws a TypeError.
- **Suggestion**: Cast the input variables: `String(searchTerm || '')` before trimming.

##### [Minor] Finding 4: Incomplete Stats returned on `addGame`
- **What**: The returned stats in `handleAddGame` response only include `totalGames` and `uniqueVectors`, omitting `ttrpgCount` and `boardGameCount`.
- **Where**: `C:\dev\research-ttrpg-rules\search-worker.js` (lines 364-367).
- **Why**: When games are added, the dashboard stats cards on the main thread will go out of sync or require manual recounting of the local data.
- **Suggestion**: Keep track of and return the updated `ttrpgCount` and `boardGameCount` in the `addGame` response.

#### Verified Claims
- `search-worker.js` loads FlexSearch via `importScripts` → verified via code inspection → PASS
- Inverted index built on initialization for O(1) dictionary lookup → verified via code inspection (lines 67-82) → PASS
- Venn set calculations computed in worker using Sets → verified via code inspection (lines 274-280) → PASS
- Test suite executes successfully → verified via running `node scratch/test_worker.js` and `npm test` → PASS

#### Coverage Gaps
- Browser Web Worker execution → Risk: Medium. The worker hasn't been tested inside a real browser environment (only simulated in JSDOM/Node). Recommendation: Perform browser tests once Milestone 5 is implemented.
- CDN Availability → Risk: Low. In offline scenarios, the CDN import of FlexSearch will fail. Recommendation: Cache/download FlexSearch locally.

---

### Adversarial Review Report

**Overall risk assessment**: MEDIUM

#### Challenges

##### [High] Challenge 1: TypeErrors leading to Worker Termination
- **Assumption challenged**: Payloads always contain correctly-typed inputs.
- **Attack scenario**: A user inserts a search query that compiles to a number or a null value. The worker executes `searchTerm.trim()`, throws a `TypeError: searchTerm.trim is not a function`, and although it is captured in `try-catch`, the query fails.
- **Blast radius**: The search function completely breaks for that query.
- **Mitigation**: Add robust type casting and input validation for all payload inputs.

##### [Medium] Challenge 2: Performance Degradation on Game Autocomplete
- **Assumption challenged**: `games.filter` with `Array.includes` is fast enough.
- **Attack scenario**: A large registry database is loaded. Game autocomplete does `games.filter(game => matchedIds.includes(game.game_id))`. This has a time complexity of O(N * M) where N is database size (thousands of games) and M is the search results limit.
- **Blast radius**: High CPU usage and input latency for the user when typing.
- **Mitigation**: Create an in-memory lookup map of `game_id -> game` on init, and resolve results in O(M) time.

##### [Medium] Challenge 3: Inconsistent State on AddGame Duplicates
- **Assumption challenged**: Duplicate checking prevents double insertions.
- **Attack scenario**: If a game is added and the caller tries to add it again, the worker throws a duplicate error correctly. However, if the caller sends malformed game structures, parts of the indexes might still be updated while the array fails.
- **Blast radius**: Index corruption.
- **Mitigation**: Wrap data-mutating steps in try-catch and validate inputs before indexing.

#### Stress Test Results
- Input `searchTerm = 2026` (number) → expected to cast and search → actually throws TypeError on trim → FAIL
- Input `game.subgenres` is not an array (e.g. null) → expected to handle gracefully → actually throws TypeError on `some` → FAIL

#### Unchallenged Areas
- FlexSearch internal indexing performance: Did not benchmark memory usage on database sizes exceeding 50,000 games. Reason: out of scope for current registry size (~5,000 games).

## 5. Verification Method
1. Run the Node verification suite:
   ```pwsh
   node scratch/test_worker.js
   ```
2. Run smoke tests:
   ```pwsh
   npm test
   ```
3. Open `search-worker.js` and verify lines 19-48 for action mappings and lines 239-242 for the autocomplete array filtering.
