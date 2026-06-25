## 2026-06-24T20:23:34Z
You are a TypeScript Code Implementer. Your objective is to migrate `src/search-worker.js` to `src/search-worker.ts` for the Systems Indexer / Rules Explorer project.

### Context
Milestone 3 (search-worker migration) is about porting `src/search-worker.js` to TypeScript. You must read the synthesis report at `C:\dev\research-ttrpg-rules\.agents\orchestrator_ts_migration\synthesis_m3.md` and the explorer analysis reports under:
- `C:\dev\research-ttrpg-rules\.agents\explorer_m3_gen2_1\analysis.md`
- `C:\dev\research-ttrpg-rules\.agents\explorer_m3_gen2_2\analysis.md`
- `C:\dev\research-ttrpg-rules\.agents\explorer_m3_gen2_3\analysis.md`

You can use the proposed implementation in `C:\dev\research-ttrpg-rules\.agents\explorer_m3_gen2_1\proposed_search-worker.ts` (or `C:\dev\research-ttrpg-rules\.agents\explorer_m3_gen2_3\proposed_search-worker.ts`) as a reference or starting point.

### Requirements
1. Implement a fully type-safe, strictly compiled version of the search worker at `src/search-worker.ts`.
2. Ensure it imports and implements type contracts from `src/types.ts`.
3. Fix the `addVector` gap: the new `handleAddVector` must check both `data.vector` and `data.payload.vector` if nested.
4. Support both root-level fields and nested payload wrappers across all other handlers to preserve full backward compatibility with Jest tests and `app.js`.
5. Expose global bindings for `handleSearch` and `handleDictionary` on `self` so that mock testing environments inside Jest continue to work.
6. Once `src/search-worker.ts` is implemented, delete or rename `src/search-worker.js` to avoid duplicate inputs or target clashing during compilation (since `allowJs` is enabled).
7. Run the build script (`npm run build`) to ensure the project compiles cleanly under strict mode without any type errors or warnings.
8. Run the Jest test suite (`npm run test`) to verify all 121 tests pass successfully.
9. Write your implementation report to your working folder: `.agents/worker_ts_m3/handoff.md`.
10. Send a message back to the orchestrator summarizing your work and results.
