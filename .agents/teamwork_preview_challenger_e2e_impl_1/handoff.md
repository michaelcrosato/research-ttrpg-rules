# E2E Test Robustness & Stability Challenge Report

This report presents an adversarial analysis of the Systems Indexer E2E and unit test suites, highlighting critical race conditions, event listener leaks, global pollution, and memory characteristics.

## 1. Observation

During analysis and execution of the Jest test suite, several structural issues were observed in the test codebases:

### Fixed-Timing Delays (Race Conditions)
In the following test files, hardcoded `setTimeout` delays are utilized to wait for asynchronous operations (such as mock database loading or worker index execution):
- **`tests/smoke.test.js`** (Lines 85, 99):
  ```javascript
  await new Promise(resolve => setTimeout(resolve, 50));
  ```
- **`tests/worker.test.js`** (Line 72):
  ```javascript
  await new Promise(resolve => setTimeout(resolve, 10));
  ```
- **`tests/worker.test.js`** (Line 93):
  ```javascript
  await new Promise(resolve => setTimeout(resolve, 50));
  ```
- **`tests/tier34.test.js`** (Line 716):
  ```javascript
  await new Promise(resolve => setTimeout(resolve, 100));
  ```

### Flawed Event Listener Cleanup
In **`tests/setup.js`** (Lines 21-26, 33-38), event listener overrides intercept additions to `window` and `document` but fail to cleanly filter removals if the same event is registered with different options:
```javascript
window.removeEventListener = function(type, listener, options) {
  windowListeners = windowListeners.filter(
    item => !(item.type === type && item.listener === listener)
  );
  return originalWindowRemove.call(this, type, listener, options);
};
```

### Global Scope Pollution
In **`tests/worker.test.js`** (Lines 18-22) and **`tests/tier34.test.js`** (Lines 630-634), properties are assigned to the Node `global` context to simulate Web Worker behavior:
```javascript
global.self = global;
global.importScripts = jest.fn();
global.postMessage = jest.fn((msg) => {
  lastMessage = msg;
});
```
Neither suite contains an `afterAll` hook to clean up or delete these properties (`global.self`, `global.importScripts`, `global.postMessage`, `global.FlexSearch`, `global.onmessage`).

### Memory & Performance Metrics
Executing Jest sequentially (`--runInBand --logHeapUsage`) yields the following heap sizes across suites:
- `tests/tier12.test.js`: 122 MB - 201 MB
- `tests/tier34.test.js`: 191 MB - 224 MB
- `tests/smoke.test.js`: 208 MB - 234 MB
- `tests/worker.test.js`: 222 MB - 246 MB
A memory accumulation delta of up to ~105 MB is observed within a single process execution, indicating sandbox module cache retention.

In **`tests/setup.js`** (Lines 59-77), the custom `waitFor` helper catches and swallows all thrown errors (including Jest assertion failures) during its polling loop, meaning a failing assertion will always block execution for the full timeout (default 1000ms):
```javascript
    try {
      const result = await fn();
      if (result !== false) {
        return result;
      }
    } catch (e) {
      if (Date.now() - startTime > timeout) {
        throw e;
      }
    }
```

---

## 2. Logic Chain

1. **Race Conditions**: Under resource-constrained situations (such as busy CI servers or local CPU thrashing), the asynchronous operations of indexing 4,700 games or rendering cards can take longer than the hardcoded 10ms, 50ms, or 100ms thresholds.
2. ** Premature Checks**: In `tests/tier34.test.js:716`, measuring heap memory exactly 100ms after running `global.onmessage({ type: 'init' })` creates a race condition. If indexing is delayed, the heap measurement is taken before the index is fully constructed in memory, producing an invalid performance benchmark result and causing subsequent autocomplete tests to run on an uninitialized index.
3. **Cleanup Flaw (Dangling Listeners)**: In `tests/setup.js`, the `removeEventListener` interceptor filters out all matching handlers by `type` and `listener` reference, ignoring the `options` (e.g. `capture`). If a listener is registered twice (once with `capture: true` and once with `capture: false`), removing one removes both from `windowListeners`. The untracked duplicate remains bound to `window` and is leaked across tests.
4. **Global Leakage**: Persisting `global.self = global` creates a circular reference on Node's root context. Failing to delete worker mocks (`importScripts`, `postMessage`, `onmessage`) allows state to pollute subsequent test files running in the same process context.
5. **Slow Failure Performance**: Since `waitFor` swallows assertion errors, any failing test assertions wrapped in `waitFor` force a sleep-loop up to the full timeout, significantly increasing the runtime of failing test runs.

---

## 3. Challenge Report (Adversarial Review)

