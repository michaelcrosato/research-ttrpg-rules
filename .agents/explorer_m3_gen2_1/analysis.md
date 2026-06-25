# TS Migration Strategy and Architectural Recommendations Report: `search-worker.ts`

- **Date**: 2026-06-25
- **Milestone**: M3 (search-worker migration)
- **Explorer**: Explorer 1 (TypeScript Migration Explorer)

---

## 1. Executive Summary

This report outlines the migration plan for `src/search-worker.js` to a strictly type-safe TypeScript implementation (`src/search-worker.ts`) targeting ES2022/ESNext configurations under `"strict": true` rules.

The investigation revealed compilation failures in the current stub file `src/search-worker.ts` because it lacked Web Worker library references, used `any` types that bypassed checks, ignored nested payload schemas in `addVector` handling, and had typing incompatibilities with discriminated unions.

Our recommendations provide:
1. A reference-based Web Worker typing strategy.
2. A strict type resolution design pattern for incoming message handling (`MessageEvent<SearchWorkerRequest>`).
3. Complete remediation of the `addVector` payload handling gap.
4. Clean abstractions for cached indexes, maps, and state management.

---

## 2. Codebase Diagnostics & Analysis

### 2.1 File: `tsconfig.json`
The configuration specifies:
- `strict: true`: Requires all variable, parameter, and return types to be explicitly declared or safely inferred. No implicit `any` is allowed. `null` and `undefined` must be handled explicitly.
- `target: ES2022` & `module: ESNext`: Modern JS targets.
- `include: ["src/**/*"]`: The search worker TS file is compiled as part of the normal compiler invocation.

### 2.2 File: `src/types.ts`
- Exposes `SearchWorkerRequest` (discriminated union for incoming messages: `InitRequest`, `SearchRequest`, etc.).
- Exposes `SearchWorkerResponse` (discriminated union for outgoing responses: `ReadyResponse`, `SearchResultsResponse`, etc.).
- Exposes `GameRulesetInternal` (extends `GameRuleset` with `governed_vectors_set: Set<string>`).
- Declares a global merging space:
  - Merges `FlexSearch` into `DedicatedWorkerGlobalScope` (adding `FlexSearch: typeof FlexSearch`).
  - Merges `FlexSearch` into `Window`.

### 2.3 Compilation Failures Observed in Current Stub
When running the compiler (`npx tsc`), the current `src/search-worker.ts` stub fails with 12 errors:
- **Missing Scope Members**: `Property 'onmessage'/'postMessage' does not exist on type 'DedicatedWorkerGlobalScope'`. This happens because standard webworker type definitions (`lib.webworker.d.ts`) are not loaded by default.
- **Type Reduction to `never`**: `Property 'action' does not exist on type 'never'`. This is caused by `const data = e.data || {};` which pollutes the discriminated union `SearchWorkerRequest` type with an empty object `{}`.
- **Ignored Payload in `addVector`**: The handling logic only checks `data.vector` instead of verifying the nested `data.payload.vector` structure.

---

## 3. Recommended Migration Strategy

### 3.1 Propose Typings for Worker-Specific Global Scopes
To enable the TypeScript compiler to resolve worker-specific APIs like `postMessage` and `importScripts` while retaining the custom `FlexSearch` properties declared in `src/types.ts`, we must:
1. Prepend a triple-slash directive to reference the Web Worker library types at the very top of `src/search-worker.ts`:
   ```typescript
   /// <reference lib="webworker" />
   ```
2. Leverage interface merging. Because `src/types.ts` declares:
   ```typescript
   declare global {
     interface DedicatedWorkerGlobalScope {
       FlexSearch: typeof FlexSearch;
     }
   }
   ```
   referencing `self` as `DedicatedWorkerGlobalScope` will automatically combine the standard worker APIs with our custom `FlexSearch` library.
3. Cast `self` to the merged `DedicatedWorkerGlobalScope` interface safely:
   ```typescript
   const worker = self as unknown as DedicatedWorkerGlobalScope;
   ```
   This ensures `worker.postMessage(...)` and `worker.FlexSearch.Index` are fully validated.

