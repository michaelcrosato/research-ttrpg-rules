# Milestone 1 Review Report (Setup & Config)

## Review Summary

**Verdict**: REQUEST_CHANGES

The setup successfully builds files into the `dist/` directory and passes all 116 Jest tests. However, the build outputs CommonJS files which use `exports` and `require`. Because these are loaded directly by the browser and Web Worker without a bundler, the application crashes immediately in the browser with `ReferenceError: exports is not defined`. Significant configuration changes are required to ensure the application actually works in production.

---

## Findings

### [Critical] Finding 1: ReferenceError `exports is not defined` at Runtime in Browser

- **What**: TypeScript compilation produces CommonJS code containing `Object.defineProperty(exports, "__esModule", { value: true });` and CommonJS exports/imports.
- **Where**: `dist/app.js` (line 3) and `dist/search-worker.js` (line 8).
- **Why**: Since `tsconfig.json` compiles with `"module": "NodeNext"` but `package.json` does not specify `"type": "module"`, TypeScript compiles the source files into CommonJS format. However, the browser environment (which loads `dist/app.js` directly via `<script src="dist/app.js"></script>`) and the Web Worker environment (which loads `dist/search-worker.js` via `new Worker(...)`) do not define `exports` globally. This causes a ReferenceError at runtime: `ReferenceError: exports is not defined`, making the application completely broken in production.
- **Suggestion**:
  1. Change `"module": "None"` in `tsconfig.json` if the project is intended to be run as classic global scripts.
  2. Alternatively, migrate the application to ES Modules (ESM) by adding `"type": "module"` in `package.json`, changing `index.html` to load `<script type="module" src="dist/app.js"></script>`, and specifying `{ type: "module" }` in the Web Worker instantiation.

### [Major] Finding 2: Test Failure on Clean Slate (`npm test` requires `npm run build` first)

- **What**: The Jest test suite fails to run if `dist/` is empty or deleted (e.g. after running `npm run clean`).
- **Where**: `package.json` scripts (`"test": "jest"`) and `jest.config.js` (`moduleNameMapper`).
- **Why**: `jest.config.js` maps imports of `../app.js` and `../search-worker.js` to `<rootDir>/dist/app.js` and `<rootDir>/dist/search-worker.js`. If a developer cleans the repository (`npm run clean`) and runs `npm test`, it throws a configuration error: `Could not locate module ../app.js mapped as ...`.
- **Suggestion**: Update the `test` script in `package.json` to `"npm run build && jest"` or update the `jest.config.js` `moduleNameMapper` to map directly to `<rootDir>/src/app.js` and let `ts-jest` compile them on-the-fly, removing the hard dependency on a pre-existing build in the test runner.

### [Minor] Finding 3: Leftover compiled files in root directory

- **What**: The compiled files `app.js` and `search-worker.js` are still present in the root directory.
- **Where**: Project root (`C:\dev\research-ttrpg-rules\app.js` and `C:\dev\research-ttrpg-rules\search-worker.js`).
- **Why**: These are leftover files from before the TS migration (when the source was in the root) or from a previous compilation. They are identical to the compiled outputs in `dist/`. Keeping them in the root is confusing because a developer might accidentally edit them instead of the source files in `src/`.
- **Suggestion**: Delete `app.js` and `search-worker.js` from the root directory, and ensure they are not tracked or recreated in the root.

### [Minor] Finding 4: Incorrect dependency categorization in `package.json`

- **What**: `jest` and `jest-environment-jsdom` are listed under `dependencies` rather than `devDependencies`.
- **Where**: `package.json` lines 13-14.
- **Why**: Testing libraries and environments are not required for production execution of the application; they should be categorized under `devDependencies`.
- **Suggestion**: Move `jest` and `jest-environment-jsdom` to `devDependencies` in `package.json`.

---

## Verified Claims

- **Claim 1: The setup works and files compile successfully into the `dist/` directory** → verified via `npm run build` and listing the directory content → **PASS** (files exist, though they have the runtime exports issue mentioned above)
- **Claim 2: All 116 Jest tests pass successfully** → verified via running `npm test` after compilation → **PASS** (116 tests in 6 suites pass successfully)

---

## Coverage Gaps

- **Browser/Worker runtime checks** — risk level: **HIGH** — recommendation: **investigate**. JSDOM mocks `Worker` as undefined, which hides the fact that the worker fails to instantiate in the browser due to `exports is not defined` inside `dist/search-worker.js`. A check or test that evaluates the compiled files in a non-module context or browser emulator would prevent this.

---

## Unverified Items

- *None.* All configuration aspects, builds, and test runs were verified.