### Challenge Summary
**Overall risk assessment**: **MEDIUM** (No critical security vulnerability, but high probability of CI test flakiness and environment pollution).

### Challenges

#### [High] Challenge 1: Fixed Timing Assumptions (Race Conditions)
- **Assumption challenged**: Asynchronous operations (like indexing 4,700 items or DOM load and render) will always complete in under 10ms / 50ms / 100ms.
- **Attack scenario**: If the test executes on a single-core virtual machine or under high CPU load, parsing JSON and building the FlexSearch index takes ~150ms. The tests in `smoke.test.js`, `worker.test.js`, and `tier34.test.js` check expectations before the state changes, causing intermittent test failures (flakiness).
- **Blast radius**: Breaks build pipelines randomly, forcing developer retries on green code.
- **Mitigation**: Replace all fixed `setTimeout` pauses with polling-based `waitFor` checks that look for specific DOM changes or message states (e.g., waiting for `lastMessage` to match `{ type: 'ready' }`).

#### [Medium] Challenge 2: Event Listener Tracking Bug (Dangling Handlers)
- **Assumption challenged**: The custom event listener tracking in `setup.js` safely clean up all registered handlers.
- **Attack scenario**: If an E2E test or component adds multiple event listeners using identical callback functions but different options (such as capture flags) and later removes one, the tracking arrays `windowListeners` / `documentListeners` remove both entries. The remaining active handler is not cleaned up in `afterEach()` and persists.
- **Blast radius**: Leaked listeners can cause unexpected cross-test side effects, state mutations, and memory leaks.
- **Mitigation**: Update the interceptor filter in `setup.js` to compare the `options` parameter (specifically comparing `capture` / `useCapture` properties) when identifying listeners to remove.

#### [Medium] Challenge 3: Global pollution in Web Worker Mocking
- **Assumption challenged**: Mocking Web Worker globals by attaching properties to Node's `global` object does not affect other tests.
- **Attack scenario**: Attaching `self`, `importScripts`, `postMessage`, `FlexSearch`, and `onmessage` directly to the `global` object persists these properties across tests. If another suite checks for the existence of worker utilities or if global variables reference large objects (like search results in `lastMessage`), they remain rooted and escape GC.
- **Blast radius**: Potential memory leak and environmental pollution across the test lifecycle.
- **Mitigation**: Introduce an `afterAll` hook in `worker.test.js` and `tier34.test.js` to clean up and delete properties assigned to `global`.

#### [Low] Challenge 4: Swallowed Errors in `waitFor`
- **Assumption challenged**: Polling with swallowed errors is the most optimal way to implement `waitFor`.
- **Attack scenario**: An assertion like `expect(element.textContent).toBe('Expected')` fails. Instead of failing immediately, the error is swallowed and the test continues to poll for 1 second.
- **Blast radius**: Slow test runs during debugging and local development when multiple assertions are failing.
- **Mitigation**: Allow `waitFor` to re-throw instantly if the condition is non-temporal (i.e. not waiting for an event) or optimize the timeout limits.

---

## 4. Caveats

- **Mock JSDOM Sandbox isolation**: The test runner is assuming that Jest's JSDOM environment sandboxing prevents variables defined on the local global object from leaking to other files. While Jest's sandboxing isolates modules, references written to global scopes that hold Node references (e.g. process hooks or modules loaded via `require` that persist globally) can still cause minor leaks.
- **Other Targets**: Listener tracking only checks `window` and `document`. Handlers registered on custom nodes (like `document.body` or child elements) are assumed to be garbage collected when `innerHTML` resets. If a listener is bound to an element outside the innerHTML tree (e.g. if JSDOM retains a reference to another detached DOM tree), those handlers are not tracked or cleared.

---

## 5. Conclusion

The Systems Indexer test suites are highly performant under normal conditions (running in under 3 seconds) but rely on brittle fixed timings that present a high risk of flakiness under CPU constraints. Additionally, the event listener tracking harness contains a logic flaw when dealing with identical listener references and different options, and the worker tests leave dangling mock references on Node's global object.

---

## 6. Verification Method

To verify these observations and challenges:

1. **Check for Race Conditions**: Run tests in a CPU-limited environment or force high latency inside the mock fetch.
2. **Observe Event Listener Filtering Logic**: Review `tests/setup.js` at lines 21-26 and notice that `options` is not compared.
3. **Verify Global Pollution**: Add a dummy test file `tests/z_check_globals.test.js` containing `test('leak check', () => { expect(global.self).toBeUndefined(); })` and run tests. You will see it fails because `global.self` is still defined from previous suites run in the same process.
4. **Performance verification**: Run the project's test command:
   ```bash
   npm test
   ```
   Or run the standalone worker stress test:
   ```bash
   node tests/worker_stress.js
   ```
