## 2026-06-25T01:46:45Z
You are the Worker agent for Milestone 4: Main Thread Integration.
Your working directory is C:\dev\research-ttrpg-rules\.agents\worker_m4.
Your task is to refactor C:\dev\research-ttrpg-rules\app.js to integrate search-worker.js and implement progressive rendering.

Please follow these instructions:
1. Read the integration plan and code design in C:\dev\research-ttrpg-rules\.agents\explorer_m4\handoff.md.
2. Refactor app.js:
   - Instantiate and communicate with search-worker.js using the conformed interface contracts (type: 'init', 'search', 'autocomplete', 'compare', 'dictionary', 'addGame').
   - Keep the main thread's local state (allGames, gamesData) updated, especially when a game is successfully added via the database editor (updating upon receiving 'addGameDone').
   - Debounce search input typing by 150ms to prevent flooding the worker message queue.
3. Implement Progressive Card Rendering:
   - When rendering more than 100 cards, use DocumentFragment and requestAnimationFrame to render them progressively in batches. Limit each batch's execution time to 5ms (using performance.now()) to guarantee 0ms main thread blocking tasks and strictly 60 FPS (CPU task duration < 8ms).
4. Run the project tests using:
   `npm test`
   to ensure everything compiles and passes perfectly.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your implementation report to C:\dev\research-ttrpg-rules\.agents\worker_m4\handoff.md and send me a message when done.
