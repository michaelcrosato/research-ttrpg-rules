# Handoff Report: Test Stability & Cleanup Remediation

This report outlines the analysis and remediation strategy for the event listener cleanup bug, global mock pollution, and fixed-timing timeout flakiness within the Systems Indexer test suites.

---

## 1. Observation

During read-only inspection of the test suites, the following files and code patterns were identified:

### Cleanup Interceptor Bug in `tests/setup.js`
In `tests/setup.js` lines 21-26 and 33-38:
```javascript
window.removeEventListener = function(type, listener, options) {
  windowListeners = windowListeners.filter(
    item => !(item.type === type && item.listener === listener)
  );
  return originalWindowRemove.call(this, type, listener, options);
};
```
*Note*: No check or comparison of the `options` parameter is performed when filtering the `windowListeners` array.

### Global Mock Pollution in `tests/worker.test.js` & `tests/tier34.test.js`
In `tests/worker.test.js` lines 18-22 and `tests/tier34.test.js` lines 630-634:
```javascript
    global.self = global;
    global.importScripts = jest.fn();
    global.postMessage = jest.fn((msg) => {
      lastMessage = msg;
    });
```
*Note*: Properties are registered directly on Node's root `global` context, and no `afterAll` hook cleans up or deletes these properties after the test suite finishes execution.

### Fixed-Timing Delays (Timeout Flakiness)
Using `findstr` or PowerShell `Select-String`, 5 raw `setTimeout` delays were located in the test suites:
- **`tests/smoke.test.js:85`**: `await new Promise(resolve => setTimeout(resolve, 50));`
- **`tests/smoke.test.js:99`**: `await new Promise(resolve => setTimeout(resolve, 50));`
- **`tests/worker.test.js:72`**: `await new Promise(resolve => setTimeout(resolve, 10));`
- **`tests/worker.test.js:93`**: `await new Promise(resolve => setTimeout(resolve, 50));`
- **`tests/tier34.test.js:716`**: `await new Promise(resolve => setTimeout(resolve, 100));`

---

## 2. Logic Chain

1. **Option-Ignorant Filtering (Leaked Listeners)**: In `tests/setup.js`, filtering `windowListeners` based only on `type` and `listener` callback references means that if a listener is registered twice (with different capture options) and then one is removed, the tracking array removes both entries. Since the tracking array is empty, the remaining registered listener is never cleaned up in `afterEach()`, leaking it across tests.
2. **Persistent Global Scope (Cross-Suite Pollution)**: When worker mocks are attached to Node's `global` without teardown, Jest's shared process execution environment carries the mocked values (`global.self`, `global.postMessage`, `global.onmessage`, `global.FlexSearch`) into unrelated test files executing afterward in the same process. This causes potential memory leaks and mock collision side-effects.
3. **Fixed Timing Assumptions (Race Conditions & Latency)**: Waiting for arbitrary fixed durations (10ms, 50ms, 100ms) assumes asynchronous operations (network fetching, DOM render, large FlexSearch database indexing) will always complete within those time frames. On busy CI nodes, indexing 4,700 items can easily exceed 100ms, causing premature checks and flakiness. Conversely, on fast systems, these delays wastefully block execution.

---

## 3. Caveats

- **Jest Sandboxing Behavior**: Although JSDOM isolates the `window` and `document` environments across test suites, references written to Node's `global` context bypass this sandbox and leak.
- **Other DOM Event Targets**: Event listener tracking only intercepts `window` and `document`. Handlers registered on individual element nodes (such as buttons or inputs) are assumed to be garbage collected when JSDOM cleans up the DOM between tests.
- **`waitFor` Sleep Loop Overhead**: If a test assertion is failing permanently, the `waitFor` polling loop will continue to retry for the full timeout duration (1000ms), which can increase the overall duration of failing test suite runs during local debugging.

---

## 4. Conclusion

The test suite suffers from medium-risk stability and cleanup gaps. remediating the event listener cleanup filter, resetting polluted global variables in `afterAll`, and replacing raw `setTimeout` delays with polling `waitFor` assertions will resolve these issues. A complete, syntax-validated unified patch file (`remediation.patch`) has been compiled and saved in the explorer's working directory.

---

## 5. Verification Method

To independently verify the issues and the efficacy of the remediation patch:

1. **Run Current Test Suite**: Confirm all tests pass under normal conditions:
   ```pwsh
   npm test
   ```
2. **Apply Remediation Patch**:
   Apply the patch file `remediation.patch` written in this folder:
   ```pwsh
   git apply .agents/teamwork_preview_explorer_e2e_remediate_5/remediation.patch
   ```
3. **Re-Run Test Suite**: Run the tests to verify compilation and execution stability:
   ```pwsh
   npm test
   ```
4. **Inspect Modifications**: Verify that the files `tests/setup.js`, `tests/smoke.test.js`, `tests/worker.test.js`, and `tests/tier34.test.js` contain the option-aware filters, `afterAll` teardown blocks, and polling helper assertions.
