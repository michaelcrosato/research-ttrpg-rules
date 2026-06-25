## 2026-06-25T03:21:06Z
Migrate src/search-worker.js and src/app.js to strict TypeScript as src/search-worker.ts and src/app.ts.
Guidelines:
1. Enable strict compiler options (strict: true) in tsconfig.json (already configured).
2. Define explicit TypeScript types and interfaces, importing from src/types.ts.
3. Handle worker globals typing:
   - For importScripts, declare the function or cast self to any.
   - Cast self to DedicatedWorkerGlobalScope.
4. Handle app.ts DOM null safety:
   - Under strict type checking, document.getElementById might return null. Add guards or assertions.
   - Cast event targets and elements to correct subclasses (e.g., HTMLInputElement, HTMLSelectElement, etc.) to access .value or .checked.
5. Window global functions:
   - The UI defines inline click handlers (e.g. onclick="loadMoreGames()"). Extend window globally in app.ts to support these functions so that tsc compiles cleanly.
6. Verify compilation by running npm run build and tests by running npm test. Ensure all 121 tests pass.
7. Document your changes and compile output in C:\dev\research-ttrpg-rules\.agents\worker_ts_migration\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
