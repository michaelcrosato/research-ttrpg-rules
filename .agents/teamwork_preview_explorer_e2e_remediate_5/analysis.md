# Analysis of Test Stability and Cleanup Issues

## Summary of Findings
An investigation of the Systems Indexer E2E and unit test suites reveals three primary stability risks: a logic bug in the custom event listener tracking inside `tests/setup.js` leading to dangling listeners, global context pollution from un-teared-down worker mocks in `tests/worker.test.js` and `tests/tier34.test.js`, and flakiness from hardcoded `setTimeout` delays in asynchronous test lifecycle checks. Implementing option-aware event listener interception, global mock restorations, and polling-based `waitFor` checks will completely remediate these issues.

---

## 1. Event Listener Cleanup Interceptor Bug in `tests/setup.js`

### Root Cause
The current overrides for `window.removeEventListener` and `document.removeEventListener` in `tests/setup.js` filter the active tracking arrays (`windowListeners` and `documentListeners`) using only the event `type` and `listener` function reference, completely ignoring the `options` parameter (e.g. `capture`).
```javascript
window.removeEventListener = function(type, listener, options) {
  windowListeners = windowListeners.filter(
    item => !(item.type === type && item.listener === listener)
  );
  ...
};
```
If a component adds multiple listeners with the same callback but different options (such as once with `{ capture: true }` and once with `{ capture: false }`), calling `removeEventListener` for one will incorrectly filter out **both** entries from the tracking array. Consequently, the tracking array is emptied, but one of the actual event listeners remains bound to the browser `window` or `document` object.

### Impact
The untracked event listener is leaked across tests. When subsequent tests run, they trigger the leaked callback, causing cross-test side effects, state mutations, and memory leaks.

### Remediation Strategy
1. **Normalize Options**: Create a helper function `getCaptureOption(options)` to normalize options (boolean, object, or undefined) to a boolean representing the capture phase value, which is the only option that distinguishes listeners for removal in the standard DOM API.
2. **Prevent Duplicate Tracking**: Check if an identical listener (matching type, callback, and capture value) is already tracked in `addEventListener` before pushing.
3. **Exact Matching on Filter**: Filter only the exact matching listener and capture option in `removeEventListener`.

---

## 2. Global Mock Pollution in Worker Mocks

### Root Cause
In `tests/worker.test.js` and `tests/tier34.test.js`, mocks for Web Worker behaviors are registered directly on Node's root `global` object:
```javascript
global.self = global;
global.importScripts = jest.fn();
global.postMessage = jest.fn((msg) => { ... });
global.FlexSearch = { ... };
```
Additionally, evaluating `search-worker.js` assigns `global.onmessage`.
Neither test suite contains an `afterAll` hook to tear down or delete these properties.

### Impact
Since Jest runs multiple test files sequentially within the same process context (especially with `--runInBand`), properties attached to `global` persist across test suites. This pollutes the global scope for other files, potentially causing unexpected mock behaviors or preventing garbage collection of large worker database states.

### Remediation Strategy
1. **Preserve State**: In `beforeAll` of both suites, store the original values of `self`, `importScripts`, `postMessage`, `FlexSearch`, and `onmessage` if they exist.
2. **Clean Teardown**: Add an `afterAll` hook in both suites to restore original values or delete the mocked fields from `global` if they were originally undefined.

---

## 3. Fixed-Timing Delays (Timeout Flakiness)

### Root Cause
Five test assertions depend on arbitrary `setTimeout` delays to wait for asynchronous indexing or UI render actions to complete:
1. `tests/smoke.test.js` (line 85) – 50ms wait for database load and game card render.
2. `tests/smoke.test.js` (line 99) – 50ms wait for dashboard count rendering.
3. `tests/worker.test.js` (line 72) – 10ms wait for initialization failure message.
4. `tests/worker.test.js` (line 93) – 50ms wait for init indexing action.
5. `tests/tier34.test.js` (line 716) – 100ms wait for indexing 4,700 games in memory benchmark.

### Impact
Under constrained CPU conditions (such as CI container runners or local thread thrashing), parsing and search indexing can take longer than the hardcoded delays. This causes premature assertions (flakiness). Conversely, under optimal conditions, the tests sleep for longer than necessary, increasing the overall test duration.

### Remediation Strategy
Replace all 5 raw `setTimeout` delays with calls to the global `waitFor` polling helper. The helper will poll the expectations every 10ms (up to a 1000ms timeout) and return as soon as the target DOM element or worker message matches the expected state, optimizing speed and ensuring 100% stability.

---

## Proposed Implementation (Remediation Patch)
The proposed changes are detailed in `remediation.patch` within the explorer working directory. This patch can be applied cleanly using git or an implementer agent.
