# Handoff Report: search-worker Migration Planning

## 1. Observation
We observed the following exact conditions, compiler errors, and requirements:
1. The compiler options in `tsconfig.json` enforce `"strict": true`, and include `"src/**/*"`.
2. Running the build command `npm run build` returned compilation failures in the current stub file `src/search-worker.ts`:
   * `src/search-worker.ts(37,8): error TS2339: Property 'onmessage' does not exist on type 'DedicatedWorkerGlobalScope'.`
   * `src/search-worker.ts(39,34): error TS2339: Property 'action' does not exist on type 'never'.`
   * `src/search-worker.ts(65,16): error TS2339: Property 'postMessage' does not exist on type 'DedicatedWorkerGlobalScope'.`
3. In `src/types.ts`, `SearchWorkerRequest` is a discriminated union. Each constituent type (`InitRequest`, `SearchRequest`, etc.) defines an optional property `action` and mandatory `type`.
4. In `src/types.ts`, `DedicatedWorkerGlobalScope` is extended globally with `FlexSearch: typeof FlexSearch`.
5. The `addVector` event in `src/search-worker.js` line 563-569:
   ```javascript
   function handleAddVector(data) {
     const vector = data.vector;
     if (vector && !uniqueVectors.has(vector)) {
       uniqueVectors.add(vector);
       rebuildVectorsCache();
     }
   }
   ```
   ignores `data.payload.vector` which is defined in `AddVectorRequest` (`types.ts` line 281).

---

## 2. Logic Chain
1. **Error: missing property on `DedicatedWorkerGlobalScope` (observation 2)**:
   * The compiler defaults do not load Web Worker library declarations because `lib` is not explicitly set in `tsconfig.json`.
   * Consequently, `DedicatedWorkerGlobalScope` resolves to the local custom definition in `src/types.ts` (observation 4), which lacks `onmessage`, `postMessage`, and other standard worker scope properties.
   * **Reasoning**: We must instruct the compiler to load Web Worker typings for `src/search-worker.ts` using `/// <reference lib="webworker" />` at the top of the file, and then cast `self` to `DedicatedWorkerGlobalScope` which will merge these globals cleanly.
2. **Error: property 'action' does not exist on type 'never' (observation 2 & 3)**:
   * In `search-worker.ts`, the line `const data = e.data || {};` resolves the type of `data` to `SearchWorkerRequest | {}`. Because `{}` is not part of the discriminated union, TypeScript fails to narrow the type or check properties on it.
   * **Reasoning**: Checking `e.data` for truthiness first guarantees it is of type `SearchWorkerRequest` (not null/undefined/empty object), making property extraction safe.
3. **Error: ignoring payload vector structure (observation 5)**:
   * **Reasoning**: In `handleAddVector`, mapping `vector = data.vector || (data.payload && data.payload.vector)` allows handling both top-level and nested structure variants.

---

## 3. Caveats
- FlexSearch is loaded from a CDN. We assume the runtime environment supports `importScripts` correctly and the CDN is reachable.
- We assume that `types.ts` is stable and does not need to be updated.
- We did not compile `src/search-worker.ts` with local edits because of read-only exploration rules, but verified compilation logic against the rules.

---

## 4. Conclusion
To perform a clean migration to strict TypeScript:
1. The target `src/search-worker.ts` must use `/// <reference lib="webworker" />` and cast `self` to `DedicatedWorkerGlobalScope`.
2. The incoming event handlers must check truthiness of `e.data` and cast `data` explicitly inside `switch` statements to their respective request subtypes (e.g. `data as InitRequest`).
3. We have provided a fully fleshed out reference solution `proposed_search-worker.ts` in this directory to serve as a drop-in replacement.

---

## 5. Verification Method
1. Replace `src/search-worker.ts` content with `.agents/explorer_m3_gen2_1/proposed_search-worker.ts`.
2. Run `npm run build` to verify there are zero TypeScript compiler warnings or errors.
3. Run `npm test` to verify the test suite passes completely.
