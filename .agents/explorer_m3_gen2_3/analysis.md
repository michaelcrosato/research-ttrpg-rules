# TypeScript Migration Analysis: search-worker

This report provides the migration strategy, architectural recommendations, and proposed implementation for migrating `src/search-worker.js` to `src/search-worker.ts` with strict type safety enabled (`strict: true`).

## Summary of Core Findings
- The current draft of `src/search-worker.ts` fails to compile because the TypeScript compiler defaults to DOM libraries and does not recognize standard Web Worker global properties (`onmessage`, `postMessage`) on `DedicatedWorkerGlobalScope`.
- The `addVector` event in both the JS and draft TS code suffers from a payload mismatch gap (it ignores `payload.vector`), which must be resolved during migration by supporting both root-level and nested vector properties.

---

## 1. Observations

### 1.1 Verbatim Compilation Errors
When running `npm run build` with the current draft of `src/search-worker.ts`, the compiler outputs the following errors:
```
src/search-worker.ts(37,8): error TS2339: Property 'onmessage' does not exist on type 'DedicatedWorkerGlobalScope'.
src/search-worker.ts(39,34): error TS2339: Property 'action' does not exist on type 'never'.
src/search-worker.ts(65,16): error TS2339: Property 'postMessage' does not exist on type 'DedicatedWorkerGlobalScope'.
...
```

### 1.2 Global Scope Type Declarations in `src/types.ts`
At `src/types.ts:409-437`, we observe the interface declaration that extends `DedicatedWorkerGlobalScope`:
```typescript
  // Bind FlexSearch to DedicatedWorkerGlobalScope (for worker thread environment)
  interface DedicatedWorkerGlobalScope {
    FlexSearch: typeof FlexSearch;
  }
```
Because the `tsconfig.json` does not configure `"lib": ["WebWorker"]`, `DedicatedWorkerGlobalScope` is not defined as a built-in type. This declaration creates a custom interface containing only `FlexSearch`, resulting in compilation errors when `onmessage` or `postMessage` are accessed.

### 1.3 `addVector` Message Handling and M2 Gap
In `src/search-worker.js:563-569`:
```javascript
function handleAddVector(data) {
  const vector = data.vector;
  if (vector && !uniqueVectors.has(vector)) {
    uniqueVectors.add(vector);
    rebuildVectorsCache();
  }
}
```
The `AddVectorRequest` in `src/types.ts:281-288` defines the potential for `payload.vector`:
```typescript
export interface AddVectorRequest {
  type: 'addVector';
  action?: 'addVector';
  vector?: string;
  payload?: {
    vector?: string;
  };
}
```
The implementation currently ignores `data.payload.vector`, resulting in failed vector additions if sent inside a nested payload wrapper.

---

## 2. Logic Chain

1. **Worker Scope Resolution**:
   - Specifying `/// <reference lib="webworker" />` at the top of `src/search-worker.ts` instructs the compiler to include the `WebWorker` library.
   - This provides the full definition of `DedicatedWorkerGlobalScope` (including `onmessage` and `postMessage`), which merges with the declaration in `src/types.ts` that appends `FlexSearch`.
2. **Handling Legacy/Payload Messages**:
   - Because incoming message formats can utilize either the root properties or `data.payload`, and because of `strict: true` type narrowing, we must safely extract fields.
   - In `onmessage`, casting `e.data` as `SearchWorkerRequest` prevents union extraction errors:
     ```typescript
     const data = e.data as SearchWorkerRequest;
     ```
   - We extract `type` via `const type = data.type || data.action;` and switch on it.
   - Within the switch cases, casting `data` to its specific request interface (e.g. `data as SearchRequest`) ensures parameters are strictly checked for each sub-handler.
3. **Resolving the Vector Payload Gap**:
   - Updating `handleAddVector` to check both root-level and nested properties:
     ```typescript
     const vector = data.vector || (data.payload && data.payload.vector);
     ```
     ensures both formats are processed safely.

---

## 3. Proposed Typings & API Integration

### 3.1 Worker Global Scope Options
To type `self` as a Web Worker scope, we recommend two approaches:

#### Option A: Built-in Library Reference (Recommended)
Include a triple-slash directive at the top of `src/search-worker.ts`:
```typescript
/// <reference lib="webworker" />
```
This is standard and automatically types `self` as `DedicatedWorkerGlobalScope & typeof globalThis`. We then cast `self` to `DedicatedWorkerGlobalScope` for typed properties:
```typescript
const worker = self as unknown as DedicatedWorkerGlobalScope;
```

#### Option B: Dedicated Inline Interface (No Library Pollution)
To avoid any pollution from the `webworker` library into other DOM-centric source files, declare a custom interface that defines only the used worker subset, typed specifically with our request/response protocol:
```typescript
interface SearchWorkerGlobalScope {
  onmessage: ((this: SearchWorkerGlobalScope, ev: MessageEvent<SearchWorkerRequest>) => any) | null;
  postMessage(message: SearchWorkerResponse): void;
  FlexSearch: typeof FlexSearch;
  importScripts(...urls: string[]): void;
  performance: Performance;
}

const worker = self as unknown as SearchWorkerGlobalScope;
```
This is highly recommended for safety as it gives compile-time validation to messages posted *back* to the main thread (they must conform to `SearchWorkerResponse`).

### 3.2 FlexSearch Access Plan
Since FlexSearch is loaded via `importScripts`, it is accessed dynamically.
- `src/types.ts` defines `declare global { namespace FlexSearch { ... } }` and binds it to `DedicatedWorkerGlobalScope`.
- Through `worker.FlexSearch.Index`, we can instantiate the index with full type-safety under both Option A and Option B.

---

## 4. Caveats
- FlexSearch is imported using a CDN URL which is verified at runtime. During build or compile time, TypeScript relies solely on the definitions in `src/types.ts`. Any change to the FlexSearch API must be updated in `src/types.ts` manually.

---

## 5. Conclusion & Action Plan
We have created a fully type-safe version of `src/search-worker.ts` that compiles under strict constraints. The proposed code is saved in `.agents/explorer_m3_gen2_3/proposed_search-worker.ts` and can be copied directly to `src/search-worker.ts` to replace the broken implementation.

---

## 6. Verification Method

### 6.1 Run Build and Tests
To verify the migration, run the following commands:
```powershell
# Build the TypeScript files (checks for strict compile errors)
npm run build

# Run the test suite (verifies correct behavior of the worker)
npm test
```

### 6.2 Invalidation Conditions
The migration is considered invalid if:
1. `npm run build` fails with type errors.
2. The search-worker test cases (specifically `tests/worker.test.js`) fail or timeout.
3. The `addVector` event with nested `payload.vector` fails to index.
