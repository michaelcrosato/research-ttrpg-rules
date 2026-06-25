## 2026-06-25T03:08:26Z
Correct the configuration of Milestone 1 based on reviewer feedback.
Specifically:
1. Modify tsconfig.json: Change "module" to "ESNext" and "moduleResolution" to "node". This will prevent tsc from wrapping browser-facing files (src/app.js and src/search-worker.js) in CommonJS "exports" syntax, resolving browser runtime ReferenceErrors.
2. Clean up duplicate root files: Delete the duplicate app.js and search-worker.js from the workspace root (C:\dev\research-ttrpg-rules). Ensure they only exist in src/ and dist/.
3. Safe test execution: Update package.json scripts to ensure we compile before testing:
   - Add a "pretest" script: "pretest": "npm run build"
4. Run `npm run build` and run the VM simulation check to verify browser executability (it must not throw ReferenceError about exports):
   `node -e "const fs = require('fs'); const code = fs.readFileSync('dist/app.js', 'utf8'); const vm = require('vm'); vm.runInNewContext(code);"`
5. Verify that tests/worker_stress.js runs successfully:
   `node tests/worker_stress.js`
   and does not fail with ReferenceError about handleSearch.
6. Run npm test to make sure all 116 Jest tests pass.
7. Write a handoff report at C:\dev\research-ttrpg-rules\.agents\worker_m1_refix\handoff.md documenting your changes, verification checks, and test outputs.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Send a completion message back to parent orchestrator when complete.
