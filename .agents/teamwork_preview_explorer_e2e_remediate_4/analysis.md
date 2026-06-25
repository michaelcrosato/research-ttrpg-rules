# Strategy Analysis: Remediation of E2E UI Blockage Benchmark

## 1. Summary of Findings
The Forensic Auditor (Auditor 2) identified that:
1. `app.js` runs all search filtering and sorting synchronously on the main thread via standard array operations in the `LocalSearchWorker` fallback.
2. The benchmark test `Benchmark: Main UI thread blockage is 0ms during typing` in `tests/tier34.test.js` is a **facade/self-certifying test** because it:
   - Measures a dummy mock worker (`const mockWorker = { postMessage: jest.fn() }`).
   - Asserts the calling duration of the mock `jest.fn()`, which is always 0ms.
   - Does not dispatch an event to the actual DOM, nor does it invoke the real event handlers or search triggers.

## 2. Technical Context & Obstacles
- **JSDOM Web Worker Limitation**: By default, JSDOM (used in the Jest environment) does not support the browser `Worker` API. Therefore, `app.js` correctly implements a synchronous fallback class `LocalSearchWorker`.
- **Debounced Input Handler**: The input event listener on `#omni-search` is debounced by 150ms. Dispatching an event triggers the debouncing wrapper (`debouncedSearch`) synchronously, which immediately returns. The actual search filtering and DOM rendering only execute when the debounce timer fires.
- **Milestone 4 vs. Milestone 5**: In Milestone 4, the application relies on the synchronous `LocalSearchWorker` fallback inside JSDOM. In Milestone 5, the application will offload execution to a genuine Web Worker (in supported environments). We need a single test that can robustly measure the blockage in both scenarios.

## 3. Recommended Strategy
To replace the facade benchmark with a genuine E2E verification, we will:
1. **Relocate the test**: Move the benchmark test from the isolated worker-only benchmark block to the E2E interaction test block (or a similar block where the DOM is initialized and `app.js` is required).
2. **Detect Web Worker capability**: The test will check if the global `Worker` is defined (`typeof window.Worker !== 'undefined'`).
3. **Execute and Measure**:
   - **Worker Available (Milestone 5 / Real Browser)**: Dispatch the `input` event on `#omni-search`. Because the worker runs in a separate thread, the main thread is not blocked during execution, resulting in blockage `< 1.0ms`.
   - **Worker Unavailable (Milestone 4 / JSDOM Fallback)**: Enable Jest fake timers using `jest.useFakeTimers()`. Dispatch the `input` event to `#omni-search` to queue the debounced search. Measure the execution time of `jest.runAllTimers()`. Since `jest.runAllTimers()` runs the timer callback synchronously on the main thread, the measured time includes the entire synchronous search, sorting, and DOM rendering. Assert that this complete processing time is `< 16.0ms` (matching the 60fps frame budget). Restore real timers using `jest.useRealTimers()` in a `finally` block.

## 4. Proposed Test Replacement
Below is the proposed test implementation. The implementer should replace `Benchmark: Main UI thread blockage is 0ms during typing` in `tests/tier34.test.js` with this code:

```javascript
    test('Benchmark: Main UI thread blockage is 0ms during typing', async () => {
      const omniSearch = document.getElementById('omni-search');
      expect(omniSearch).toBeTruthy();

      const isWorkerSupported = typeof window.Worker !== 'undefined';

      if (isWorkerSupported) {
        // Case A: Web Worker is active/mocked. Event handler delegates asynchronously.
        const t0 = performance.now();
        omniSearch.value = 'combat';
        omniSearch.dispatchEvent(new window.Event('input', { bubbles: true }));
        const duration = performance.now() - t0;
        
        expect(duration).toBeLessThan(1.0); // well under 8ms/frame UI blockage limit
      } else {
        // Case B: Web Worker is not supported (standard JSDOM/Milestone 4 fallback).
        // Search runs synchronously on the main thread when the debounce timer fires.
        jest.useFakeTimers();
        try {
          omniSearch.value = 'combat';
          omniSearch.dispatchEvent(new window.Event('input', { bubbles: true }));

          const t0 = performance.now();
          jest.runAllTimers(); // Synchronously executes the debounced search and DOM render
          const duration = performance.now() - t0;

          // Assert the main thread blockage is within the 16.0ms frame budget (60 FPS)
          expect(duration).toBeLessThan(16.0);
        } finally {
          jest.useRealTimers();
        }
      }
    });
```

## 5. Verification Method
1. Run `npm test` after implementing the change.
2. Confirm the test passes in the standard JSDOM environment (using the Case B synchronous fallback branch).
3. (Optional) Run the test after mocking `window.Worker` (e.g. adding `window.Worker = class {};` in `beforeEach`) to verify that the Case A branch executes and passes.
