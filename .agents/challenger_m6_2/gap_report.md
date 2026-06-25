# White-Box Test Coverage Gap Report

## 1. Context and Coverage Analysis
Based on running Jest with coverage (`npm test -- --coverage`), we found that `app.js` is at **88.61% Statement Coverage**, **65.67% Branch Coverage**, and **94.81% Function Coverage**.

The uncovered lines in `app.js` represent the following gaps:

- **LocalSearchWorker Error Handling**:
  - `99-100`: Catches database fetch errors during init when Web Workers are fallbacked to local mode.
  - `334-335`: Catches and routes general invocation errors in local worker messages.
- **Search Sorting Branches**:
  - `134`: Sort option `'title-desc'` is untested.
  - `137-140`: Sort option `'year-asc'` is untested.
- **LocalSearchWorker Autocomplete Gaps**:
  - `167-172`: Falling back to autocomplete for non-vector query types (e.g. game title suggestions) or handling empty strings.
- **Web Worker Error & Lifecycle Gaps**:
  - `349`: Initializing standard worker `new Worker('search-worker.js')` (typically skipped in JSDOM due to environment limitations, needing a direct mock path).
  - `378-379`: Handler for worker `'error'` payload.
  - `413-415`: Empty autocomplete results styling fallback (`suggestionsBox.style.display = 'none'`).
- **Database Load Failure**:
  - `600`: Non-OK HTTP status check when fetching `./registry.json` on application load.
  - `624-626`: Full DOM failure state render inside `loadDatabase()` catch block.
- **UI Edge Cases**:
  - `797`: Dismissing details modal by clicking outside the modal content container (direct click on overlay).
  - `828-829`: Inside `window.loadMoreGames()`, verifying batch updates correctly increment visible counts.
  - `887-888`: Progressive rendering job cancellation logic (`currentRenderJob !== null`).
  - `914`: Appending load-more button when length <= 10.
  - `920-945`: The internal batch rendering loops of `progressiveRender()` under requestAnimationFrame.
  - `1013-1031`: The internal batch rendering loops of `progressiveRenderDict()`.
  - `1039-1051`: The load-more button markup generator.
  - `1073-1074`: Game details modal displaying game descriptions.
  - `1085`: Game details modal displaying fallback text when a game has no governed vectors.
  - `1138-1140`: Clearing and closing autocomplete suggestions box when user input is empty/whitespace.
- **BGG Integration Corner Cases**:
  - `1593-1594`: BGG import fails when fetching details, resulting in missing item in response XML.
  - `1616`: Multi-category subgenre listing parser.
  - `1662-1663`: Catch block for failed BGG fetch requests.

## 2. Adversarial & Stress Scenarios
To verify the performance under stress, the following test scenarios will be targeted:

1. **High-Frequency Typing (Debouncing & Main Thread Blockage)**:
   - Simulate typing rapidly (e.g., 20+ keypresses in < 150ms) on both the omni-search input and the vector search input.
   - Verify that search functions are NOT invoked until typing finishes, confirming debounce behavior.
   - Measure main-thread blockage to ensure it stays below 8ms during typing.
2. **Progressive Render Cancellation Under High Search Rate**:
   - Dispatch multiple rapid search requests (e.g., changing search terms before previous progressive render batches complete).
   - Ensure the previous progressive render batches are canceled and do not leak or overlap.
3. **Huge Dictionary Rendering (All Domains)**:
   - Inject 1,000+ mock vectors into the dictionary.
   - Verify that the dictionary renders progressively without locking the UI thread for > 8ms.
