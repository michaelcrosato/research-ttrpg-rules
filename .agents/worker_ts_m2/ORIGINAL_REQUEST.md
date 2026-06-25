## 2026-06-25T03:16:19Z
You are a TypeScript Type Implementer. Your objective is to create the TypeScript type definitions file at `src/types.ts` for the Systems Indexer / Rules Explorer project.

### Context
Milestone 2 (Core Typings) is about creating `src/types.ts`. You must read the synthesized type definitions and requirements from `C:\dev\research-ttrpg-rules\.agents\orchestrator_ts_migration\synthesis_m2.md` and the explorer analysis reports at:
- `C:\dev\research-ttrpg-rules\.agents\explorer_m2_1\analysis.md`
- `C:\dev\research-ttrpg-rules\.agents\explorer_m2_2\analysis.md`
- `C:\dev\research-ttrpg-rules\.agents\explorer_m2_3\analysis.md`

### Requirements
1. Create `src/types.ts`.
2. Define the following interfaces and types exactly as described:
   - `GameRuleset`: serialized representation (game_id, title, year, medium, primary_genre, subgenres, governed_vectors, vector_explanations, description?, extract?).
   - `GameRulesetInternal`: runtime representation extending `GameRuleset` with `governed_vectors_set: Set<string>`.
   - `RegistryData`: shape of registry.json ({ ttrpg: GameRuleset[], board_game: GameRuleset[] }).
   - `SearchFilters`: object mapping filtering and sorting parameters (searchTerm?, medium?, genre?, minYear?, maxYear?, sort?).
   - `SearchWorkerMessage` (also aliased/typed as `SearchWorkerRequest` for flexibility): discriminated union representing incoming worker messages. Must support both root-level fields and nested payload wrappers.
   - `SearchWorkerResponse`: discriminated union representing outgoing worker responses (ready, searchResults, autocompleteResults, compareResults, dictionaryResults, addGameDone, error).
   - Additional helper structures referenced in the explorer analyses (like `RegistryNameEntry`, `WorkerStats` / `DatabaseStats`, `DictionaryGameEntry` / `CompactGameReference`, `DictionaryVectorEntry` / `DomainVectorGroup`, `DictionaryVectorMatch`).
3. Add a global declaration or interface mapping for the `FlexSearch` library so that workers and app can use it cleanly (e.g. `FlexSearch.Index` class type, or `declare global { ... }`).
4. Ensure the file contains no compilation errors under strict mode (`strict: true` in `tsconfig.json`).
5. Run the build command (`npm run build` or `npx tsc --noEmit`) to verify that the newly created `src/types.ts` is syntactically correct and type-checks successfully.
6. Provide a detailed report of the changes made and the build verification output in your handoff.
