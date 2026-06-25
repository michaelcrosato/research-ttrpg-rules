# TypeScript Migration Strategy & Architectural Recommendations: `search-worker`

## Executive Summary
This report outlines the migration strategy for transitioning `src/search-worker.js` to `src/search-worker.ts` under strict TypeScript compiler requirements (`strict: true`). It addresses strict type-safety, web worker scope resolution, third-party CDN integration (FlexSearch), API compatibility gaps, and build system configuration.

---

## 1. Context & Objectives
The target file `src/search-worker.js` handles client-worker queries including omni-search, auto-complete, game Venn comparison, and index population. It relies on FlexSearch loaded dynamically via CDN.
Milestone 3 requires:
- Transitioning to TypeScript at `src/search-worker.ts`.
- Enforcing strict type checks (`"strict": true` in `tsconfig.json`).
- Reconciling interface structures defined in `src/types.ts` (such as `SearchWorkerRequest`, `SearchWorkerResponse`, `GameRulesetInternal`, `WorkerStats`).
- Resolving compiler errors due to overlapping DOM and Web Worker type libraries.

---

## 2. Deep Dive: Architectural Challenges & Solutions

### A. Web Worker Global Scope Typings (`self`)
* **Problem**: In default environments, TypeScript includes DOM types (e.g., `lib.dom.d.ts`), which declare the global `self` as a `Window & typeof globalThis`. In a worker file, we need `self` typed as `DedicatedWorkerGlobalScope & typeof globalThis`. Loading both libraries simultaneously causes conflicting variable errors (e.g. duplicate definitions of `self`, `console`, `fetch`, etc.).
* **Solution**:
  1. Add `/// <reference lib="webworker" />` as the first line of `src/search-worker.ts` to instruct the compiler to load the worker type definitions for this file.
  2. To avoid compiler namespace pollution, compile worker files under an isolated TypeScript project configuration or exclude conflicting DOM types from the worker's library list.
  3. Reference `self` explicitly cast as `DedicatedWorkerGlobalScope` or `any` if required, but the reference directive resolves the built-in properties like `onmessage`, `postMessage`, and `importScripts` cleanly.

### B. Type-Safe Access to CDN-loaded FlexSearch
* **Problem**: `importScripts` fetches FlexSearch at runtime, meaning `FlexSearch` is not loaded via standard imports. Under strict mode, the compiler does not know what `self.FlexSearch` is.
* **Solution**:
  1. Leverage the global namespace declarations already present in `src/types.ts`:
     ```typescript
     declare global {
       namespace FlexSearch { ... }
       interface DedicatedWorkerGlobalScope {
         FlexSearch: typeof FlexSearch;
       }
     }
     ```
  2. Because the types are declared globally, the cast global context `self` (typed as `DedicatedWorkerGlobalScope`) automatically resolves `self.FlexSearch` type-safely.
  3. Ensure `index` is typed as `FlexSearch.Index | null` and initialized using `new self.FlexSearch.Index(...)`.

### C. Reconciling `addVector` Gap
* **Problem**: The existing JS worker only processes `data.vector`, whereas `AddVectorRequest` inside `src/types.ts` defines `vector` as optional at the root but nesting it inside `payload.vector`.
* **Solution**: Change the extraction logic in `handleAddVector` to safely support both legacy root-level and modern nested structures:
  ```typescript
  function handleAddVector(data: AddVectorRequest): void {
    const vector = data.vector || data.payload?.vector;
    if (typeof vector === 'string' && vector.trim() !== '') {
      const trimmedVector = vector.trim();
      if (!uniqueVectors.has(trimmedVector)) {
        uniqueVectors.add(trimmedVector);
        rebuildVectorsCache();
      }
    }
  }
  ```

### D. TypeScript Control Flow Narrowing Issue (Short-circuiting OR)
* **Problem**: On message receipt:
  ```typescript
  const data = e.data;
  const type = data.type || data.action;
  ```
  Since `data.type` is typed as a truthy string literal (union of message types in `SearchWorkerRequest`), the left side of the OR is *never* falsy. TypeScript's control flow analysis narrows the type of `data` on the right side to `never`. Evaluating `data.action` therefore throws a compilation error: `Property 'action' does not exist on type 'never'`.
* **Solution**: Force a type assertion when accessing the legacy `action` property to bypass compiler unreachable-code checks:
  ```typescript
  const type = data.type || (data as any).action;
  ```

---

## 3. Recommended Code Structure (`src/search-worker.ts`)
The proposed, type-safe implementation of `src/search-worker.ts` can be found in `.agents/explorer_m3_gen2_2/proposed_search-worker.ts`. Key highlights include:
1. **Explicit Casts for Responses**: Disambiguates type unions in union responses:
   ```typescript
   self.postMessage({
     type: 'dictionaryResults',
     action: 'dictionary',
     vector,
     results,
     vectors: results
   } as VectorDictionaryResultsResponse);
   ```
2. **Defensive Null Checks**: Ensures `index` (which is `FlexSearch.Index | null`) is verified as non-null before performing any search index operation (e.g. `index.add(...)`, `index.search(...)`).
3. **Type Guards for Map Lookups**: Uses `(g): g is GameRulesetInternal => g !== undefined` during relevance-preserving `.map()` filters to safely strip out any undefined lookups.

---

## 4. Build Configuration Recommendations (`tsconfig.json`)
To avoid compilation conflicts between DOM typings in the main application and Web Worker typings in the worker file, the following compilation strategy is recommended:

### Option A: Isolated Project Configuration (Recommended)
Create a sub-project tsconfig file `src/tsconfig.worker.json` containing:
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "WebWorker"],
    "allowJs": false
  },
  "include": ["search-worker.ts", "types.ts"]
}
```
And exclude `src/search-worker.ts` from the primary application compilation in `tsconfig.json` by adding it to an `exclude` list, compile both in your build script:
```bash
tsc --project tsconfig.json && tsc --project src/tsconfig.worker.json
```

### Option B: Compiler Library Override
Configure `tsconfig.json` to omit default libraries and configure separate includes if necessary, though Option A is cleaner for building multiple target contexts.
