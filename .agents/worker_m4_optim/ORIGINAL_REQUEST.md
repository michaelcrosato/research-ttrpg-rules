## 2026-06-25T02:00:07Z
You are the Worker agent to optimize rendering and autocomplete in app.js.
Your working directory is C:\dev\research-ttrpg-rules\.agents\worker_m4_optim.
Your task is to modify C:\dev\research-ttrpg-rules\app.js to fix the following performance bottlenecks:

1. Card rendering synchronous path:
   - Change the threshold for synchronous rendering in `progressiveRender()` from 100 elements to 10 elements (so that lists with size > 10 are rendered progressively and don't block the thread).
   - In the progressive rendering loop (`renderBatch()`), change the loop yield time condition from `performance.now() - startTime > 5` to `performance.now() - startTime > 3` to ensure that loop execution + DocumentFragment appending stays strictly under the 8ms layout/paint budget.

2. Progressive Dictionary Domain List Rendering:
   - In `handleWorkerDictionaryResults(data)`, for the domain listings (i.e. `data.vector` is null/undefined), do NOT map the results and update `dict-results-list.innerHTML` synchronously.
   - Implement a progressive rendering function for the dictionary lists using `requestAnimationFrame`, `DocumentFragment`, and a 3ms frame budget, similar to card rendering.

3. Autocomplete Event Delegation:
   - In `handleWorkerAutocompleteResults(data)`, do NOT run `document.querySelectorAll('.suggestion-item')` and attach click listeners to each suggestion.
   - Instead, implement event delegation: attach a single click listener to `#vector-query-suggestions` ONCE during initialization in `setupEventListeners()` that catches click events, calls `.closest('.suggestion-item')` to retrieve the target and its vector, and processes the autocomplete selection.

4. Verification:
   - Run:
     `npm test`
     to verify all 87 tests compile and pass perfectly.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your implementation report to C:\dev\research-ttrpg-rules\.agents\worker_m4_optim\handoff.md and send me a message when done.
