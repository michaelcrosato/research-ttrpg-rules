# Synthesis: Milestone 2 Core Typings

## Consensus
All three Explorer subagents agree on the following core data models and interface definitions:
1. **GameRuleset**: A serialized/data contract representing a game ruleset entry inside `registry.json`.
2. **GameRulesetInternal**: An in-memory/worker-level ruleset entry, extending `GameRuleset` and containing a pre-calculated `governed_vectors_set: Set<string>` for performance-critical Venn operations.
3. **Web Worker Message Protocol**:
   - `SearchWorkerRequest` / `SearchWorkerMessage`: A discriminated union for requests sent *to* the worker (`init`, `search`, `autocomplete`, `compare`, `dictionary`, `addGame`, `addVector`).
   - `SearchWorkerResponse`: A discriminated union for responses sent *from* the worker (`ready`, `searchResults`, `autocompleteResults`, `compareResults`, `dictionaryResults`, `addGameDone`, `error`).
4. **Helper Configurations**:
   - `SearchFilters` to represent filtering and sorting criteria.
   - `RegistryData` to represent the shape of `registry.json` (`ttrpg` and `board_game` arrays).

## Resolved Conflicts / Nuances
- **Internal Game Naming**: The explorers named the internal game class `WorkerGame`, `InMemoryGameRuleset`, or `GameRulesetInternal`. We will use `GameRulesetInternal` as it is intuitive and clearly marks it as the internal runtime extension of `GameRuleset`.
- **Response Structure Flexibility**: The worker accepts messages where filter arguments are placed at the root level OR within a nested `payload` object. The type definitions must allow both formats to avoid breaking existing frontend logic and tests.
- **Dictionary Query Output**: Dictionary results return either `CompactGameReference[]` (when querying a specific vector) or `DomainVectorGroup[]` (when querying an entire domain). We will structure `DictionaryResultsResponse` as a union of these two sub-types or define them with clear, overlapping properties to support both code paths.

## Gaps
- **FlexSearch CDN Types**: FlexSearch is imported via `importScripts` at runtime. We need to declare the FlexSearch type in the worker or a global namespace definition to satisfy `tsc` without having local packages.
