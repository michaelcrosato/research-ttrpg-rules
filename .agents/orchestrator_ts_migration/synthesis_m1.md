# Synthesis: Milestone 1 Setup & Config

## Consensus
All three Explorer subagents agree on the following:
1. **Dependencies**: None of the required TypeScript compilers, typings, or helpers are installed. We must install `typescript`, `@types/node`, `@types/jest`, `@types/jsdom`, and `ts-jest` as developer dependencies.
2. **TypeScript Configuration**: We must add a root `tsconfig.json` with `"strict": true`, targeting `"ES2022"`. 
   - Note: To prevent DOM vs WebWorker global clashing inside `search-worker.ts`, we should exclude the WebWorker library from the global configuration and load worker type definitions locally within `search-worker.ts` using `/// <reference lib="webworker" />` and casting `self`.
3. **Module System**:
   - Node scripts will compile to CommonJS (or NodeNext/Node16) to align with standard Node and Jest environments.
   - For browser scripts (app and worker), they will be global files without module imports/exports for now, compiling to browser-native code.
4. **Source Reorganization**: Move all source code files (`app.js`, `search-worker.js`, `build_database.js`, etc.) into a `src/` directory, and compile them to a `dist/` directory.
5. **Testing Strategy**: Adopt `ts-jest` to run tests directly on source files, avoiding the compile-before-test step and enabling clean modular imports later.
6. **Path Resolution**: 
   - Update `index.html` script source to `dist/app.js`.
   - Update `app.ts` worker initialization to use `dist/search-worker.js`.

## Resolved Conflicts / Nuances
- **Module Resolution Target**: Explorer 1 recommended `module: "CommonJS"` while Explorer 2/3 recommended `module: "Node16"` or `"NodeNext"`. Since NodeNext is standard and supports modern CJS/ESM interop, we will go with `module: "NodeNext"` and `moduleResolution: "NodeNext"`. This matches modern TypeScript guidelines.
- **Directory Layout**: Moving files to `src/` is a solid practice. To keep the workspace clean, we will move files to `src/`. The test files inside `tests/` can load `LocalSearchWorker` statically by refactoring it out of `app.ts` into a module, avoiding the brittle `eval` script loading.

## Gaps
- None identified. The codebase path structure has been fully audited.
