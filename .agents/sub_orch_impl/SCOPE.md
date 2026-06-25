# Scope: OmniRuleset Engine Implementation

## Architecture
The OmniRuleset Engine extends the existing Systems Indexer with rules conflict analysis, synthesis, playtest sandboxing, and GM automation. It operates via:
1. **Background Search Worker (`src/search-worker.ts` and fallback `LocalSearchWorker` in `src/app.ts`)**: Executes CPU-bound tasks such as conflict analysis and ruleset synthesis.
2. **Main Application Thread (`src/app.ts`)**: Handles user interactions, updates the UI, maintains the playtest sandbox session state, and coordinates with the worker thread.
3. **UI Layer (`index.html` / `styles.css`)**: Implements the "OmniRuleset Sandbox" tab, rules composer sidebar, synthesis board, and GM log console in a dark glassmorphic styling.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Interface Contracts & Types | Define type interfaces in `src/types.ts` for conflicts, rulesets, dice rolls, characters, and GM actions. | None | PLANNED |
| 2 | Conflict Analyzer (R3) | Implement conflict checking logic in search worker and LocalSearchWorker, returning lists of conflicts. | M1 | PLANNED |
| 3 | Rules Synthesizer (R1) | Implement ruleset synthesis logic in worker/app, allowing merging and overrides. | M2 | PLANNED |
| 4 | Playtest Sandbox & GM (R2) | Build virtual dice roller, character database, and turn-based GM playtest logic in `src/app.ts`. | M3 | PLANNED |
| 5 | UI Integration (R4) | Add "OmniRuleset Sandbox" navigation tab and layout inside `index.html` and `src/app.ts`. | M4 | PLANNED |
| 6 | E2E Verification & Hardening | Wait for `TEST_READY.md`. Pass E2E tests (Tiers 1-4) sequentially. Run Challenger-led Tier 5 hardening. | M5 | PLANNED |

## Interface Contracts
### App ↔ Search Worker Message Protocol (OmniRuleset extensions)
- Messages to worker (`SearchWorkerRequest`):
  - `'analyzeConflicts'`: Selected game IDs and vector IDs to check for rules overlaps.
  - `'synthesizeRuleset'`: Base game IDs, vector IDs, custom overrides, and resolution type to generate a unified ruleset.
- Messages from worker (`SearchWorkerResponse`):
  - `'conflictAnalysisResults'`: Boolean `hasErrors` and list of `ConflictDescriptor` items.
  - `'synthesizeRulesetResults'`: Compiled `SynthesizedRuleset` object.

### Playtest Sandbox API
- `DiceRoller.roll(notation: string, advantage?: 'none'|'advantage'|'disadvantage'): DiceRollResult`
- `GMAutomation.resolveAction(state: PlaytestSessionState, action: GMActionRequest): GMActionResponse`
