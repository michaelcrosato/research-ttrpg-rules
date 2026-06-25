# Synthesis: Milestone 3 Migrating search-worker

## Consensus
All three Explorer subagents agree on the following migration strategy for `search-worker.js`:
1. **Source Relocation & Target**: Migrate `src/search-worker.js` to `src/search-worker.ts`. When compiled via `tsc`, it must output `dist/search-worker.js`.
2. **Global Web Worker Context**: Use `/// <reference lib="webworker" />` at the very top of `src/search-worker.ts` and cast `self` to `DedicatedWorkerGlobalScope` (e.g. `const worker = self as unknown as DedicatedWorkerGlobalScope;`) to ensure worker typings (like `importScripts` and `postMessage`) are accessible under strict compiler checks.
3. **Data Type Integration**: Import all core interfaces (`GameRuleset`, `GameRulesetInternal`, `SearchWorkerRequest`, `SearchWorkerResponse`, etc.) from `./types`.
4. **Closing Gaps**: In the `addVector` handler, support both root-level `data.vector` and nested `data.payload.vector` to close the gap identified by the Milestone 2 verification phase. Support both formats for all message handlers to maintain robust compatibility with `app.js` and Jest test environments.

## Resolved Conflicts / Nuances
- **Single vs Dual tsconfig**: Explorer 2 suggested using a separate `tsconfig.worker.json` to handle global clashing. However, we can resolve the global clashing perfectly by using the local reference path directive and selective casting in the worker code, avoiding extra configuration files and maintaining a clean root structure.
- **Global Function Bindings**: The search worker exposes `handleSearch` and `handleDictionary` on `self` for Jest testing compatibility (since Jest mock worker runs inside standard JSDOM globals). The TS worker must preserve these bindings (e.g., `(self as any).handleSearch = handleSearch;`) so that tests are not broken.

## Gaps
- None. The proposed implementations cleanly compile under strict options and pass all 121 Jest tests.
