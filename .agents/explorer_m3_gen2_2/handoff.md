# Handoff Report: `search-worker` TypeScript Migration Investigation

This handoff report compiles the read-only exploration findings for migrating `src/search-worker.js` to `src/search-worker.ts` type-safely.

---

## 1. Observation

* **Files Explored**:
  - `src/search-worker.js`: JavaScript source for Web Worker omni-search/dictionary.
  - `src/search-worker.ts`: Partial TypeScript version with compile errors.
  - `src/types.ts`: TypeScript type definitions.
  - `tsconfig.json`: Project TypeScript configuration.

* **TS Compilation Error Logs** (via `npm run build` command):
  ```
  src/search-worker.ts(37,8): error TS2339: Property 'onmessage' does not exist on type 'DedicatedWorkerGlobalScope'.
  src/search-worker.ts(39,34): error TS2339: Property 'action' does not exist on type 'never'.
  src/search-worker.ts(65,16): error TS2339: Property 'postMessage' does not exist on type 'DedicatedWorkerGlobalScope'.
  ...
  ```

* **Target Configuration in `tsconfig.json`**:
  ```json
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    ...
  }
  ```

* **Legacy Code Gap (addVector vector mapping)**:
  - In `src/search-worker.js` (Lines 563-569):
    ```javascript
    function handleAddVector(data) {
      const vector = data.vector;
      if (vector && !uniqueVectors.has(vector)) {
        uniqueVectors.add(vector);
        rebuildVectorsCache();
      }
    }
    ```
  - In `src/types.ts` (Lines 281-288):
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

---

## 2. Logic Chain

1. **DedicatedWorkerGlobalScope Property Errors**:
   - *Observation*: `DedicatedWorkerGlobalScope` throws errors such as `Property 'onmessage' does not exist...`
   - *Reasoning*: The `tsconfig.json` doesn't define the `"lib"` compilerOption, meaning TypeScript defaults to DOM libraries. In the DOM environment, `DedicatedWorkerGlobalScope` doesn't exist natively. The empty declaration in `src/types.ts` is the only definition the compiler has, lacking worker-specific properties.
   - *Solution*: By referencing WebWorker scope `/// <reference lib="webworker" />` and using the `"lib": ["ES2022", "WebWorker"]` setting in `tsconfig.json` (or a worker-specific sub-project tsconfig), the correct built-in global worker properties are loaded.

2. **Unreachable Code Narrowing (`never` type error)**:
   - *Observation*: `Property 'action' does not exist on type 'never'` at line `data.type || data.action`.
   - *Reasoning*: Because `data.type` is typed as a truthy string union of requests, evaluating `data.type` always returns true. The short-circuiting logical `||` operator treats the right-hand side (`data.action`) as dead code, narrowing `data` to `never`.
   - *Solution*: Asserting the type of `data` on the right-hand side as `any` or `{ action?: string }` bypasses the unreachable code type restriction.

3. **`addVector` Argument Nesting Support**:
   - *Observation*: `AddVectorRequest` specifies `payload.vector` but the legacy worker code only accesses `data.vector`.
   - *Solution*: Modify the extraction to `const vector = data.vector || data.payload?.vector;` to safely support both legacy and nested payload formats.

---

## 3. Caveats

* **FlexSearch CDN Availability**: The proposed script downloads FlexSearch from CDN `https://cdnjs.cloudflare.com/ajax/libs/flexsearch/0.7.31/flexsearch.bundle.js` at runtime using `importScripts`. If building or testing in a completely network-isolated runtime sandbox, `importScripts` will fail at execution time (though it compiles fine).
* **Double Lib Conflicts**: Direct inclusion of `"WebWorker"` in the parent `tsconfig.json` will cause namespace conflicts with client-side DOM types. An isolated compilation config (`tsconfig.worker.json`) is the assumed architectural solution.

---

## 4. Conclusion

* The TypeScript migration of `src/search-worker.js` requires:
  1. Isolated sub-project `tsconfig.worker.json` targeting target `ES2022` with libraries `["ES2022", "WebWorker"]`.
  2. Resolving control-flow narrowing on `data.type || (data as any).action`.
  3. Supporting root-level and nested vectors in `handleAddVector()`.
  4. Casting `postMessage` outputs to their explicit response interfaces (e.g. `as VectorDictionaryResultsResponse`).
* The complete type-safe migration code is provided as `.agents/explorer_m3_gen2_2/proposed_search-worker.ts` and compiles with 0 errors.

---

## 5. Verification Method

* Run the TypeScript compiler with the target files and libraries:
  ```bash
  # Compile proposed code in isolation (simulates proposed tsconfig configuration)
  npx tsc --strict --noEmit --target es2022 --module esnext --moduleResolution node --ignoreDeprecations 6.0 --ignoreConfig --lib "es2022,webworker" .agents/explorer_m3_gen2_2/proposed_search-worker.ts
  ```
* Expected Result: Compilation completes successfully with exit code 0 and no output.
