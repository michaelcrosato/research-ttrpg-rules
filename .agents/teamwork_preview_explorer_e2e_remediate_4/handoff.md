# Handoff Report: E2E UI Blockage Benchmark Remediation

## 1. Observation
- The facade benchmark test is defined in `tests/tier34.test.js` (lines 783–796):
  ```javascript
  test('Benchmark: Main UI thread blockage is 0ms during typing', () => {
    const mockWorker = {
      postMessage: jest.fn()
    };
    
    const t0 = performance.now();
    mockWorker.postMessage({ type: 'search', filters: { searchTerm: 'combat' } });
    const duration = performance.now() - t0;
    
    expect(duration).toBeLessThan(1.0);
  });
  ```
- In `app.js` (lines 347–352), the application instantiates a fallback `LocalSearchWorker` in environments lacking standard `Worker` support (such as Node.js JSDOM):
  ```javascript
  function initSearchWorker() {
    if (typeof Worker !== 'undefined') {
      searchWorker = new Worker('search-worker.js');
    } else {
      searchWorker = new LocalSearchWorker();
    }
  ```
- The `#omni-search` input event listener (defined in `app.js` lines 743–755) triggers a debounced handler with a 150ms timeout:
  ```javascript
  const debouncedSearch = debounce((val) => {
    filters.searchTerm = val.toLowerCase().trim();
    visibleCount = 60;
    renderExplorer();
  }, 150);
  
  omniSearch.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });
  ```

## 2. Logic Chain
1. The original benchmark test is a facade because it mocks `postMessage` with `jest.fn()` and asserts the execution duration of the mock function rather than the real application search event handler flow.
2. In the JSDOM test suite, `typeof Worker === 'undefined'`, meaning `app.js` uses `LocalSearchWorker`, which processes searches synchronously on the main thread and renders results synchronously inside JSDOM.
3. Because the `#omni-search` event handler is debounced, dispatching the event does not trigger immediate search processing. The search executes when the debounce timer fires.
4. If we use Jest fake timers (`jest.useFakeTimers()`), dispatching the event queues the timer, and calling `jest.runAllTimers()` synchronously executes the timer callbacks.
5. In Case A (Web Worker supported), the search execution runs in a separate thread, and the main thread is not blocked (blockage `< 1.0ms`).
6. In Case B (Synchronous Fallback active), the search execution blocks the main thread. Measuring the execution time of `jest.runAllTimers()` allows us to assert that the synchronous main-thread blockage is within the 16.0ms frame budget (60 FPS) for the test dataset.

## 3. Caveats
- Since JSDOM does not execute in a true multi-threaded browser, we measure synchronous callback execution duration in Jest as a proxy for main thread event loop blockage.
- We assume `performance.now()` is available (which it is, globally or polyfilled in `setup.js` / `tier34.test.js`).

## 4. Conclusion
Replacing the facade benchmark test with the conditional E2E test block using `jest.useFakeTimers()` is a robust, correct, and non-bypassable verification strategy. It guarantees that we measure actual main thread blockage under both Web Worker and synchronous fallback modes.

## 5. Verification Method
- **Test Execution**: Run `npm test` after replacing the facade benchmark. The test suite must pass.
- **Inspect Files**: Confirm that the code block for the test in `tests/tier34.test.js` has been updated to the new E2E implementation.
