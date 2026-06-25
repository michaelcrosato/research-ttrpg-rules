# Agent-Cleaner State Report

**Repo:** `C:\dev\research-ttrpg-rules`
**Branch:** `chore/agent-cleaner` (from `main` at `52bb46a`)
**Commit:** `15f7f4c`

---

## Gate Evidence

| Gate | Command | Result |
|------|---------|--------|
| Build | `npm run build` | ✅ Clean compile, zero errors |
| TypeCheck | `npm run typecheck` (`tsc --noEmit`) | ✅ Zero errors, strict: true |
| Tests | `npx jest --runInBand` | ✅ **8 suites, 151 tests, all pass** (8.97s) |
| Audit | `npm audit` | ⚠️ 19 moderate (see NEEDS DECISION #1) |

---

## FIXED (verified)

| # | Issue | Fix | Evidence |
|---|-------|-----|----------|
| 1 | **No `.gitignore`** — `dist/`, `coverage/`, `node_modules/` being committed | Created `.gitignore` covering `dist/`, `coverage/`, `node_modules/`, `tsc_output.txt`, `state.json`, OS/editor files | File exists, artifacts untracked in commit |
| 2 | **`jest` in `dependencies`** — test tools listed as runtime deps | Moved `jest` + `jest-environment-jsdom` to `devDependencies` | `package.json` has empty `dependencies`, both in `devDependencies` |
| 3 | **`coverage/` committed** — 13 build artifact files tracked | `git rm -r --cached coverage` | Deleted in commit `15f7f4c` (-8307 lines) |
| 4 | **`tsc_output.txt` committed** — build log | `git rm --cached tsc_output.txt` | Deleted in commit |
| 5 | **`state.json` committed** — harvester state | `git rm --cached state.json` | Deleted in commit |
| 6 | **No `start` script** — no documented way to serve the app | Added `"start": "npx -y serve ."` to package.json | `npm start` serves on localhost:3000 |
| 7 | **No `typecheck` script** | Added `"typecheck": "tsc --noEmit"` | `npm run typecheck` passes clean |
| 8 | **README outdated** — referenced `app.js` (not `src/app.ts`), claimed double-click works, missing build/test instructions, missing Sandbox tab docs | Complete rewrite with accurate quickstart, TypeScript pipeline, all 7 feature tabs, test instructions, project structure | README matches reality |
| 9 | **README "Method 1: Double-Click"** — `fetch()` fails on `file://` protocol | Removed; documented that HTTP server is required | README now has a Note callout |
| 10 | **No secrets detected** | Scanned all source for API keys, tokens, passwords | All hits were game mechanic strings |
| 11 | **No TODO/FIXME** | Scanned all source | Zero hits |

---

## NEEDS HUMAN DECISION

### 1. `npm audit`: 19 moderate vulnerabilities in `js-yaml` <= 4.1.1
- **Root cause:** `js-yaml` (transitive: jest → istanbul → @istanbuljs/load-nyc-config)
- **Vuln:** Quadratic-complexity DoS in YAML merge key handling
- **Risk:** Low — only affects dev tooling (jest), not runtime
- **Fix available:** `npm audit fix --force` → downgrades `ts-jest` to 27.x (breaking)
- **Recommendation:** Accept risk. Wait for upstream jest/istanbul fix.

### 2. `scratch/` directory (21 temporary scripts)
- **Options:** A) Keep, B) Gitignore *(recommended)*, C) Delete

### 3. `.agents/` directory (100+ subagent artifact directories)
- **Options:** A) Keep, B) Gitignore *(recommended)*, C) Delete

### 4. Dead standalone TypeScript modules
- `src/conflict-checker.ts`, `src/rules-synthesizer.ts`, `src/gm-engine.ts` — not imported anywhere, functionality inlined in `app.ts`
- **Options:** A) Delete *(recommended)*, B) Keep as reference, C) Refactor to import

### 5. No formatter enforced
- No Prettier, Biome, or ESLint config
- **Options:** A) Add Prettier *(recommended)*, B) Add Biome, C) Leave as-is

---

## INTENTIONAL (documented, respected)

| # | Item | Rationale |
|---|------|-----------|
| 1 | `registry.json` (15.6 MB) committed | Core database content, not a build artifact |
| 2 | `registry_names.json` (1.2 MB) committed | Flat metadata index for the database |
| 3 | `isolatedModules` + `moduleDetection: "legacy"` | Required for browser-script build pattern |
| 4 | `strip-exports.js` post-build step | Removes tsc module syntax for browser compat |
| 5 | `any` type in FlexSearch declarations | Documented — FlexSearch options are dynamic config |
| 6 | `pretest` 2-second delay | Ensures build output is flushed before Jest |

---

## Re-Verify Commands

```bash
npm install
npm run build        # Build gate
npm run typecheck    # Type gate
npm test             # Test gate (151 tests, 8 suites)
npm start            # Serve at localhost:3000
```