### 3.2 Plan for CDN-loaded FlexSearch (importScripts)
- Since `importScripts` is a standard API in `lib.webworker.d.ts`, we must remove the manual type declaration `declare function importScripts` to avoid duplication errors.
- We will access `FlexSearch` via the typed global worker scope (`worker.FlexSearch.Index`).

### 3.3 Discrimination Union & Event Handler Safety
To avoid union pollution and resolve the `Property 'action' does not exist on type 'never'` issue, we must:
1. Verify `e.data` is not null or undefined before accessing properties.
2. Directly reference `data.type || data.action` on the `SearchWorkerRequest` type.
3. Cast `data` to its specific subtype inside the message routing switch block to let TypeScript narrow the type for each individual handler.

Example layout:
```typescript
worker.onmessage = async function(e: MessageEvent<SearchWorkerRequest>) {
  const data = e.data;
  if (!data) {
    worker.postMessage({
      type: 'error',
      error: 'Empty request payload'
    } as ErrorResponse);
    return;
  }

  const type = data.type || data.action;
  if (!type) {
    worker.postMessage({
      type: 'error',
      error: 'Missing type or action'
    } as ErrorResponse);
    return;
  }

  try {
    switch (type) {
      case 'init':
        await handleInit(data as InitRequest);
        break;
      case 'search':
        handleSearch(data as SearchRequest);
        break;
      ...
```

### 3.4 Remediation for `addVector` Gap
We will update `handleAddVector` to safely extract the vector value checking both the top-level property and nested payload structure:
```typescript
function handleAddVector(data: AddVectorRequest): void {
  const vector = data.vector || (data.payload && data.payload.vector);
  if (vector && !uniqueVectors.has(vector)) {
    uniqueVectors.add(vector);
    rebuildVectorsCache();
  }
}
```

---

## 4. Code Mapping and Function Implementations

Here is a blueprint mapping key JS patterns to strict TS:

### 4.1 Inverted Index & Cache Initialization
In Javascript:
```javascript
let invertedIndex = new Map();
```
In TypeScript (Strict):
```typescript
let invertedIndex: Map<string, DictionaryGameEntry[]> = new Map();
let uniqueVectors: Set<string> = new Set();
let gamesMap: Map<string, GameRulesetInternal> = new Map();

interface CacheEntry {
  results: GameRulesetInternal[];
  totalCount: number;
  total: number;
}
let searchCache: Map<string, CacheEntry> = new Map();
```

### 4.2 Handling Inverted Index Additions
In Javascript:
```javascript
if (!invertedIndex.has(vector)) {
  invertedIndex.set(vector, []);
}
invertedIndex.get(vector).push(...)
```
In TypeScript (Strict), because `invertedIndex.get(vector)` returns `DictionaryGameEntry[] | undefined`:
```typescript
let list = invertedIndex.get(vector);
if (!list) {
  list = [];
  invertedIndex.set(vector, list);
}
list.push({
  game_id: game.game_id,
  title: game.title,
  medium: game.medium as 'ttrpg' | 'board_game',
  year: game.year
});
```

### 4.3 Map Queries & Filtering
In Javascript:
```javascript
results = matchedIds.map(id => gamesMap.get(id)).filter(Boolean);
```
In TypeScript (Strict), because `gamesMap.get(id)` returns `GameRulesetInternal | undefined`, and `.filter(Boolean)` does not narrow the type signature to remove `undefined`:
```typescript
results = matchedIds
  .map(id => gamesMap.get(String(id)))
  .filter((g): g is GameRulesetInternal => !!g);
```

---

## 5. Summary of Recommended Typings (API Protocol)
The following casts must be applied when invoking `worker.postMessage` to ensure outputs match the strict discriminated union responses declared in `src/types.ts`:
- **`handleInit`**: Cast payload to `ReadyResponse`.
- **`handleSearch`**: Cast payload to `SearchResultsResponse`.
- **`handleAutocomplete`**: Cast payload to `AutocompleteResultsResponse` (making sure to separate suggestions lists and results mappings properly).
- **`handleCompare`**: Cast payload to `CompareResultsResponse`.
- **`handleDictionary`**: Cast payload to `VectorDictionaryResultsResponse` or `DomainDictionaryResultsResponse`.
- **`handleAddGame`**: Cast payload to `AddGameDoneResponse`.
- **`catch` blocks**: Cast payload to `ErrorResponse`.
