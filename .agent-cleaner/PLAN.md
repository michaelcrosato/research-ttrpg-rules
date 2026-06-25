# Agent-Cleaner Plan

## Snapshot
- Branch: `main` at `52bb46a`
- Working branch: `chore/agent-cleaner`
- Strategy: **QUICK** (single-pass inline)

## Tier 1: Core Config & Hygiene
- [ ] Create `.gitignore` (dist/, coverage/, node_modules/, *.log, tsc_output.txt, state.json)
- [ ] Move `jest` + `jest-environment-jsdom` from `dependencies` to `devDependencies`
- [ ] Remove committed `dist/`, `coverage/`, `tsc_output.txt`, `state.json` from git tracking
- [ ] Add `start` / `dev` script to package.json for local serving
- [ ] Verify lockfile matches manifest after dep move

## Tier 2: Format & Lint Tooling
- [ ] Install Prettier as dev-dep (no existing formatter — use default for JS/TS)
- [ ] Run Prettier on src/*.ts, tests/*.js, *.json (not registry.json — too big)
- [ ] Run `tsc --noEmit` as type gate
- [ ] Verify all existing tests pass

## Tier 3: Docs ↔ Code Reconciliation
- [ ] README: references `app.js` but source is now `src/app.ts` → `dist/app.js`; missing npm build step, missing sandbox tab mention, missing test instructions
- [ ] README: "Method 1: Double-Click" doesn't work (fetch needs HTTP server) — fix or flag
- [ ] README: Add npm install + npm run build + npm test quickstart

## Tier 4: Dep Audit & Security
- [ ] Run `npm audit` and surface findings
- [ ] Flag unused deps if any

## Tier 5: Dead Code & Artifact Cleanup
- [ ] Remove `tsc_output.txt` (build log)
- [ ] Evaluate `scratch/` — 21 temp scripts, flag as NEEDS DECISION
- [ ] Evaluate `.agents/` — 100+ subagent artifact dirs, flag as NEEDS DECISION
- [ ] `src/conflict-checker.ts`, `src/rules-synthesizer.ts`, `src/gm-engine.ts` — standalone modules not imported anywhere (code is inlined in app.ts) — flag as dead or document as reference

## Gates
- `npm run build` (tsc clean compile)
- `npm test` (151 tests, 8 suites)
- `tsc --noEmit` (strict type checking)
