# Handoff Report — Milestone 1 TS Migration Review

This handoff report summarizes the findings of `reviewer_ts_m1_1` regarding Milestone 1 (Setup & Config) of the TypeScript migration.

## 1. Observation
We observed the following:
* **Successful Build**: Proposing and running `npm run build` successfully compiles the files into `dist/`.
* **CommonJS Boilerplate in Output**: The compiled file `dist/app.js` starts with:
  ```js
  "use strict";
  // Systems Indexer Application Logic
  Object.defineProperty(exports, "__esModule", { value: true });
  ```
  The compiled file `dist/search-worker.js` starts with:
  ```js
  Object.defineProperty(exports, "__esModule", { value: true });
  ```
* **HTML Loading Script**: `index.html` loads the script via:
  ```html
  <script src="dist/app.js"></script>
  ```
  And there is no `type="module"` on the script tag.
* **Test Execution**: Running `npm test` executes Jest and passes all 116 tests in 6 suites successfully:
  ```
  Test Suites: 6 passed, 6 total
  Tests:       116 passed, 116 total
  ```
* **Clean-State Test Failure**: Running `npm run clean` (which deletes `dist/`) followed by `npm test` fails immediately with:
  ```
  Configuration error:

  Could not locate module ../app.js mapped as:
  C:\dev\research-ttrpg-rules\dist\app.js.
  ```
* **Duplicate Root Files**: `app.js` and `search-worker.js` still exist in the root directory and are identical to `dist/app.js` and `dist/search-worker.js` respectively (verified via `Get-FileHash`).

---

## 2. Logic Chain
1. **Compilation Behavior**: Because `tsconfig.json` specifies `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`, but `package.json` does not specify `"type": "module"`, the TypeScript compiler (`tsc`) defaults to transpiling the source `.js` files in `src/` to **CommonJS format** in `dist/`.
2. **Browser Compatibility**: In a standard browser environment (like the one loaded via `index.html` directly) and a Web Worker environment (loaded via `new Worker(...)`), the global object `exports` is undefined.
3. **Runtime Error**: When `dist/app.js` or `dist/search-worker.js` is loaded at runtime in the browser/worker, executing `Object.defineProperty(exports, ...)` will throw a `ReferenceError: exports is not defined`. This renders the application entirely non-functional.
4. **Test Dependency**: In `jest.config.js`, the `moduleNameMapper` routes `../app.js` to `<rootDir>/dist/app.js`. Therefore, the tests depend directly on the built outputs in `dist/`. If the developer has not built yet or cleaned the project, the tests fail because Jest cannot resolve the mapped modules.

---

## 3. Caveats
* **No Browser-Side Execution**: We did not execute the page in a GUI browser, but verified the code structure. Since the output JS contains references to `exports` and `require` in a non-bundled, non-module browser context, a `ReferenceError` is guaranteed to occur at runtime.
* **No Bundler Installed**: We verified that there are no devDependencies or configuration files for bundlers (Vite, Webpack, Rollup) in the repository. We assume the application is intended to run as a direct script/worker in the browser, matching the original JS architecture.

---

## 4. Conclusion
While the TypeScript compilation runs without compile-time errors and the 116 Jest tests pass in Node.js (which provides `exports` globally), the resulting build contains a **critical configuration flaw** that crashes the application at runtime in the browser. 

The verdict is **REQUEST_CHANGES**. The developer must fix:
1. The compiler output format (transpile to globals or ES modules).
2. The dependency of the `test` script on a pre-existing build (either map to `src/` or run `build` before `jest`).
3. Leftover `app.js` and `search-worker.js` in the root directory.
4. Categorization of `jest` and `jest-environment-jsdom` dependencies in `package.json`.

---

## 5. Verification Method
To verify these conclusions independently:
1. **Compile the files**: Run `npm run build`.
2. **Inspect headers**: View `dist/app.js` and check if it references `exports`.
3. **Test Clean-State behavior**: Run `npm run clean` then `npm test` to reproduce the configuration error.
4. **Inspect root**: Verify that `app.js` and `search-worker.js` still exist in the root directory and have identical content to `dist/`.
