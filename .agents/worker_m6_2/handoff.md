# Handoff Report

## 1. Observation
- **File path**: `C:\dev\research-ttrpg-rules\tests\worker.test.js`
- **Lines of Interest**: Lines 517 to 527 and 544 to 601 in the original `tests/worker.test.js` file:
  ```javascript
  // test data.payload.dbUrl
  global.onmessage({ data: { type: 'init', payload: { dbUrl: 'registry.json' } } });
  await global.waitFor(() => { expect(lastMessage.type).toBe('ready'); });

  // test data.payload.url
  global.onmessage({ data: { type: 'init', payload: { url: 'registry.json' } } });
  await global.waitFor(() => { expect(lastMessage.type).toBe('ready'); });
  ```
- **Test execution results**: Running the test suite `npx jest tests/worker.test.js` passes under ideal single-test runner circumstances. However, the `global.fetch` mocks are shared, and the asynchronous `init` worker messages do not clear `lastMessage` before invocation. This allows `global.waitFor` to resolve immediately with stale state (`lastMessage.type === 'ready'`), resulting in multiple `init` operations running concurrently and colliding on global state (`games`, `index`, `invertedIndex`).

## 2. Logic Chain
1. In `tests/worker.test.js`, the global variable `lastMessage` receives the message payload when the worker calls `postMessage`.
2. Inside the test `coverage gaps for fallback payloads and missing fields`, multiple sequential `init` actions are called (testing fallback urls/payloads).
3. The helper function `global.waitFor` resolves as soon as the callback expectation doesn't throw. For example, `expect(lastMessage.type).toBe('ready')` resolves immediately if `lastMessage.type` is already `'ready'` from a previous step or test.
4. Because `lastMessage` was not set to `null` before sending subsequent `init` messages, `global.waitFor` resolved instantly on stale state before the next async `init` handler finished fetching and indexing.
5. This left multiple async fetches and indexing routines running concurrently, causing race conditions and mock collisions.
6. Under slower systems or non-microtask-aligned promise timings, this leads to assertion failures where expected statistics (e.g. `stats.totalGames` being `2` or `1`) are evaluated against older, larger databases, or incorrect fetch mocks are hit.
7. Resetting `lastMessage = null` and ensuring `global.fetch` is mocked correctly with the proper registry payload before every `init` worker message call resolves this race condition deterministically.

## 3. Caveats
- No caveats. The fix is localized to the test environment of `tests/worker.test.js` under the `coverage gaps for fallback payloads and missing fields` block, avoiding any changes to actual runtime application code.

## 4. Conclusion
- The test failure is caused by a race condition/mock collision in the `coverage gaps for fallback payloads and missing fields` test case due to `global.waitFor` resolving immediately on a stale `lastMessage.type` value and executing concurrent asynchronous `init` indexing jobs.
- Localizing the fetch mocking and resetting `lastMessage = null` before each async worker message solves the problem cleanly and robustly.

## 5. Verification Method
- **Test Commands**:
  - Run the worker-specific test suite: `npx jest tests/worker.test.js`
  - Run the entire test suite: `npm test`
  - Run stress tests: `node tests/empirical_render_challenge.js` and `node tests/worker_stress.js`
- **Expected Output**:
  - `npx jest tests/worker.test.js` -> `21 passed, 21 total`
  - `npm test` -> `112 passed, 112 total`
  - `empirical_render_challenge.js` -> All challenges PASS, bypass is under 8ms.
  - `worker_stress.js` -> Rejections, performance benchmarks, and edge cases PASS successfully.
