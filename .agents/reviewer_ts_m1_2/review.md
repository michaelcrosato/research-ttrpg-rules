# Quality & Adversarial Review Report — Milestone 1 (Setup & Config)

## Review Summary

**Verdict**: REQUEST_CHANGES

**Summary of Verdict**:
While the build script compiles successfully without syntax errors and all 116 Jest tests pass, there is a critical configuration mismatch: the compiled browser-facing files (`app.js` and `search-worker.js`) contain CommonJS module wrappers (`exports` references) which throw `ReferenceError: exports is not defined` and completely crash the application in a real browser environment. Additionally, tests are currently run against the `dist/` directory without a pre-build step, leading to stale test execution risks, and obsolete files remain at the root.

---

## Findings

### [Critical] Finding 1: Browser Runtime Crash due to CommonJS Output Format

- **What**: TypeScript compiler transpiles `src/app.js` and `src/search-worker.js` with module code prepended: `Object.defineProperty(exports, "__esModule", { value: true });`.
- **Where**: `dist/app.js` (line 3) and `dist/search-worker.js` (line 8).
- **Why**: In `tsconfig.json`, the `"module"` and `"moduleResolution"` options are set to `"NodeNext"`, and `package.json` does not declare `"type": "module"`. Consequently, `tsc` compiles the files as CommonJS modules. Web browsers and Web Workers do not have a global `exports` object, so loading these scripts in the browser or worker throws a `ReferenceError: exports is not defined` and crashes the application.
- **Suggestion**: Either:
  1. Use separate tsconfig files: a browser configuration targeting `"module": "ESNext"` (or `"module": "None"`) and a Node configuration for database scripts; OR
  2. If migrating to ES modules, set `"type": "module"` in `package.json`, use `"module": "ESNext"` in `tsconfig.json`, and update the browser `<script>` tag in `index.html` to `type="module"`.

---

### [Major] Finding 2: Stale Test Execution Risk

- **What**: Jest's `moduleNameMapper` is configured to map `../app.js` to `<rootDir>/dist/app.js`.
- **Where**: `jest.config.js` (lines 10-13).
- **Why**: This runs the Jest tests against the compiled files in `dist/`. However, `npm test` does not trigger a build step. If a developer edits `src/app.js` and runs `npm test`, Jest will test the stale, unbuilt code in `dist/` instead of the latest edits.
- **Suggestion**: Map `../app.js` directly to `src/app.js` (or `src/app.ts` in the future) so that `ts-jest` transforms it on the fly during testing, or modify the `test` script in `package.json` to always rebuild first (e.g., `"test": "npm run build && jest"`).

---

### [Major] Finding 3: Redundant/Confusing Root Files

- **What**: Duplicate `app.js` and `search-worker.js` files remain at the workspace root directory.
- **Where**: Workspace root directory.
- **Why**: Since `index.html` has been updated to load `dist/app.js`, and `src/app.js` is the new source of truth, the root-level files are unused. They will confuse developers who might accidentally edit them instead of the source files in `src/`.
- **Suggestion**: Delete `app.js` and `search-worker.js` from the root directory.

---

### [Minor] Finding 4: Dependency and Package Hygiene

- **What**: Test packages are in `dependencies` instead of `devDependencies`, and types have mismatched versions.
- **Where**: `package.json` (lines 12-23).
- **Why**: `jest` and `jest-environment-jsdom` are needed only during development/testing and should be in `devDependencies`. Additionally, `@types/jest` is version `^30.0.0` while `jest` is version `^29.7.0` (mismatched major version), which can cause typing conflicts in future milestones.
- **Suggestion**: Move test dependencies to `devDependencies` and match `@types/jest` to `^29.0.0`.

---

## Verified Claims

- **Claim**: Setup compiles successfully via `npm run build` → Verified via running `npm run build` in shell → **Pass**
- **Claim**: 116 Jest tests pass successfully via `npm test` → Verified via running `npm test` in shell → **Pass**
- **Claim**: Target code files compiled successfully into `dist/` → Verified via checking `dist/` directory contents → **Pass**

---

## Coverage Gaps

- **Browser runtime simulation** — Risk level: **High** — The tests pass under Node/JSDOM because Node provides global `exports` and `module` variables. However, this masked the runtime crash that occurs in a real browser.
  - *Recommendation*: Introduce a headless browser smoke test or run the build output through a strict non-CommonJS context simulation during verification.

---

## Unverified Items

- **Actual Browser Execution** — Reason not verified: No headless browser tool (like Puppeteer or Playwright) is set up in the project dependencies, and we are operating in CODE_ONLY mode without a GUI. Verified instead via Node VM new-context script execution simulation.
